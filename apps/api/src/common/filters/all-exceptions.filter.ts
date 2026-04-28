import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ErrorCodes } from '@soulmovie/shared';
import { v4 as uuid } from 'uuid';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly log = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const traceId = ctx.getRequest().headers['x-request-id'] ?? uuid();

    if (exception instanceof HttpException) {
      const r: any = exception.getResponse();
      const code = r?.error?.code ?? 'HTTP_ERROR';
      const message = r?.error?.message ?? exception.message;
      return res.status(exception.getStatus()).json({
        error: { code, message, details: r?.error?.details, traceId },
      });
    }
    this.log.error('Unhandled', exception as any);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Errore interno', traceId },
    });
  }
}
