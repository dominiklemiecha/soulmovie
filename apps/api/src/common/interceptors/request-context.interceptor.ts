import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { requestContextStorage, RequestContext } from '../context/request-context';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const ctx: RequestContext = {
      userId: user?.id,
      role: user?.role,
      supplierId: user?.supplierId,
      ip: req.ip,
      userAgent: req.get?.('user-agent') ?? undefined,
    };
    return new Observable((subscriber) => {
      requestContextStorage.run(ctx, () => {
        next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
