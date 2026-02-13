import type {
  ImportOperationsCommand,
  ImportOperationsResult,
} from '@shared/contracts/import-operations.contract';
import type { ImportBrokerageNoteUseCase } from './import-brokerage-note-use-case';

export class ImportOperationsUseCase {
  constructor(private readonly importBrokerageNoteUseCase: ImportBrokerageNoteUseCase) {}

  async execute(input: ImportOperationsCommand): Promise<ImportOperationsResult> {
    return this.importBrokerageNoteUseCase.execute(input);
  }
}
