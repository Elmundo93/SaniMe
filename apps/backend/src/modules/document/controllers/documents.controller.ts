import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { AccessLogInterceptor } from '../../../common/audit/access-log.interceptor';
import { AuditRead } from '../../../common/audit/audit-read.decorator';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { AnyPrincipalAuthGuard } from '../../auth/guards/any-principal-auth.guard';
import { CurrentAdmin } from '../../auth/decorators/current-admin.decorator';
import { CurrentPrincipal, type CurrentPrincipalInfo } from '../../auth/decorators/current-principal.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
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
  async register(@Body() body: unknown, @CurrentPrincipal() principal: CurrentPrincipalInfo | null) {
    const parsed = registerDocumentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    return this.documents.registerDocument(DEFAULT_TENANT_CONTEXT, parsed.data, principal);
  }

  @Get(':id')
  @UseGuards(AnyPrincipalAuthGuard)
  @UseInterceptors(AccessLogInterceptor)
  @AuditRead('document')
  async getById(@Param('id') id: string) {
    return this.documents.getDocument(DEFAULT_TENANT_CONTEXT, id);
  }

  @Patch(':id/status')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('health-data:write')
  async setStatus(@Param('id') id: string, @Body() body: unknown, @CurrentAdmin() admin: { id: string }) {
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    return this.documents.setStatus(DEFAULT_TENANT_CONTEXT, id, parsed.data.status, admin.id);
  }
}
