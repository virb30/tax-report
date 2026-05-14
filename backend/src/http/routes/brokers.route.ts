import type { Router } from 'express';
import { asyncRoute } from './async-route';
import type { ApiRouteContext } from './route-context';
import { parseHttpInput } from '../validation/http-validation';
import {
  brokerCreateBodySchema,
  brokerListQuerySchema,
  brokerUpdateBodySchema,
  brokerUpdateParamsSchema,
} from '../validation/workflow.schemas';

export function registerBrokerRoutes(router: Router, context: ApiRouteContext): void {
  const useCases = context.useCases.portfolio;

  router.get(
    '/brokers',
    asyncRoute(async (request, response) => {
      const query = parseHttpInput(brokerListQuerySchema, request.query);
      const output = await useCases.listBrokersUseCase.execute(query);

      response.status(200).json(output);
    }),
  );

  router.post(
    '/brokers',
    asyncRoute(async (request, response) => {
      const body = parseHttpInput(brokerCreateBodySchema, request.body);
      const output = await useCases.createBrokerUseCase.execute(body);

      response.status(201).json(output);
    }),
  );

  router.patch(
    '/brokers/:id',
    asyncRoute(async (request, response) => {
      const params = parseHttpInput(brokerUpdateParamsSchema, request.params);
      const body = parseHttpInput(brokerUpdateBodySchema, request.body);
      const output = await useCases.updateBrokerUseCase.execute({
        id: params.id,
        ...body,
      });

      response.status(200).json(output);
    }),
  );

  router.post(
    '/brokers/:id/toggle-active',
    asyncRoute(async (request, response) => {
      const params = parseHttpInput(brokerUpdateParamsSchema, request.params);
      const output = await useCases.toggleActiveBrokerUseCase.execute(params);

      response.status(200).json(output);
    }),
  );
}
