import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import * as argon2 from 'argon2';
import { Role, UserStatus } from '@soulmovie/shared';
import dataSource from '../src/infra/typeorm/data-source';
import { User } from '../src/modules/users/entities/user.entity';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function run() {
  await dataSource.initialize();
  const repo = dataSource.getRepository(User);
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@soulmovie.local';
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'AdminPass123!';
  const exists = await repo.findOne({ where: { email } });
  if (exists) {
    console.log(`bootstrap admin already exists (${email}), skip`);
  } else {
    await repo.insert({
      email,
      passwordHash: await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      }),
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    });
    console.log(`bootstrap admin created: ${email}`);
  }
  await dataSource.destroy();
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
