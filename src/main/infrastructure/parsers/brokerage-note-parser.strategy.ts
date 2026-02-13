import type { ImportOperationsCommand } from '../../../shared/contracts/import-operations.contract';
import type { OperationsFileParserPort } from '../../application/ports/operations-file-parser.port';
import type {
  BrokerageNoteParserPort,
  ParserFileType,
} from '../../application/ports/brokerage-note-parser.port';

export class BrokerageNoteParserStrategy implements OperationsFileParserPort {
  constructor(private readonly parsers: BrokerageNoteParserPort[]) {}

  async parse(input: {
    broker: string;
    fileType: ParserFileType;
    filePath: string;
  }): Promise<ImportOperationsCommand[]> {
    const parser = this.parsers.find((item) =>
      item.supports({
        broker: input.broker,
        fileType: input.fileType,
      }),
    );
    if (!parser) {
      throw new Error(
        `Unsupported parser for broker "${input.broker}" and file type "${input.fileType}".`,
      );
    }

    return parser.parse(input.filePath);
  }
}
