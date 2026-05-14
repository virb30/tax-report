import type { ApiResult } from '../../types/api.types';

export function unwrapApiResult<T>(result: ApiResult<T>): T {
  if (result.ok) {
    return result.data;
  }

  throw new Error(result.error.message);
}
