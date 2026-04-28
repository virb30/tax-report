export type AppErrorKind = 'validation' | 'not_found' | 'conflict' | 'business' | 'unexpected';

export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly kind: AppErrorKind,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
