import { parseHttpInput } from '../../../../http/validation/http-validation';
import type { Http } from '../../../../shared/infra/http/http.interface';
import type { ListAssetsUseCase } from '../../../application/use-cases/list-assets.use-case';
import type { RepairAssetTypeUseCase } from '../../../application/use-cases/repair-asset-type.use-case';
import type { UpdateAssetUseCase } from '../../../application/use-cases/update-asset.use-case';
import {
  assetListQuerySchema,
  assetParamsSchema,
  assetUpdateBodySchema,
  repairAssetTypeBodySchema,
} from '../validation/portfolio-http.schemas';

interface AssetControllerDependencies {
  listAssetsUseCase: ListAssetsUseCase;
  updateAssetUseCase: UpdateAssetUseCase;
  repairAssetTypeUseCase: RepairAssetTypeUseCase;
}

export class AssetController {
  constructor(
    private readonly http: Http,
    private readonly dependencies: AssetControllerDependencies,
  ) {
    this.http.on({
      method: 'get',
      path: '/api/assets',
      handler: async (request) => {
        const query = parseHttpInput(assetListQuerySchema, request.query);
        const output = await this.dependencies.listAssetsUseCase.execute(query);

        return {
          statusCode: 200,
          body: output,
        };
      },
    });

    this.http.on({
      method: 'patch',
      path: '/api/assets/{ticker}',
      handler: async (request) => {
        const params = parseHttpInput(assetParamsSchema, request.params);
        const body = parseHttpInput(assetUpdateBodySchema, request.body);
        const output = await this.dependencies.updateAssetUseCase.execute({
          ticker: params.ticker,
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
      path: '/api/assets/{ticker}/repair-type',
      handler: async (request) => {
        const params = parseHttpInput(assetParamsSchema, request.params);
        const body = parseHttpInput(repairAssetTypeBodySchema, request.body);
        const output = await this.dependencies.repairAssetTypeUseCase.execute({
          ticker: params.ticker,
          assetType: body.assetType,
        });

        return {
          statusCode: 200,
          body: output,
        };
      },
    });
  }
}
