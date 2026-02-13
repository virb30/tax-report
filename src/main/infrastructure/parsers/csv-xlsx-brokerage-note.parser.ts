import fs from 'node:fs/promises';
import * as XLSX from 'xlsx';
import { AssetType, OperationType, SourceType } from '../../../shared/types/domain';
import type { ImportOperationsCommand } from '../../../shared/contracts/import-operations.contract';
import type {
  BrokerageNoteParserPort,
  ParserFileType,
} from '../../application/ports/brokerage-note-parser.port';

type SpreadsheetRow = Record<string, string | number | null | undefined>;

const REQUIRED_COLUMNS = [
  'Data',
  'Tipo',
  'Ticker',
  'Quantidade',
  'Preco Unitario',
  'Taxas Totais',
  'Corretora',
] as const;

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function toCanonicalHeader(value: string): string {
  const normalizedValue = normalizeHeader(value);
  if (normalizedValue === 'preco unitario') {
    return 'Preco Unitario';
  }

  if (normalizedValue === 'tipo ativo') {
    return 'Tipo Ativo';
  }

  if (normalizedValue === 'irrf') {
    return 'IRRF';
  }

  for (const requiredColumn of REQUIRED_COLUMNS) {
    if (normalizeHeader(requiredColumn) === normalizedValue) {
      return requiredColumn;
    }
  }

  return value.trim();
}

function normalizeRowHeaders(row: SpreadsheetRow): SpreadsheetRow {
  const normalizedRow: SpreadsheetRow = {};
  for (const [key, value] of Object.entries(row)) {
    normalizedRow[toCanonicalHeader(key)] = value;
  }

  return normalizedRow;
}

function parseNumber(value: unknown, column: string): number {
  const normalizedValue = String(value).trim();
  if (normalizedValue.length === 0) {
    throw new Error(`Invalid numeric value at column "${column}".`);
  }

  const numericValue = Number(normalizedValue.replace(',', '.'));
  if (Number.isNaN(numericValue)) {
    throw new Error(`Invalid numeric value at column "${column}".`);
  }

  return numericValue;
}

function parseOptionalNumber(value: unknown, defaultValue: number): number {
  const normalizedValue = String(value).trim();
  if (normalizedValue.length === 0 || normalizedValue === 'undefined') {
    return defaultValue;
  }

  return parseNumber(value, 'optional');
}

function parseOperationType(value: unknown): OperationType {
  const normalizedValue = normalizeHeader(String(value));
  if (normalizedValue === 'compra' || normalizedValue === 'buy') {
    return OperationType.Buy;
  }
  if (normalizedValue === 'venda' || normalizedValue === 'sell') {
    return OperationType.Sell;
  }

  throw new Error('Invalid operation type. Expected Compra/Venda.');
}

function parseAssetType(value: unknown): AssetType {
  const valueAsString =
    typeof value === 'string' || typeof value === 'number' ? String(value) : 'stock';
  const normalizedValue = normalizeHeader(valueAsString);
  if (normalizedValue === 'stock' || normalizedValue === 'acao' || normalizedValue === 'acoes') {
    return AssetType.Stock;
  }
  if (normalizedValue === 'fii') {
    return AssetType.Fii;
  }
  if (normalizedValue === 'etf') {
    return AssetType.Etf;
  }
  if (normalizedValue === 'bdr') {
    return AssetType.Bdr;
  }

  throw new Error('Invalid asset type. Expected stock/fii/etf/bdr.');
}

function requireTemplateColumns(row: SpreadsheetRow): void {
  const rowKeys = Object.keys(row).map((key) => toCanonicalHeader(key));

  for (const requiredColumn of REQUIRED_COLUMNS) {
    if (!rowKeys.includes(requiredColumn)) {
      throw new Error(`Invalid template: missing column "${requiredColumn}".`);
    }
  }
}

async function readCsvRows(filePath: string): Promise<SpreadsheetRow[]> {
  const csvContent = await fs.readFile(filePath, 'utf-8');
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length <= 1) {
    return [];
  }

  const headers = lines[0].split(';').map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(';').map((cell) => cell.trim());
    const row: SpreadsheetRow = {};
    for (let index = 0; index < headers.length; index += 1) {
      const header = headers[index];
      row[header] = cells[index] ?? '';
    }

    return row;
  });
}

function readXlsxRows(filePath: string): SpreadsheetRow[] {
  const workbook = XLSX.readFile(filePath, {
    raw: false,
  });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<SpreadsheetRow>(sheet, { defval: '' });
}

export class CsvXlsxBrokerageNoteParser implements BrokerageNoteParserPort {
  supports(input: { broker: string; fileType: ParserFileType }): boolean {
    return normalizeHeader(input.broker).length > 0 && input.fileType !== 'pdf';
  }

  async parse(filePath: string): Promise<ImportOperationsCommand[]> {
    const fileType = resolveFileTypeFromPath(filePath);
    const rows = fileType === 'csv' ? await readCsvRows(filePath) : readXlsxRows(filePath);
    if (rows.length === 0) {
      throw new Error('Input file has no operation rows.');
    }

    const normalizedRows = rows.map(normalizeRowHeaders);
    requireTemplateColumns(normalizedRows[0]);
    const groupedCommands = new Map<string, ImportOperationsCommand>();

    for (const row of normalizedRows) {
      const rowTradeDate = String(row.Data).trim();
      const rowBroker = String(row.Corretora).trim();
      if (!rowTradeDate || rowTradeDate === 'undefined' || !rowBroker || rowBroker === 'undefined') {
        throw new Error('Invalid template: Data and Corretora are required.');
      }

      const operationalCost = parseNumber(row['Taxas Totais'], 'Taxas Totais');
      const operation = {
        ticker: String(row.Ticker).trim(),
        assetType: parseAssetType(row['Tipo Ativo']),
        operationType: parseOperationType(row.Tipo),
        quantity: parseNumber(row.Quantidade, 'Quantidade'),
        unitPrice: parseNumber(row['Preco Unitario'], 'Preco Unitario'),
        irrfWithheld: parseOptionalNumber(row.IRRF, 0),
      };
      const groupKey = `${rowTradeDate}::${rowBroker}`;
      const existingCommand = groupedCommands.get(groupKey);
      if (!existingCommand) {
        groupedCommands.set(groupKey, {
          tradeDate: rowTradeDate,
          broker: rowBroker,
          sourceType: SourceType.Csv,
          totalOperationalCosts: operationalCost,
          operations: [operation],
        });
        continue;
      }

      existingCommand.totalOperationalCosts += operationalCost;
      existingCommand.operations.push(operation);
    }

    return [...groupedCommands.values()];
  }
}

function resolveFileTypeFromPath(filePath: string): ParserFileType {
  const normalizedFilePath = filePath.toLowerCase();

  if (normalizedFilePath.endsWith('.csv')) {
    return 'csv';
  }
  if (normalizedFilePath.endsWith('.xlsx')) {
    return 'xlsx';
  }

  throw new Error('Unsupported file extension. Expected .csv or .xlsx');
}
