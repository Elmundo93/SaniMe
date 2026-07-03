import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { AnyPrincipalAuthGuard } from '../../auth/guards/any-principal-auth.guard';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { DocumentService } from '../document.service';

const uploadUrlSchema = z.object({ mimeType: z.string().min(1) });
const registerDocumentSchema = z.object({
  type: z.string().min(1),
  storageKey: z.string().min(1),
  hash: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});
const statusSchema = z.object({ status: z.string().min(1) });

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentService) {}

  @Post('upload-url')
  @UseGuards(AnyPrincipalAuthGuard)
  async createUploadUrl(@Body() body: unknown) {
    const parsed = uploadUrlSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    return this.documents.createUploadUrl(parsed.data.mimeType);
  }

  @Post()
  @UseGuards(AnyPrincipalAuthGuard)
  async register(@Body() body: unknown) {
    const parsed = registerDocumentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    return this.documents.registerDocument(DEFAULT_TENANT_CONTEXT, parsed.data);
  }

  @Get(':id')
  @UseGuards(AnyPrincipalAuthGuard)
  async getById(@Param('id') id: string) {
    return this.documents.getDocument(DEFAULT_TENANT_CONTEXT, id);
  }

  @Patch(':id/status')
  @UseGuards(AdminJwtAuthGuard)
  async setStatus(@Param('id') id: string, @Body() body: unknown) {
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    return this.documents.setStatus(DEFAULT_TENANT_CONTEXT, id, parsed.data.status);
  }
}
