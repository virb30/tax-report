import { generateAssetsReportContract } from '../../../../ipc/contracts/tax-reporting/report';
import { bindIpcContract } from '../../../../ipc/main/binding/bind-ipc-contract';
import { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-assets-report.use-case';
import type {
  TaxReportingModule,
  TaxReportingPortfolioDependencies,
} from '../../../app/infra/container';

export type CreateTaxReportingModuleInput = {
  portfolio: TaxReportingPortfolioDependencies;
};

export function createTaxReportingModule(input: CreateTaxReportingModuleInput): TaxReportingModule {
  const { portfolio } = input;
  const generateAssetsReportUseCase = new GenerateAssetsReportUseCase(
    portfolio.positionRepository,
    portfolio.brokerRepository,
    portfolio.assetRepository,
    portfolio.transactionRepository,
  );

  return {
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
