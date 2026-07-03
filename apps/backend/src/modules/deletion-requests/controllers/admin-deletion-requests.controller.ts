import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { CurrentAdmin } from '../../auth/decorators/current-admin.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { DeletionRequestsService } from '../deletion-requests.service';

const reviewSchema = z.object({ decision: z.enum(['approved', 'rejected']), note: z.string().min(1).nullable().optional() });

@Controller('admin/deletion-requests')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminDeletionRequestsController {
  constructor(private readonly deletionRequests: DeletionRequestsService) {}

  @Get()
  @Roles('compliance:read')
  list() {
    return this.deletionRequests.listAll(DEFAULT_TENANT_CONTEXT);
  }

  @Get(':id')
  @Roles('compliance:read')
  get(@Param('id') id: string) {
    return this.deletionRequests.getById(DEFAULT_TENANT_CONTEXT, id);
  }

  @Post(':id/review')
  @Roles('compliance:manage')
  async review(@Param('id') id: string, @Body() body: unknown, @CurrentAdmin() admin: { id: string }) {
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    return this.deletionRequests.reviewDeletion(DEFAULT_TENANT_CONTEXT, id, parsed.data.decision, parsed.data.note ?? null, admin.id);
  }

  @Post(':id/execute')
  @Roles('compliance:manage')
  execute(@Param('id') id: string, @CurrentAdmin() admin: { id: string }) {
    return this.deletionRequests.startExecution(DEFAULT_TENANT_CONTEXT, id, admin.id);
  }
}
