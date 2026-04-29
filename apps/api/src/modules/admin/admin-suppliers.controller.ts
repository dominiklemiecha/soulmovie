import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApprovalStatus,
  Role,
  SupplierRejectDto,
  supplierRejectSchema,
} from '@soulmovie/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { AdminSuppliersService } from './admin-suppliers.service';

@Controller('admin/suppliers')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminSuppliersController {
  constructor(private readonly svc: AdminSuppliersService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
  ) {
    const allowed: (ApprovalStatus | 'all')[] = [
      ApprovalStatus.PENDING,
      ApprovalStatus.APPROVED,
      ApprovalStatus.REJECTED,
      'all',
    ];
    const s = (allowed.includes(status as any) ? status : ApprovalStatus.PENDING) as
      | ApprovalStatus
      | 'all';
    const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize ?? '50', 10) || 50));
    return this.svc.listByStatus(s, p, ps, q);
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getById(id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.svc.approve(id, user.id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(supplierRejectSchema)) dto: SupplierRejectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.reject(id, user.id, dto.reason);
  }

  @Post(':id/disable')
  @HttpCode(200)
  disable(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.disable(id, user.id, body?.reason);
  }

  @Post(':id/reactivate')
  @HttpCode(200)
  reactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.svc.reactivate(id, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.svc.remove(id, user.id);
  }
}
