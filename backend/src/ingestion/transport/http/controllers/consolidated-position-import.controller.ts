import { getUploadedFile } from '../../../../http/upload/upload-middleware';
import { parseHttpInput } from '../../../../http/validation/http-validation';
import type { Http } from '../../../../shared/infra/http/http.interface';
import type { ImportConsolidatedPositionUseCase } from '../../../application/use-cases/import-consolidated-position.use-case';
import { consolidatedPositionUploadMiddleware } from '../middleware/consolidated-position-upload.middleware';
import { consolidatedImportMultipartBodySchema } from '../validation/ingestion-http.schemas';

interface ConsolidatedPositionImportControllerDependencies {
  importConsolidatedPositionUseCase: ImportConsolidatedPositionUseCase;
}

export class ConsolidatedPositionImportController {
  constructor(
    private readonly http: Http,
    private readonly dependencies: ConsolidatedPositionImportControllerDependencies,
  ) {
    this.http.on({
      method: 'post',
      path: '/api/positions/consolidated-preview',
      middlewares: [consolidatedPositionUploadMiddleware],
      handler: async (request) => {
        const file = getUploadedFile(request.raw);
        const output = await this.dependencies.importConsolidatedPositionUseCase.preview({
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
      path: '/api/positions/consolidated-import',
      middlewares: [consolidatedPositionUploadMiddleware],
      handler: async (request) => {
        const file = getUploadedFile(request.raw);
        const body = parseHttpInput(consolidatedImportMultipartBodySchema, request.body);
        const output = await this.dependencies.importConsolidatedPositionUseCase.execute({
          filePath: file.filePath,
          year: body.year,
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
