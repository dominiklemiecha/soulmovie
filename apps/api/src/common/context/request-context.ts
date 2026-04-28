import { AsyncLocalStorage } from 'node:async_hooks';
import { Role } from '@soulmovie/shared';

export interface RequestContext {
  userId?: string;
  role?: Role;
  supplierId?: string;
  ip?: string;
  userAgent?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();
export const getRequestContext = (): RequestContext | undefined => requestContextStorage.getStore();
