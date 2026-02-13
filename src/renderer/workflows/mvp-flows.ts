import type { GenerateAssetsReportQuery } from '@shared/contracts/assets-report.contract';
import type { SetManualBaseCommand } from '@shared/contracts/manual-base.contract';
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

export async function runManualBaseAndRefresh(
  electronApi: ElectronApi,
  input: SetManualBaseCommand,
): Promise<{ positionsCount: number }> {
  await electronApi.setManualBase(input);
  const listResult = await electronApi.listPositions();
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
