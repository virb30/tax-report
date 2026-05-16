import { parseHttpInput } from '../../../../http/validation/http-validation';
import type { Http } from '../../../../shared/infra/http/http.interface';
import type { GenerateAssetsReportUseCase } from '../../../application/use-cases/generate-assets-report.use-case';
import { assetsReportQuerySchema } from '../validation/tax-reporting-http.schemas';

interface ReportControllerDependencies {
  generateAssetsReportUseCase: GenerateAssetsReportUseCase;
}

export class ReportController {
  constructor(
    private readonly http: Http,
    private readonly dependencies: ReportControllerDependencies,
  ) {
    this.http.on({
      method: 'get',
      path: '/api/reports/assets',
      handler: async (request) => {
        const query = parseHttpInput(assetsReportQuerySchema, request.query);
        const output = await this.dependencies.generateAssetsReportUseCase.execute(query);

        return {
          statusCode: 200,
          body: output,
        };
      },
    });
  }
}
