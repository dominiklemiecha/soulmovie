import {
  BadRequestException,
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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
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

  @Get(':id/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const sid = this.supplierIdOf(user);
    const cert = await this.svc.getOne(sid, id);
    const stream = await this.minio.getObjectStream(cert.documentObjectKey);
    res.setHeader('Content-Type', cert.documentMime);
    res.setHeader('Content-Disposition', `inline; filename="${cert.documentFilename}"`);
    stream.pipe(res);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async uploadCreate(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: any,
    @Body() body: Record<string, any>,
  ) {
    if (!file) throw new BadRequestException({ error: { code: 'VALIDATION_ERROR', message: 'File mancante' } });
    const sid = this.supplierIdOf(user);
    const key = this.minio.buildObjectKey(sid, file.originalname);
    await this.minio.putObject(key, file.buffer, file.mimetype || 'application/octet-stream');
    const dto: any = {
      typeId: body.typeId,
      nomeAlternativo: body.nomeAlternativo || null,
      numero: body.numero || null,
      dataEmissione: body.dataEmissione || null,
      dataScadenza: body.dataScadenza || null,
      emittente: body.emittente || null,
      ambito: body.ambito || null,
      descrizione: body.descrizione || null,
      notifyEmails: body.notifyEmails || '',
      documentObjectKey: key,
      documentFilename: file.originalname,
      documentMime: file.mimetype || 'application/octet-stream',
      documentSize: file.size,
    };
    const parsed = certificateCreateSchema.safeParse(dto);
    if (!parsed.success) {
      await this.minio.removeObject(key).catch(() => {});
      throw new BadRequestException({
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: parsed.error.issues },
      });
    }
    return this.svc.create(sid, parsed.data as any, user.id);
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
