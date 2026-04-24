import type { IpcMainHandleRegistry, IpcRegistrar } from '../registry/ipc-registrar';
import type { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-asset-report/generate-assets-report.use-case';
import { bindIpcContract } from '../binding/bind-ipc-contract';
import { createReportIpcHandlers } from '../handlers/report/report-ipc-handlers';
import {
  generateAssetsReportContract,
  reportIpcContracts,
} from '../../../shared/ipc/contracts/report';

export class ReportController implements IpcRegistrar {
  constructor(private readonly generateAssetsReportUseCase: GenerateAssetsReportUseCase) {}

  register(ipcMain: IpcMainHandleRegistry): string[] {
    const handlers = createReportIpcHandlers(this.generateAssetsReportUseCase);

    bindIpcContract(ipcMain, generateAssetsReportContract, handlers.generateAssetsReport);

    return reportIpcContracts.map((contract) => contract.channel);
  }
}
