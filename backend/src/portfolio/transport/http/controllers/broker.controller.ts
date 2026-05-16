import { parseHttpInput } from '../../../../http/validation/http-validation';
import type { Http } from '../../../../shared/infra/http/http.interface';
import type { CreateBrokerUseCase } from '../../../application/use-cases/create-broker.use-case';
import type { ListBrokersUseCase } from '../../../application/use-cases/list-brokers.use-case';
import type { ToggleActiveBrokerUseCase } from '../../../application/use-cases/toggle-active-broker.use-case';
import type { UpdateBrokerUseCase } from '../../../application/use-cases/update-broker.use-case';
import {
  brokerCreateBodySchema,
  brokerListQuerySchema,
  brokerUpdateBodySchema,
  brokerUpdateParamsSchema,
} from '../validation/portfolio-http.schemas';

interface BrokerControllerDependencies {
  listBrokersUseCase: ListBrokersUseCase;
  createBrokerUseCase: CreateBrokerUseCase;
  updateBrokerUseCase: UpdateBrokerUseCase;
  toggleActiveBrokerUseCase: ToggleActiveBrokerUseCase;
}

export class BrokerController {
  constructor(
    private readonly http: Http,
    private readonly dependencies: BrokerControllerDependencies,
  ) {
    this.http.on({
      method: 'get',
      path: '/api/brokers',
      handler: async (request) => {
        const query = parseHttpInput(brokerListQuerySchema, request.query);
        const output = await this.dependencies.listBrokersUseCase.execute(query);

        return {
          statusCode: 200,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'post',
      path: '/api/brokers',
      handler: async (request) => {
        const body = parseHttpInput(brokerCreateBodySchema, request.body);
        const output = await this.dependencies.createBrokerUseCase.execute(body);

        return {
          statusCode: 201,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'patch',
      path: '/api/brokers/{id}',
      handler: async (request) => {
        const params = parseHttpInput(brokerUpdateParamsSchema, request.params);
        const body = parseHttpInput(brokerUpdateBodySchema, request.body);
        const output = await this.dependencies.updateBrokerUseCase.execute({
          id: params.id,
          ...body,
        });

        return {
          statusCode: 200,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'post',
      path: '/api/brokers/{id}/toggle-active',
      handler: async (request) => {
        const params = parseHttpInput(brokerUpdateParamsSchema, request.params);
        const output = await this.dependencies.toggleActiveBrokerUseCase.execute(params);

        return {
          statusCode: 200,
          body: output,
        };
      },
    });
  }
}
