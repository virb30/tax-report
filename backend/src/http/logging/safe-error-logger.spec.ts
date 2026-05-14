import type { Request } from 'express';
import type { BackendLogger } from './safe-error-logger';
import { logRequestFailure, redactSensitiveMetadata } from './safe-error-logger';

describe('safe-error-logger', () => {
  it('redacts uploaded file content, CNPJ values, and tax row details from metadata', () => {
    const metadata = {
      cnpj: '33.000.167/0001-01',
      uploadedFile: {
        originalName: 'tax.csv',
        content: 'line,with,financial,data',
      },
      taxRows: [
        {
          ticker: 'PETR4',
          amount: 100,
        },
      ],
      nested: {
        message: 'Issuer 33000167000101 failed',
      },
    };

    expect(redactSensitiveMetadata(metadata)).toEqual({
      cnpj: '[REDACTED_CNPJ]',
      uploadedFile: '[REDACTED]',
      taxRows: '[REDACTED]',
      nested: {
        message: 'Issuer [REDACTED_CNPJ] failed',
      },
    });
  });

  it('logs request failures with route, method, status, error code, and correlation ID', () => {
    const logger: BackendLogger = {
      error: jest.fn(),
    };
    const request = {
      method: 'POST',
      path: '/api/import/transactions/preview',
      originalUrl: '/api/import/transactions/preview',
    } as Request;

    logRequestFailure(logger, {
      request,
      status: 400,
      errorCode: 'VALIDATION_ERROR',
      correlationId: 'request-1',
      metadata: {
        file: Buffer.from('uploaded tax data'),
      },
    });

    expect(logger.error).toHaveBeenCalledWith(
      {
        correlationId: 'request-1',
        errorCode: 'VALIDATION_ERROR',
        method: 'POST',
        metadata: {
          file: '[REDACTED]',
        },
        route: '/api/import/transactions/preview',
        status: 400,
      },
      'Backend request failed',
    );
  });
});
