import type { HttpMiddlewareSpec } from '../../../../shared/infra/http/http.interface';

export const transactionUploadMiddleware: HttpMiddlewareSpec = {
  type: 'spreadsheetUpload',
  fieldName: 'file',
};
