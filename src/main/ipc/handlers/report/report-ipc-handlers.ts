import type { GenerateAssetsReportUseCase } from '../../../application/use-cases/generate-asset-report/generate-assets-report.use-case';
import type { IpcContractHandler } from '../../binding/bind-ipc-contract';
import type { generateAssetsReportContract } from '../../../../shared/ipc/contracts/report';

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
