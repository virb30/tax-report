import type { Router } from 'express';
import { asyncRoute } from './async-route';
import type { ApiRouteContext } from './route-context';
import { parseHttpInput } from '../validation/http-validation';
import {
  assetListQuerySchema,
  assetParamsSchema,
  assetUpdateBodySchema,
  repairAssetTypeBodySchema,
} from '../validation/workflow.schemas';

export function registerAssetRoutes(router: Router, context: ApiRouteContext): void {
  const useCases = context.useCases.portfolio;

  router.get(
    '/assets',
    asyncRoute(async (request, response) => {
      const query = parseHttpInput(assetListQuerySchema, request.query);
      const output = await useCases.listAssetsUseCase.execute(query);

      response.status(200).json(output);
    }),
  );

  router.patch(
    '/assets/:ticker',
    asyncRoute(async (request, response) => {
      const params = parseHttpInput(assetParamsSchema, request.params);
      const body = parseHttpInput(assetUpdateBodySchema, request.body);
      const output = await useCases.updateAssetUseCase.execute({
        ticker: params.ticker,
        ...body,
      });

      response.status(200).json(output);
    }),
  );

  router.post(
    '/assets/:ticker/repair-type',
    asyncRoute(async (request, response) => {
      const params = parseHttpInput(assetParamsSchema, request.params);
      const body = parseHttpInput(repairAssetTypeBodySchema, request.body);
      const output = await useCases.repairAssetTypeUseCase.execute({
        ticker: params.ticker,
        assetType: body.assetType,
      });

      response.status(200).json(output);
    }),
  );
}
