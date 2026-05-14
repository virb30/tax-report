export type HttpErrorDetails = Record<string, unknown> | readonly unknown[];

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: HttpErrorDetails,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class HttpValidationError extends HttpError {
  constructor(message: string, details?: HttpErrorDetails) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'HttpValidationError';
  }
}
