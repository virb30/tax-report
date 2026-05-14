import type { Router } from 'express';
import { asyncRoute } from './async-route';
import type { ApiRouteContext } from './route-context';
import { getUploadedFile, uploadFile } from '../upload/upload-middleware';
import { parseHttpInput } from '../validation/http-validation';
import {
  dailyBrokerTaxParamsSchema,
  saveDailyBrokerTaxBodySchema,
} from '../validation/workflow.schemas';

export function registerDailyBrokerTaxRoutes(router: Router, context: ApiRouteContext): void {
  const useCases = context.useCases.ingestion;
  const upload = uploadFile(context.config);

  router.get(
    '/daily-broker-taxes',
    asyncRoute(async (_request, response) => {
      const output = await useCases.listDailyBrokerTaxesUseCase.execute();

      response.status(200).json(output);
    }),
  );

  router.post(
    '/daily-broker-taxes',
    asyncRoute(async (request, response) => {
      const body = parseHttpInput(saveDailyBrokerTaxBodySchema, request.body);
      const output = await useCases.saveDailyBrokerTaxUseCase.execute(body);

      response.status(200).json(output);
    }),
  );

  router.post(
    '/daily-broker-taxes/import',
    ...upload,
    asyncRoute(async (request, response) => {
      const file = getUploadedFile(request);
      const output = await useCases.importDailyBrokerTaxesUseCase.execute({
        filePath: file.filePath,
      });

      response.status(200).json(output);
    }),
  );

  router.delete(
    '/daily-broker-taxes/:date/:brokerId',
    asyncRoute(async (request, response) => {
      const params = parseHttpInput(dailyBrokerTaxParamsSchema, request.params);
      const output = await useCases.deleteDailyBrokerTaxUseCase.execute(params);

      response.status(200).json(output);
    }),
  );
}
