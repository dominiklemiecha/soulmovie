import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCodes, Role } from '@soulmovie/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;
    const user = ctx.switchToHttp().getRequest().user;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException({
        error: { code: ErrorCodes.FORBIDDEN, message: 'Accesso negato' },
      });
    }
    return true;
  }
}
