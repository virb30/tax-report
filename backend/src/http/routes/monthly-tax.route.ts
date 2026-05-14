import type { Router } from 'express';
import { asyncRoute } from './async-route';
import type { ApiRouteContext } from './route-context';
import { parseHttpInput } from '../validation/http-validation';
import {
  monthlyTaxDetailParamsSchema,
  monthlyTaxHistoryQuerySchema,
  monthlyTaxRecalculateBodySchema,
} from '../validation/workflow.schemas';

export function registerMonthlyTaxRoutes(router: Router, context: ApiRouteContext): void {
  const useCases = context.useCases.taxReporting;

  router.get(
    '/monthly-tax/history',
    asyncRoute(async (request, response) => {
      const query = parseHttpInput(monthlyTaxHistoryQuerySchema, request.query);
      const output = await useCases.listMonthlyTaxHistoryUseCase.execute(query);

      response.status(200).json(output);
    }),
  );

  router.get(
    '/monthly-tax/months/:month',
    asyncRoute(async (request, response) => {
      const params = parseHttpInput(monthlyTaxDetailParamsSchema, request.params);
      const output = await useCases.getMonthlyTaxDetailUseCase.execute(params);

      response.status(200).json(output);
    }),
  );

  router.post(
    '/monthly-tax/recalculate',
    asyncRoute(async (request, response) => {
      const body = parseHttpInput(monthlyTaxRecalculateBodySchema, request.body);
      const output = await useCases.recalculateMonthlyTaxHistoryUseCase.execute(body);

      response.status(200).json(output);
    }),
  );
}
