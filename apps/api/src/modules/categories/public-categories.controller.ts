import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

// Albero leggibile da fornitore + admin (per il picker).
@Controller('categories')
export class PublicCategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Get('tree')
  tree() {
    return this.svc.tree();
  }
}
