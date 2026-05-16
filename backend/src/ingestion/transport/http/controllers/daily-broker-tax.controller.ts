import { getUploadedFile } from '../../../../http/upload/upload-middleware';
import { parseHttpInput } from '../../../../http/validation/http-validation';
import type { Http } from '../../../../shared/infra/http/http.interface';
import type { DeleteDailyBrokerTaxUseCase } from '../../../application/use-cases/delete-daily-broker-tax.use-case';
import type { ImportDailyBrokerTaxesUseCase } from '../../../application/use-cases/import-daily-broker-taxes.use-case';
import type { ListDailyBrokerTaxesUseCase } from '../../../application/use-cases/list-daily-broker-taxes.use-case';
import type { SaveDailyBrokerTaxUseCase } from '../../../application/use-cases/save-daily-broker-tax.use-case';
import { dailyBrokerTaxUploadMiddleware } from '../middleware/daily-broker-tax-upload.middleware';
import {
  dailyBrokerTaxParamsSchema,
  saveDailyBrokerTaxBodySchema,
} from '../validation/ingestion-http.schemas';

interface DailyBrokerTaxControllerDependencies {
  listDailyBrokerTaxesUseCase: ListDailyBrokerTaxesUseCase;
  saveDailyBrokerTaxUseCase: SaveDailyBrokerTaxUseCase;
  importDailyBrokerTaxesUseCase: ImportDailyBrokerTaxesUseCase;
  deleteDailyBrokerTaxUseCase: DeleteDailyBrokerTaxUseCase;
}

export class DailyBrokerTaxController {
  constructor(
    private readonly http: Http,
    private readonly dependencies: DailyBrokerTaxControllerDependencies,
  ) {
    this.http.on({
      method: 'get',
      path: '/api/daily-broker-taxes',
      handler: async () => {
        const output = await this.dependencies.listDailyBrokerTaxesUseCase.execute();

        return {
          statusCode: 200,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'post',
      path: '/api/daily-broker-taxes',
      handler: async (request) => {
        const body = parseHttpInput(saveDailyBrokerTaxBodySchema, request.body);
        const output = await this.dependencies.saveDailyBrokerTaxUseCase.execute(body);

        return {
          statusCode: 200,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'post',
      path: '/api/daily-broker-taxes/import',
      middlewares: [dailyBrokerTaxUploadMiddleware],
      handler: async (request) => {
        const file = getUploadedFile(request.raw);
        const output = await this.dependencies.importDailyBrokerTaxesUseCase.execute({
          filePath: file.filePath,
        });

        return {
          statusCode: 200,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'delete',
      path: '/api/daily-broker-taxes/{date}/{brokerId}',
      handler: async (request) => {
        const params = parseHttpInput(dailyBrokerTaxParamsSchema, request.params);
        const output = await this.dependencies.deleteDailyBrokerTaxUseCase.execute(params);

        return {
          statusCode: 200,
          body: output,
        };
      },
    });
  }
}
