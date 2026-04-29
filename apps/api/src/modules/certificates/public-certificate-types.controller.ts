import { Controller, Get } from '@nestjs/common';
import { CertificateTypesService } from './certificate-types.service';

@Controller('certificate-types')
export class PublicCertificateTypesController {
  constructor(private readonly svc: CertificateTypesService) {}

  @Get()
  list() {
    return this.svc.list(false);
  }
}
