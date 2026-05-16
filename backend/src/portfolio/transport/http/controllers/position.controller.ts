import { parseHttpInput } from '../../../../http/validation/http-validation';
import type { Http } from '../../../../shared/infra/http/http.interface';
import type { DeleteAllPositionsUseCase } from '../../../application/use-cases/delete-all-positions.use-case';
import type { DeletePositionUseCase } from '../../../application/use-cases/delete-position.use-case';
import type { ListPositionsUseCase } from '../../../application/use-cases/list-positions.use-case';
import type { MigrateYearUseCase } from '../../../application/use-cases/migrate-year.use-case';
import type { RecalculatePositionUseCase } from '../../../application/use-cases/recalculate-position.use-case';
import {
  migrateYearBodySchema,
  positionParamsSchema,
  positionsQuerySchema,
  recalculatePositionBodySchema,
  yearQuerySchema,
} from '../validation/portfolio-http.schemas';

interface PositionControllerDependencies {
  listPositionsUseCase: ListPositionsUseCase;
  deletePositionUseCase: DeletePositionUseCase;
  deleteAllPositionsUseCase: DeleteAllPositionsUseCase;
  recalculatePositionUseCase: RecalculatePositionUseCase;
  migrateYearUseCase: MigrateYearUseCase;
}

export class PositionController {
  constructor(
    private readonly http: Http,
    private readonly dependencies: PositionControllerDependencies,
  ) {
    this.http.on({
      method: 'get',
      path: '/api/positions',
      handler: async (request) => {
        const query = parseHttpInput(positionsQuerySchema, request.query);
        const output = await this.dependencies.listPositionsUseCase.execute({
          baseYear: query.year,
        });

        return {
          statusCode: 200,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'delete',
      path: '/api/positions',
      handler: async (request) => {
        const query = parseHttpInput(yearQuerySchema, request.query);
        const output = await this.dependencies.deleteAllPositionsUseCase.execute({
          year: query.year,
        });

        return {
          statusCode: 200,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'delete',
      path: '/api/positions/{ticker}',
      handler: async (request) => {
        const params = parseHttpInput(positionParamsSchema, request.params);
        const query = parseHttpInput(yearQuerySchema, request.query);
        const output = await this.dependencies.deletePositionUseCase.execute({
          ticker: params.ticker,
          year: query.year,
        });

        return {
          statusCode: 200,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'post',
      path: '/api/positions/recalculate',
      handler: async (request) => {
        const body = parseHttpInput(recalculatePositionBodySchema, request.body);
        const output = await this.dependencies.recalculatePositionUseCase.execute(body);

        return {
          statusCode: 200,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'post',
      path: '/api/positions/migrate-year',
      handler: async (request) => {
        const body = parseHttpInput(migrateYearBodySchema, request.body);
        const output = await this.dependencies.migrateYearUseCase.execute(body);

        return {
          statusCode: 200,
          body: output,
        };
      },
    });
  }
}
