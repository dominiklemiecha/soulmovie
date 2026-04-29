import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import {
  CategoryCreateDto,
  CategoryUpdateDto,
  ErrorCodes,
  SupplierCategoriesSetDto,
} from '@soulmovie/shared';
import { Category } from './entities/category.entity';
import { SupplierCategory } from './entities/supplier-category.entity';
import { OutboxEvent } from '../outbox/entities/outbox-event.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

export interface CategoryNode {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  active: boolean;
  orderIndex: number;
  children: CategoryNode[];
}

@Injectable()
export class CategoriesService {
  constructor(private readonly ds: DataSource) {}

  async list(): Promise<Category[]> {
    return this.ds.getRepository(Category).find({ order: { orderIndex: 'ASC', name: 'ASC' } });
  }

  async tree(): Promise<CategoryNode[]> {
    const all = await this.list();
    return buildTree(all);
  }

  @Transactional()
  async create(dto: CategoryCreateDto, userId?: string): Promise<Category> {
    const repo = this.ds.getRepository(Category);
    const exists = await repo.findOne({ where: { code: dto.code } });
    if (exists) {
      throw new ConflictException({
        error: { code: ErrorCodes.CATEGORY_CODE_DUPLICATE, message: 'Codice già usato' },
      });
    }
    if (dto.parentId) {
      const parent = await repo.findOne({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException({
          error: { code: ErrorCodes.NOT_FOUND, message: 'Categoria padre non trovata' },
        });
      }
    }
    const saved = await repo.save(repo.create(dto));
    await this.audit(userId, 'category.create', saved.id, null, dto);
    return saved;
  }

  @Transactional()
  async update(id: string, dto: CategoryUpdateDto, userId?: string): Promise<Category> {
    const repo = this.ds.getRepository(Category);
    const cur = await repo.findOne({ where: { id } });
    if (!cur) {
      throw new NotFoundException({
        error: { code: ErrorCodes.NOT_FOUND, message: 'Categoria non trovata' },
      });
    }
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new UnprocessableEntityException({
          error: { code: ErrorCodes.CATEGORY_CYCLE, message: 'Una categoria non può essere padre di se stessa' },
        });
      }
      if (dto.parentId && (await this.wouldCreateCycle(id, dto.parentId))) {
        throw new UnprocessableEntityException({
          error: { code: ErrorCodes.CATEGORY_CYCLE, message: 'Spostamento crea un ciclo' },
        });
      }
    }
    const before = { name: cur.name, parentId: cur.parentId, active: cur.active, orderIndex: cur.orderIndex };
    Object.assign(cur, dto, { updatedAt: new Date() });
    const saved = await repo.save(cur);
    await this.audit(userId, 'category.update', id, before, dto);
    return saved;
  }

  @Transactional()
  async remove(id: string, userId?: string): Promise<void> {
    const repo = this.ds.getRepository(Category);
    const cur = await repo.findOne({ where: { id } });
    if (!cur) {
      throw new NotFoundException({
        error: { code: ErrorCodes.NOT_FOUND, message: 'Categoria non trovata' },
      });
    }
    const childCount = await repo.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new ConflictException({
        error: {
          code: ErrorCodes.CATEGORY_HAS_CHILDREN,
          message: `Categoria con ${childCount} figli. Spostali o eliminali prima.`,
        },
      });
    }
    const useCount = await this.ds
      .getRepository(SupplierCategory)
      .count({ where: { categoryId: id } });
    if (useCount > 0) {
      throw new ConflictException({
        error: {
          code: ErrorCodes.CATEGORY_IN_USE,
          message: `Categoria assegnata a ${useCount} fornitori.`,
        },
      });
    }
    await repo.delete({ id });
    await this.audit(userId, 'category.delete', id, cur, null);
  }

  // --- supplier side ---

  async getOwn(supplierId: string): Promise<string[]> {
    const rows = await this.ds
      .getRepository(SupplierCategory)
      .find({ where: { supplierId } });
    return rows.map((r) => r.categoryId);
  }

  @Transactional()
  async setOwn(
    supplierId: string,
    dto: SupplierCategoriesSetDto,
    userId?: string,
  ): Promise<string[]> {
    const repo = this.ds.getRepository(SupplierCategory);
    if (dto.categoryIds.length > 0) {
      const found = await this.ds
        .getRepository(Category)
        .find({ where: { id: In(dto.categoryIds), active: true } });
      if (found.length !== new Set(dto.categoryIds).size) {
        throw new UnprocessableEntityException({
          error: { code: ErrorCodes.NOT_FOUND, message: 'Categorie non valide o non attive' },
        });
      }
    }
    await repo.delete({ supplierId });
    if (dto.categoryIds.length > 0) {
      await repo.insert(
        dto.categoryIds.map((cid) => ({ supplierId, categoryId: cid, includeSubelements: true })),
      );
    }
    await this.ds.getRepository(OutboxEvent).save({
      aggregateType: 'supplier',
      aggregateId: supplierId,
      eventType: 'supplier.categories.changed',
      payload: { categoryIds: dto.categoryIds },
    } as Partial<OutboxEvent>);
    await this.audit(userId, 'supplier.categories.set', supplierId, null, dto, supplierId);
    return dto.categoryIds;
  }

  private async wouldCreateCycle(nodeId: string, newParentId: string): Promise<boolean> {
    const all = await this.list();
    const byId = new Map(all.map((c) => [c.id, c.parentId ?? null] as const));
    let cur: string | null = newParentId;
    let hops = 0;
    while (cur && hops < all.length + 1) {
      if (cur === nodeId) return true;
      cur = byId.get(cur) ?? null;
      hops++;
    }
    return false;
  }

  private async audit(
    userId: string | undefined,
    action: string,
    entityId: string,
    before: any,
    after: any,
    supplierId?: string,
  ) {
    await this.ds.getRepository(AuditLog).save({
      userId,
      supplierId: supplierId ?? null,
      action,
      entityType: 'category',
      entityId,
      before,
      after,
    } as Partial<AuditLog>);
  }
}

function buildTree(rows: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const r of rows) {
    byId.set(r.id, {
      id: r.id,
      code: r.code,
      name: r.name,
      parentId: r.parentId ?? null,
      active: r.active,
      orderIndex: r.orderIndex,
      children: [],
    });
  }
  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sorter = (a: CategoryNode, b: CategoryNode) =>
    a.orderIndex - b.orderIndex || a.name.localeCompare(b.name);
  const sortDeep = (nodes: CategoryNode[]) => {
    nodes.sort(sorter);
    for (const n of nodes) sortDeep(n.children);
  };
  sortDeep(roots);
  return roots;
}
