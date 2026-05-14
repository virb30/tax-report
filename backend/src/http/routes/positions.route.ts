import type { Router } from 'express';
import { asyncRoute } from './async-route';
import type { ApiRouteContext } from './route-context';
import { getUploadedFile, uploadFile } from '../upload/upload-middleware';
import { parseHttpInput } from '../validation/http-validation';
import {
  consolidatedImportMultipartBodySchema,
  migrateYearBodySchema,
  positionsQuerySchema,
  recalculatePositionBodySchema,
} from '../validation/workflow.schemas';

export function registerPositionRoutes(router: Router, context: ApiRouteContext): void {
  const useCases = context.useCases.portfolio;
  const upload = uploadFile(context.config);

  router.get(
    '/positions',
    asyncRoute(async (request, response) => {
      const query = parseHttpInput(positionsQuerySchema, request.query);
      const output = await useCases.listPositionsUseCase.execute({
        baseYear: query.year,
      });

      response.status(200).json(output);
    }),
  );

  router.delete(
    '/positions',
    asyncRoute(async (request, response) => {
      const query = parseHttpInput(positionsQuerySchema, request.query);
      const output = query.ticker
        ? await useCases.deletePositionUseCase.execute({
            ticker: query.ticker,
            year: query.year,
          })
        : await useCases.deletePositionUseCase.executeAll({
            year: query.year,
          });

      response.status(200).json(output);
    }),
  );

  router.post(
    '/positions/recalculate',
    asyncRoute(async (request, response) => {
      const body = parseHttpInput(recalculatePositionBodySchema, request.body);
      const output = await useCases.recalculatePositionUseCase.execute(body);

      response.status(200).json(output);
    }),
  );

  router.post(
    '/positions/migrate-year',
    asyncRoute(async (request, response) => {
      const body = parseHttpInput(migrateYearBodySchema, request.body);
      const output = await useCases.migrateYearUseCase.execute(body);

      response.status(200).json(output);
    }),
  );

  router.post(
    '/positions/consolidated-preview',
    ...upload,
    asyncRoute(async (request, response) => {
      const file = getUploadedFile(request);
      const output = await useCases.importConsolidatedPositionUseCase.preview({
        filePath: file.filePath,
      });

      response.status(200).json(output);
    }),
  );

  router.post(
    '/positions/consolidated-import',
    ...upload,
    asyncRoute(async (request, response) => {
      const file = getUploadedFile(request);
      const body = parseHttpInput(consolidatedImportMultipartBodySchema, request.body);
      const output = await useCases.importConsolidatedPositionUseCase.execute({
        filePath: file.filePath,
        year: body.year,
        assetTypeOverrides: body.assetTypeOverrides,
      });

      response.status(200).json(output);
    }),
  );
}
