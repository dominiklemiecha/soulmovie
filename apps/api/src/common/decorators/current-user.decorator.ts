import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@soulmovie/shared';

export interface AuthUser {
  id: string;
  role: Role;
  supplierId?: string;
}

export const CurrentUser = createParamDecorator(
  (_d: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
