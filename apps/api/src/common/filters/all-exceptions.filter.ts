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
    const msg = String((exception as any)?.message ?? '');
    const driver = (exception as any)?.driverError;
    if (driver?.code === '23505' || msg.includes('duplicate key value')) {
      const detail = String(driver?.detail ?? msg);
      let code: string = ErrorCodes.VALIDATION_ERROR;
      let userMsg = 'Valore già usato da un altro record';
      if (msg.includes('codice_fiscale') || detail.includes('codice_fiscale')) {
        code = ErrorCodes.CF_ALREADY_REGISTERED;
        userMsg = 'Codice fiscale già usato da un altro fornitore';
      } else if (msg.includes('partita_iva') || detail.includes('partita_iva')) {
        code = ErrorCodes.PIVA_ALREADY_REGISTERED;
        userMsg = 'Partita IVA già usata da un altro fornitore';
      } else if (msg.includes('users_email') || detail.includes('email')) {
        code = ErrorCodes.EMAIL_ALREADY_REGISTERED;
        userMsg = 'Email già registrata';
      }
      return res.status(HttpStatus.CONFLICT).json({
        error: { code, message: userMsg, traceId },
      });
    }
    this.log.error('Unhandled', exception as any);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Errore interno', traceId },
    });
  }
}
