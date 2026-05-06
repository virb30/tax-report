import type { GenerateAssetsReportUseCase } from '../../../application/use-cases/generate-assets-report.use-case';
import type { IpcContractHandler } from '../../../../../preload/main/binding/bind-ipc-contract';
import type { generateAssetsReportContract } from '../../../../../preload/contracts/tax-reporting/report';

export type ReportIpcHandlers = {
  generateAssetsReport: IpcContractHandler<typeof generateAssetsReportContract>;
};

export function createReportIpcHandlers(
  generateAssetsReportUseCase: GenerateAssetsReportUseCase,
): ReportIpcHandlers {
  return {
    generateAssetsReport: (payload) => generateAssetsReportUseCase.execute(payload),
  };
}
