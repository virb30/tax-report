import type {
  IngestionModuleUseCases,
  PortfolioModuleUseCases,
  TaxReportingModuleUseCases,
} from '../../app/infra/container';
import type { BackendRuntimeConfig } from '../../app/infra/runtime/backend-runtime-config';

export interface ApiRouteContext {
  config: BackendRuntimeConfig;
  useCases: {
    portfolio: PortfolioModuleUseCases;
    ingestion: IngestionModuleUseCases;
    taxReporting: TaxReportingModuleUseCases;
  };
}
