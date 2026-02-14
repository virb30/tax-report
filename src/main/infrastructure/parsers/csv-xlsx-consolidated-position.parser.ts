import fs from 'node:fs/promises';
import * as XLSX from 'xlsx';
import type {
  ConsolidatedPositionParserPort,
  ConsolidatedPositionRow,
} from '../../application/ports/consolidated-position-parser.port';

type SpreadsheetRow = Record<string, string | number | null | undefined>;

const REQUIRED_COLUMNS = ['Ticker', 'Quantidade', 'Preco Medio', 'Corretora'] as const;

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function toCanonicalHeader(value: string): string {
  const normalizedValue = normalizeHeader(value);
  if (normalizedValue === 'preco medio' || normalizedValue === 'preço médio') {
    return 'Preco Medio';
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
    throw new Error(`Valor numérico inválido na coluna "${column}".`);
  }

  const numericValue = Number(normalizedValue.replace(',', '.'));
  if (Number.isNaN(numericValue)) {
    throw new Error(`Valor numérico inválido na coluna "${column}".`);
  }

  return numericValue;
}

function requireTemplateColumns(row: SpreadsheetRow): void {
  const rowKeys = Object.keys(row).map((key) => toCanonicalHeader(key));

  for (const requiredColumn of REQUIRED_COLUMNS) {
    if (!rowKeys.includes(requiredColumn)) {
      throw new Error(`Modelo inválido: coluna "${requiredColumn}" ausente.`);
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
  const workbook = XLSX.readFile(filePath, { raw: false });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<SpreadsheetRow>(sheet, { defval: '' });
}

function resolveFileTypeFromPath(filePath: string): 'csv' | 'xlsx' {
  const normalizedFilePath = filePath.toLowerCase();

  if (normalizedFilePath.endsWith('.csv')) {
    return 'csv';
  }
  if (normalizedFilePath.endsWith('.xlsx')) {
    return 'xlsx';
  }

  throw new Error('Extensão de arquivo não suportada. Esperado .csv ou .xlsx.');
}

export class CsvXlsxConsolidatedPositionParser implements ConsolidatedPositionParserPort {
  async parse(filePath: string): Promise<ConsolidatedPositionRow[]> {
    const fileType = resolveFileTypeFromPath(filePath);
    const rows =
      fileType === 'csv' ? await readCsvRows(filePath) : readXlsxRows(filePath);

    if (rows.length === 0) {
      throw new Error('Arquivo não contém linhas de posição.');
    }

    const normalizedRows = rows.map(normalizeRowHeaders);
    requireTemplateColumns(normalizedRows[0]);

    const result: ConsolidatedPositionRow[] = [];

    for (const row of normalizedRows) {
      const ticker = String(row.Ticker ?? '').trim();
      const brokerCode = String(row.Corretora ?? '').trim();

      if (!ticker || !brokerCode) {
        throw new Error('Ticker e Corretora são obrigatórios em cada linha.');
      }

      const quantity = parseNumber(row.Quantidade, 'Quantidade');
      const averagePrice = parseNumber(row['Preco Medio'], 'Preco Medio');

      if (quantity <= 0) {
        throw new Error(`Quantidade deve ser maior que zero (Ticker: ${ticker}).`);
      }
      if (averagePrice <= 0) {
        throw new Error(`Preço médio deve ser maior que zero (Ticker: ${ticker}).`);
      }

      result.push({
        ticker: ticker.toUpperCase(),
        quantity,
        averagePrice,
        brokerCode: brokerCode.trim().toUpperCase(),
      });
    }

    return result;
  }
}
