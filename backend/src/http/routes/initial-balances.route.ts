import type { Router } from 'express';
import { asyncRoute } from './async-route';
import type { ApiRouteContext } from './route-context';
import { parseHttpInput } from '../validation/http-validation';
import {
  initialBalanceParamsSchema,
  saveInitialBalanceBodySchema,
  yearQuerySchema,
} from '../validation/workflow.schemas';

export function registerInitialBalanceRoutes(router: Router, context: ApiRouteContext): void {
  const useCases = context.useCases.portfolio;

  router.get(
    '/initial-balances',
    asyncRoute(async (request, response) => {
      const query = parseHttpInput(yearQuerySchema, request.query);
      const output = await useCases.listInitialBalanceDocumentsUseCase.execute(query);

      response.status(200).json(output);
    }),
  );

  router.post(
    '/initial-balances',
    asyncRoute(async (request, response) => {
      const body = parseHttpInput(saveInitialBalanceBodySchema, request.body);
      const output = await useCases.saveInitialBalanceDocumentUseCase.execute(body);

      response.status(200).json(output);
    }),
  );

  router.delete(
    '/initial-balances/:year/:ticker',
    asyncRoute(async (request, response) => {
      const params = parseHttpInput(initialBalanceParamsSchema, request.params);
      const output = await useCases.deleteInitialBalanceDocumentUseCase.execute(params);

      response.status(200).json(output);
    }),
  );
}
