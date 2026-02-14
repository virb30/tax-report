import type { GenerateAssetsReportQuery } from '@shared/contracts/assets-report.contract';
import type { SetInitialBalanceCommand } from '@shared/contracts/initial-balance.contract';
import type { PreviewImportFromFileCommand } from '@shared/contracts/preview-import.contract';
import type { ElectronApi } from '@shared/types/electron-api';

export async function runImportPreviewAndConfirm(
  electronApi: ElectronApi,
  input: PreviewImportFromFileCommand,
): Promise<{ createdOperationsCount: number; recalculatedPositionsCount: number }> {
  const previewResult = await electronApi.previewImportFromFile(input);
  return electronApi.confirmImportOperations({
    commands: previewResult.commands,
  });
}

export async function runInitialBalanceAndRefresh(
  electronApi: ElectronApi,
  input: SetInitialBalanceCommand,
): Promise<{ positionsCount: number }> {
  await electronApi.setInitialBalance(input);
  const listResult = await electronApi.listPositions({ baseYear: input.year });
  return {
    positionsCount: listResult.items.length,
  };
}

export async function runAnnualReport(
  electronApi: ElectronApi,
  query: GenerateAssetsReportQuery,
): Promise<{ itemsCount: number; referenceDate: string }> {
  const report = await electronApi.generateAssetsReport(query);
  return {
    itemsCount: report.items.length,
    referenceDate: report.referenceDate,
  };
}
