import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class OutboxProcessor implements OnModuleInit {
  private readonly log = new Logger(OutboxProcessor.name);
  constructor(private readonly ds: DataSource) {}

  onModuleInit() {
    this.loop().catch((e) => this.log.error(e));
  }

  private async loop() {
    while (true) {
      try {
        await this.ds.transaction(async (em) => {
          const rows = await em.query(
            `SELECT id, aggregate_type, aggregate_id, event_type, payload
             FROM outbox_events WHERE processed_at IS NULL
             ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED`,
          );
          if (rows.length === 0) return;
          for (const r of rows) {
            this.log.log(`[outbox] ${r.event_type} ${r.aggregate_type}=${r.aggregate_id}`);
            await em.query(`UPDATE outbox_events SET processed_at = now() WHERE id = $1`, [r.id]);
          }
        });
      } catch (e) {
        this.log.error('outbox loop error', e as Error);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
