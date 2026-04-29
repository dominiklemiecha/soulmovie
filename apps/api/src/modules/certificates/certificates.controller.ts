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
  CertificateCreateDto,
  CertificateUpdateDto,
  ErrorCodes,
  PresignUploadDto,
  Role,
  certificateCreateSchema,
  certificateUpdateSchema,
  presignUploadSchema,
} from '@soulmovie/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { CertificatesService } from './certificates.service';
import { MinioService } from '../../infra/minio/minio.service';

@Controller('suppliers/me/certificates')
export class CertificatesController {
  constructor(
    private readonly svc: CertificatesService,
    private readonly minio: MinioService,
  ) {}

  private supplierIdOf(user: AuthUser): string {
    if (user.role !== Role.SUPPLIER || !user.supplierId) {
      throw new ForbiddenException({
        error: { code: ErrorCodes.FORBIDDEN, message: 'Solo per fornitori' },
      });
    }
    return user.supplierId;
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.svc.listForSupplier(this.supplierIdOf(user));
  }

  @Get(':id/download-url')
  async downloadUrl(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const url = await this.svc.getDownloadUrl(this.supplierIdOf(user), id);
    return { url };
  }

  @Post('upload-url')
  async uploadUrl(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(presignUploadSchema)) dto: PresignUploadDto,
  ) {
    const sid = this.supplierIdOf(user);
    const key = this.minio.buildObjectKey(sid, dto.filename);
    const url = await this.minio.presignedPut(key);
    return { url, objectKey: key, expiresInSec: 5 * 60 };
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(certificateCreateSchema as any)) dto: CertificateCreateDto,
  ) {
    return this.svc.create(this.supplierIdOf(user), dto, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(certificateUpdateSchema as any)) dto: CertificateUpdateDto,
  ) {
    return this.svc.update(this.supplierIdOf(user), id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.svc.remove(this.supplierIdOf(user), id, user.id);
  }
}
