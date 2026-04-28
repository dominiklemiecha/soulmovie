import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { runInTransaction, IsolationLevel } from 'typeorm-transactional';
import { Role } from '@soulmovie/shared';
import { getRequestContext } from '../../common/context/request-context';

@Injectable()
export class TransactionalDb {
  constructor(private readonly ds: DataSource) {}

  async run<T>(fn: (em: EntityManager) => Promise<T>): Promise<T> {
    return runInTransaction(async () => {
      const em = this.ds.manager;
      const ctx = getRequestContext();
      if (ctx?.role === Role.ADMIN) {
        await em.query(`SET LOCAL ROLE admin_role`);
      } else if (ctx?.role === Role.SUPPLIER && ctx.supplierId) {
        await em.query(`SET LOCAL ROLE supplier_role`);
        await em.query(`SELECT set_config('app.current_supplier_id', $1, true)`, [ctx.supplierId]);
      }
      return fn(em);
    }, { isolationLevel: 'READ COMMITTED' as IsolationLevel });
  }
}
