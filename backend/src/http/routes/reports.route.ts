import type { Router } from 'express';
import { asyncRoute } from './async-route';
import type { ApiRouteContext } from './route-context';
import { parseHttpInput } from '../validation/http-validation';
import { assetsReportQuerySchema } from '../validation/workflow.schemas';

export function registerReportRoutes(router: Router, context: ApiRouteContext): void {
  const useCases = context.useCases.taxReporting;

  router.get(
    '/reports/assets',
    asyncRoute(async (request, response) => {
      const query = parseHttpInput(assetsReportQuerySchema, request.query);
      const output = await useCases.generateAssetsReportUseCase.execute(query);

      response.status(200).json(output);
    }),
  );
}
