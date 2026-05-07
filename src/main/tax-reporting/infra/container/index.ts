import { generateAssetsReportContract } from '../../../../ipc/contracts/tax-reporting/report';
import { bindIpcContract } from '../../../../ipc/main/binding/bind-ipc-contract';
import { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-assets-report.use-case';
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
  const generateAssetsReportUseCase = new GenerateAssetsReportUseCase(
    portfolio.positionRepository,
    portfolio.brokerRepository,
    portfolio.assetRepository,
    portfolio.transactionRepository,
  );

  return {
    repositories: {
      monthlyTaxCloseRepository,
      dailyBrokerTaxRepository,
    },
    useCases: {
      generateAssetsReportUseCase,
    },
    registerIpc(ipcMain) {
      bindIpcContract(ipcMain, generateAssetsReportContract, (payload) =>
        generateAssetsReportUseCase.execute(payload),
      );
    },
  };
}
