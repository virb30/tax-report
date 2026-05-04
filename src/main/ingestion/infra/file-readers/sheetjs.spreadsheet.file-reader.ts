import * as XLSX from 'xlsx';
import type {
  RawSpreadsheetDto,
  SpreadsheetRow,
  SpreadsheetFileReader,
} from '../../application/interfaces/spreadsheet.file-reader';

export class SheetjsSpreadsheetFileReader implements SpreadsheetFileReader {
  private static readonly SUPPORTED_EXTENSIONS = ['.csv', '.xlsx'] as const;

  async read(filePath: string): Promise<RawSpreadsheetDto> {
    this.validateFileExtension(filePath);

    const UTF8_CODEPAGE = 65001;
    const workbook = XLSX.readFile(filePath, { raw: false, codepage: UTF8_CODEPAGE });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { rows: [] };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<SpreadsheetRow>(sheet, { defval: '' });

    return new Promise((resolve) => resolve({ rows }));
  }

  private validateFileExtension(filePath: string): void {
    const normalizedPath = filePath.toLowerCase();
    const isSupported = SheetjsSpreadsheetFileReader.SUPPORTED_EXTENSIONS.some((ext) =>
      normalizedPath.endsWith(ext),
    );
    if (!isSupported) {
      throw new Error('Extensão não suportada. Esperado .csv ou .xlsx.');
    }
  }
}
