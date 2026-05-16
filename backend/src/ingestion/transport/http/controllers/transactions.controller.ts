import { getUploadedFile } from '../../../../http/upload/upload-middleware';
import { parseHttpInput } from '../../../../http/validation/http-validation';
import type { Http } from '../../../../shared/infra/http/http.interface';
import type { ImportTransactionsUseCase } from '../../../application/use-cases/import-transactions.use-case';
import type { PreviewImportUseCase } from '../../../application/use-cases/preview-import.use-case';
import { transactionUploadMiddleware } from '../middleware/transaction-upload.middleware';
import { confirmImportMultipartBodySchema } from '../validation/ingestion-http.schemas';

interface TransactionsControllerDependencies {
  previewImportUseCase: PreviewImportUseCase;
  importTransactionsUseCase: ImportTransactionsUseCase;
}

export class TransactionsController {
  constructor(
    private readonly http: Http,
    private readonly dependencies: TransactionsControllerDependencies,
  ) {
    this.http.on({
      method: 'post',
      path: '/api/transactions/import:preview',
      middlewares: [transactionUploadMiddleware],
      handler: async (request) => {
        const file = getUploadedFile(request.raw);
        const output = await this.dependencies.previewImportUseCase.execute({
          filePath: file.filePath,
        });

        return {
          statusCode: 200,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'post',
      path: '/api/transactions/import:confirm',
      middlewares: [transactionUploadMiddleware],
      handler: async (request) => {
        const file = getUploadedFile(request.raw);
        const body = parseHttpInput(confirmImportMultipartBodySchema, request.body);
        const output = await this.dependencies.importTransactionsUseCase.execute({
          filePath: file.filePath,
          assetTypeOverrides: body.assetTypeOverrides,
        });

        return {
          statusCode: 200,
          body: output,
        };
      },
    });
  }
}
