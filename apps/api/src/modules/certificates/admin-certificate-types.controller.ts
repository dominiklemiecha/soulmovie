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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CertificateTypeCreateDto,
  CertificateTypeUpdateDto,
  Role,
  certificateTypeCreateSchema,
  certificateTypeUpdateSchema,
} from '@soulmovie/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { CertificateTypesService } from './certificate-types.service';

@Controller('admin/certificate-types')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminCertificateTypesController {
  constructor(private readonly svc: CertificateTypesService) {}

  @Get()
  list(@Query('all') all?: string) {
    return this.svc.list(all === '1' || all === 'true');
  }

  @Post()
  create(@Body(new ZodValidationPipe(certificateTypeCreateSchema)) dto: CertificateTypeCreateDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(certificateTypeUpdateSchema)) dto: CertificateTypeUpdateDto,
  ) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.remove(id);
  }
}
