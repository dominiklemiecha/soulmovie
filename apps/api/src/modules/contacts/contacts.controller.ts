import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ContactCreateDto,
  ContactUpdateDto,
  ErrorCodes,
  Role,
  contactCreateSchema,
  contactUpdateSchema,
} from '@soulmovie/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { ContactsService } from './contacts.service';

@Controller('suppliers/me/contacts')
export class ContactsController {
  constructor(private readonly svc: ContactsService) {}

  private requireSupplier(user: AuthUser): string {
    if (user.role !== Role.SUPPLIER || !user.supplierId) {
      throw new ForbiddenException({
        error: { code: ErrorCodes.FORBIDDEN, message: 'Solo per fornitori' },
      });
    }
    return user.supplierId;
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.svc.list(this.requireSupplier(user));
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(contactCreateSchema)) dto: ContactCreateDto,
  ) {
    return this.svc.create(this.requireSupplier(user), dto, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(contactUpdateSchema)) dto: ContactUpdateDto,
  ) {
    return this.svc.update(this.requireSupplier(user), id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.svc.remove(this.requireSupplier(user), id, user.id);
  }
}
