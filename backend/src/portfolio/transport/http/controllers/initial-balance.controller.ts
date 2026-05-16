import { parseHttpInput } from '../../../../http/validation/http-validation';
import type { Http } from '../../../../shared/infra/http/http.interface';
import type { DeleteInitialBalanceDocumentUseCase } from '../../../application/use-cases/delete-initial-balance-document.use-case';
import type { ListInitialBalanceDocumentsUseCase } from '../../../application/use-cases/list-initial-balance-documents.use-case';
import type { SaveInitialBalanceDocumentUseCase } from '../../../application/use-cases/save-initial-balance-document.use-case';
import {
  initialBalanceParamsSchema,
  saveInitialBalanceBodySchema,
  yearQuerySchema,
} from '../validation/portfolio-http.schemas';

interface InitialBalanceControllerDependencies {
  listInitialBalanceDocumentsUseCase: ListInitialBalanceDocumentsUseCase;
  saveInitialBalanceDocumentUseCase: SaveInitialBalanceDocumentUseCase;
  deleteInitialBalanceDocumentUseCase: DeleteInitialBalanceDocumentUseCase;
}

export class InitialBalanceController {
  constructor(
    private readonly http: Http,
    private readonly dependencies: InitialBalanceControllerDependencies,
  ) {
    this.http.on({
      method: 'get',
      path: '/api/initial-balances',
      handler: async (request) => {
        const query = parseHttpInput(yearQuerySchema, request.query);
        const output = await this.dependencies.listInitialBalanceDocumentsUseCase.execute(query);

        return {
          statusCode: 200,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'post',
      path: '/api/initial-balances',
      handler: async (request) => {
        const body = parseHttpInput(saveInitialBalanceBodySchema, request.body);
        const output = await this.dependencies.saveInitialBalanceDocumentUseCase.execute(body);

        return {
          statusCode: 200,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'delete',
      path: '/api/initial-balances/{year}/{ticker}',
      handler: async (request) => {
        const params = parseHttpInput(initialBalanceParamsSchema, request.params);
        const output = await this.dependencies.deleteInitialBalanceDocumentUseCase.execute(params);

        return {
          statusCode: 200,
          body: output,
        };
      },
    });
  }
}
