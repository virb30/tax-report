import { parseHttpInput } from '../../../../http/validation/http-validation';
import type { Http } from '../../../../shared/infra/http/http.interface';
import type { GetMonthlyTaxDetailUseCase } from '../../../application/use-cases/get-monthly-tax-detail.use-case';
import type { ListMonthlyTaxHistoryUseCase } from '../../../application/use-cases/list-monthly-tax-history.use-case';
import type { RecalculateMonthlyTaxHistoryUseCase } from '../../../application/use-cases/recalculate-monthly-tax-history.use-case';
import {
  monthlyTaxDetailParamsSchema,
  monthlyTaxHistoryQuerySchema,
  monthlyTaxRecalculateBodySchema,
} from '../validation/tax-reporting-http.schemas';

interface MonthlyTaxControllerDependencies {
  listMonthlyTaxHistoryUseCase: ListMonthlyTaxHistoryUseCase;
  getMonthlyTaxDetailUseCase: GetMonthlyTaxDetailUseCase;
  recalculateMonthlyTaxHistoryUseCase: RecalculateMonthlyTaxHistoryUseCase;
}

export class MonthlyTaxController {
  constructor(
    private readonly http: Http,
    private readonly dependencies: MonthlyTaxControllerDependencies,
  ) {
    this.http.on({
      method: 'get',
      path: '/api/monthly-tax/history',
      handler: async (request) => {
        const query = parseHttpInput(monthlyTaxHistoryQuerySchema, request.query);
        const output = await this.dependencies.listMonthlyTaxHistoryUseCase.execute(query);

        return {
          statusCode: 200,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'get',
      path: '/api/monthly-tax/months/{month}',
      handler: async (request) => {
        const params = parseHttpInput(monthlyTaxDetailParamsSchema, request.params);
        const output = await this.dependencies.getMonthlyTaxDetailUseCase.execute(params);

        return {
          statusCode: 200,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'post',
      path: '/api/monthly-tax/recalculate',
      handler: async (request) => {
        const body = parseHttpInput(monthlyTaxRecalculateBodySchema, request.body);
        const output = await this.dependencies.recalculateMonthlyTaxHistoryUseCase.execute(body);

        return {
          statusCode: 200,
          body: output,
        };
      },
    });
  }
}
