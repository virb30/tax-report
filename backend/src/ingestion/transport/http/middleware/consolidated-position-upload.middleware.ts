import type { HttpMiddlewareSpec } from '../../../../shared/infra/http/http.interface';

export const consolidatedPositionUploadMiddleware: HttpMiddlewareSpec = {
  type: 'spreadsheetUpload',
  fieldName: 'file',
};
