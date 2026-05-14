import { AppError } from '../../shared/app-error';
import { HttpValidationError } from './http-error';
import { mapHttpError } from './http-error-mapper';

describe('mapHttpError', () => {
  it('converts validation errors to a JSON body with code and message', () => {
    const mappedError = mapHttpError(new HttpValidationError('Invalid request'));

    expect(mappedError.status).toBe(400);
    expect(mappedError.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
      },
    });
  });

  it('includes details only when safe structured details exist', () => {
    const mappedError = mapHttpError(
      new HttpValidationError('Invalid request', {
        fields: ['year'],
        limit: 2,
      }),
    );

    expect(mappedError.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: {
          fields: ['year'],
          limit: 2,
        },
      },
    });
  });

  it('omits unsafe error details', () => {
    const mappedError = mapHttpError(
      new AppError('BROKEN_INPUT', 'Invalid input', 'validation', {
        cause: new Error('raw stack should not leak'),
      }),
    );

    expect(mappedError.body).toEqual({
      error: {
        code: 'BROKEN_INPUT',
        message: 'Invalid input',
      },
    });
  });
});
