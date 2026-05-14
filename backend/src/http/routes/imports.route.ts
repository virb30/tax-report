import type { Router } from 'express';
import { asyncRoute } from './async-route';
import type { ApiRouteContext } from './route-context';
import { getUploadedFile, uploadFile } from '../upload/upload-middleware';
import { parseHttpInput } from '../validation/http-validation';
import { confirmImportMultipartBodySchema } from '../validation/workflow.schemas';

export function registerImportRoutes(router: Router, context: ApiRouteContext): void {
  const useCases = context.useCases.ingestion;
  const upload = uploadFile(context.config);

  router.post(
    '/import/transactions/preview',
    ...upload,
    asyncRoute(async (request, response) => {
      const file = getUploadedFile(request);
      const output = await useCases.previewImportUseCase.execute({
        filePath: file.filePath,
      });

      response.status(200).json(output);
    }),
  );

  router.post(
    '/import/transactions/confirm',
    ...upload,
    asyncRoute(async (request, response) => {
      const file = getUploadedFile(request);
      const body = parseHttpInput(confirmImportMultipartBodySchema, request.body);
      const output = await useCases.importTransactionsUseCase.execute({
        filePath: file.filePath,
        assetTypeOverrides: body.assetTypeOverrides,
      });

      response.status(200).json(output);
    }),
  );
}
