import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';

interface ErrorEnvelope {
  statusCode: number;
  message: string;
  path: string;
  timestamp: string;
}

// Nest's built-in HttpException subclasses (UnauthorizedException, etc.) call
// getResponse() to an object like { message, error, statusCode }, not a bare
// string — extract the human-readable message instead of stringifying the
// whole envelope into itself.
function extractMessage(response: unknown): string {
  if (typeof response === 'string') {
    return response;
  }
  if (response && typeof response === 'object' && 'message' in response) {
    const message = (response as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return JSON.stringify(response);
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const response_ = isHttpException ? exception.getResponse() : 'Interner Serverfehler';

    const envelope: ErrorEnvelope = {
      statusCode: status,
      message: extractMessage(response_),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      Sentry.captureException(exception);
      this.logger.error(envelope.message, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(status).json(envelope);
  }
}
