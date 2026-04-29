import { Body, Controller, ForbiddenException, Get, Put } from '@nestjs/common';
import {
  ErrorCodes,
  Role,
  SupplierCategoriesSetDto,
  supplierCategoriesSetSchema,
} from '@soulmovie/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { CategoriesService } from './categories.service';

@Controller('suppliers/me/categories')
export class SupplierCategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  private supplierIdOf(user: AuthUser): string {
    if (user.role !== Role.SUPPLIER || !user.supplierId) {
      throw new ForbiddenException({
        error: { code: ErrorCodes.FORBIDDEN, message: 'Solo per fornitori' },
      });
    }
    return user.supplierId;
  }

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.svc.getOwn(this.supplierIdOf(user));
  }

  @Put()
  set(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(supplierCategoriesSetSchema)) dto: SupplierCategoriesSetDto,
  ) {
    return this.svc.setOwn(this.supplierIdOf(user), dto, user.id);
  }
}
