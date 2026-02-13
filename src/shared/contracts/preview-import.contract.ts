import type { ImportOperationsCommand, ImportOperationsResult } from './import-operations.contract';

export type PreviewImportFromFileCommand = {
  broker: string;
  filePath: string;
};

export type PreviewImportFromFileResult = {
  commands: ImportOperationsCommand[];
};

export type ConfirmImportOperationsCommand = {
  commands: ImportOperationsCommand[];
};

export type ConfirmImportOperationsResult = ImportOperationsResult;
