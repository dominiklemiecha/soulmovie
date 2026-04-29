import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CategoryCreateDto,
  CategoryUpdateDto,
  Role,
  categoryCreateSchema,
  categoryUpdateSchema,
} from '@soulmovie/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { CategoriesService } from './categories.service';

@Controller('admin/categories')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminCategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Get('tree')
  tree() {
    return this.svc.tree();
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(categoryCreateSchema)) dto: CategoryCreateDto,
  ) {
    return this.svc.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(categoryUpdateSchema)) dto: CategoryUpdateDto,
  ) {
    return this.svc.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.svc.remove(id, user.id);
  }
}
