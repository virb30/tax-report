import { GetMonthlyTaxDetailUseCase } from '../../application/use-cases/get-monthly-tax-detail.use-case';
import { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-assets-report.use-case';
import { ListMonthlyTaxHistoryUseCase } from '../../application/use-cases/list-monthly-tax-history.use-case';
import { RecalculateMonthlyTaxHistoryUseCase } from '../../application/use-cases/recalculate-monthly-tax-history.use-case';
import { RecalculateMonthlyTaxCloseHandler } from '../handlers/recalculate-monthly-tax-close.handler';
import { KnexMonthlyTaxCloseRepository } from '../repositories/knex-monthly-tax-close.repository';
import type {
  SharedInfrastructure,
  TaxReportingIngestionDependencies,
  TaxReportingModule,
  TaxReportingPortfolioDependencies,
} from '../../../app/infra/container';

export type CreateTaxReportingModuleInput = {
  shared: SharedInfrastructure;
  portfolio: TaxReportingPortfolioDependencies;
  ingestion: TaxReportingIngestionDependencies;
};

export function createTaxReportingModule(input: CreateTaxReportingModuleInput): TaxReportingModule {
  const { ingestion, portfolio, shared } = input;
  const monthlyTaxCloseRepository = new KnexMonthlyTaxCloseRepository(shared.database);
  const dailyBrokerTaxRepository = ingestion.dailyBrokerTaxRepository;
  const recalculateMonthlyTaxHistoryUseCase = new RecalculateMonthlyTaxHistoryUseCase(
    monthlyTaxCloseRepository,
    portfolio.transactionRepository,
    portfolio.assetRepository,
    dailyBrokerTaxRepository,
  );
  const listMonthlyTaxHistoryUseCase = new ListMonthlyTaxHistoryUseCase(
    monthlyTaxCloseRepository,
    recalculateMonthlyTaxHistoryUseCase,
  );
  const getMonthlyTaxDetailUseCase = new GetMonthlyTaxDetailUseCase(monthlyTaxCloseRepository);
  const generateAssetsReportUseCase = new GenerateAssetsReportUseCase(
    portfolio.positionRepository,
    portfolio.brokerRepository,
    portfolio.assetRepository,
    portfolio.transactionRepository,
  );

  let initialized = false;

  return {
    repositories: {
      monthlyTaxCloseRepository,
      dailyBrokerTaxRepository,
    },
    useCases: {
      generateAssetsReportUseCase,
      listMonthlyTaxHistoryUseCase,
      getMonthlyTaxDetailUseCase,
      recalculateMonthlyTaxHistoryUseCase,
    },
    startup: {
      initialize() {
        if (initialized) {
          return;
        }

        initialized = true;
        void new RecalculateMonthlyTaxCloseHandler(
          shared.queue,
          recalculateMonthlyTaxHistoryUseCase,
        );
      },
    },
  };
}
