import type {
  IpcMainHandleRegistry,
  IpcRegistrar,
} from '../../../../ipc/main/registry/ipc-registrar';
import type { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-assets-report.use-case';
import { bindIpcContract } from '../../../../ipc/main/binding/bind-ipc-contract';
import { createReportIpcHandlers } from '../handlers/report/report-ipc-handlers';
import {
  generateAssetsReportContract,
  reportIpcContracts,
} from '../../../../ipc/contracts/tax-reporting/report';

export class ReportIpcRegistrar implements IpcRegistrar {
  constructor(private readonly generateAssetsReportUseCase: GenerateAssetsReportUseCase) {}

  register(ipcMain: IpcMainHandleRegistry): string[] {
    const handlers = createReportIpcHandlers(this.generateAssetsReportUseCase);

    bindIpcContract(ipcMain, generateAssetsReportContract, handlers.generateAssetsReport);

    return reportIpcContracts.map((contract) => contract.channel);
  }
}
