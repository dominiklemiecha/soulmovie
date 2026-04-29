import { Body, Controller, ForbiddenException, Get, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ErrorCodes, Role, SupplierUpdateDto, supplierUpdateSchema } from '@soulmovie/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: AuthUser) {
    if (user.role !== Role.SUPPLIER || !user.supplierId) {
      throw new ForbiddenException({
        error: { code: ErrorCodes.FORBIDDEN, message: 'Solo per fornitori' },
      });
    }
    return this.suppliers.getOwn(user.supplierId);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(supplierUpdateSchema)) dto: SupplierUpdateDto,
    @Req() req: Request,
  ) {
    if (user.role !== Role.SUPPLIER || !user.supplierId) {
      throw new ForbiddenException({
        error: { code: ErrorCodes.FORBIDDEN, message: 'Solo per fornitori' },
      });
    }
    return this.suppliers.updateOwn(user.supplierId, dto, user.id, req.ip, req.get('user-agent'));
  }
}
