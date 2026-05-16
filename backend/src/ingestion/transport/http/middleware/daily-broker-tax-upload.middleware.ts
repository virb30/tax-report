import type { HttpMiddlewareSpec } from '../../../../shared/infra/http/http.interface';

export const dailyBrokerTaxUploadMiddleware: HttpMiddlewareSpec = {
  type: 'spreadsheetUpload',
  fieldName: 'file',
};
