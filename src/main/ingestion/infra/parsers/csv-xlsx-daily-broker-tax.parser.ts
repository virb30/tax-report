import type {
  DailyBrokerTaxesParser,
  ParsedDailyBrokerTax,
  ParsedDailyBrokerTaxFile,
} from '../../application/interfaces/daily-broker-taxes.parser.interface';
import type {
  SpreadsheetFileReader,
  SpreadsheetRow,
} from '../../application/interfaces/spreadsheet.file-reader';
import type { BrokerRepository } from '../../../portfolio/application/repositories/broker.repository';

type ResolvedBrokerMap = Map<
  string,
  Awaited<ReturnType<BrokerRepository['findAllByCodes']>>[number]
>;

export class CsvXlsxDailyBrokerTaxParser implements DailyBrokerTaxesParser {
  private static readonly REQUIRED_COLUMNS = ['Data', 'Corretora', 'Taxas', 'IRRF'] as const;

  constructor(
    private readonly fileReader: SpreadsheetFileReader,
    private readonly brokerRepository: BrokerRepository,
  ) {}

  async parse(filePath: string): Promise<ParsedDailyBrokerTaxFile> {
    const rows = await this.loadNormalizedRows(filePath);
    const brokersMap = await this.resolveBrokerMap(rows);

    return {
      taxes: rows.map((row) => this.toParsedTax(row, brokersMap)),
    };
  }

  private async loadNormalizedRows(filePath: string): Promise<SpreadsheetRow[]> {
    const rawDto = await this.fileReader.read(filePath);

    if (rawDto.rows.length === 0) {
      throw new Error('Input file has no daily broker tax rows.');
    }

    const normalizedRows = rawDto.rows.map((row) => this.normalizeRowHeaders(row));
    this.validateRequiredColumns(normalizedRows[0]);

    return normalizedRows;
  }

  private async resolveBrokerMap(rows: SpreadsheetRow[]): Promise<ResolvedBrokerMap> {
    const codes = this.extractUniqueBrokerCodes(rows);
    const brokers = await this.brokerRepository.findAllByCodes([...codes]);
    const brokersMap = new Map<
      string,
      Awaited<ReturnType<BrokerRepository['findAllByCodes']>>[number]
    >();

    for (const broker of brokers) {
      brokersMap.set(broker.code, broker);
    }

    const missing = [...codes].filter((code) => !brokersMap.has(code));
    if (missing.length > 0) {
      throw new Error(
        `Corretoras nao encontradas: ${missing.sort().join(', ')}. Cadastre-as em Corretoras antes de importar.`,
      );
    }

    return brokersMap;
  }

  private toParsedTax(row: SpreadsheetRow, brokersMap: ResolvedBrokerMap): ParsedDailyBrokerTax {
    const brokerCode = String(row.Corretora).trim().toUpperCase();
    const broker = brokersMap.get(brokerCode);

    if (!broker) {
      throw new Error(`Corretora nao encontrada: ${brokerCode}.`);
    }

    return {
      date: this.toDateString(row.Data),
      brokerId: broker.id.value,
      fees: this.parseNumber(row.Taxas, 'Taxas'),
      irrf: this.parseNumber(row.IRRF, 'IRRF'),
    };
  }

  private extractUniqueBrokerCodes(rows: SpreadsheetRow[]): Set<string> {
    const codes = new Set<string>();
    for (const row of rows) {
      const code = String(row.Corretora).trim();
      if (code && code !== 'undefined') {
        codes.add(code.toUpperCase());
      }
    }
    return codes;
  }

  private normalizeHeader(value: string): string {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private toCanonicalHeader(value: string): string {
    const normalizedValue = this.normalizeHeader(value);
    for (const requiredColumn of CsvXlsxDailyBrokerTaxParser.REQUIRED_COLUMNS) {
      if (this.normalizeHeader(requiredColumn) === normalizedValue) {
        return requiredColumn;
      }
    }
    return String(value).trim();
  }

  private normalizeRowHeaders(row: SpreadsheetRow): SpreadsheetRow {
    const normalizedRow: SpreadsheetRow = {};
    for (const [key, value] of Object.entries(row)) {
      normalizedRow[this.toCanonicalHeader(key)] = value;
    }
    return normalizedRow;
  }

  private validateRequiredColumns(row: SpreadsheetRow | undefined): void {
    if (!row) {
      throw new Error('Input file has no daily broker tax rows.');
    }

    const rowKeys = Object.keys(row).map((key) => this.toCanonicalHeader(key));
    for (const requiredColumn of CsvXlsxDailyBrokerTaxParser.REQUIRED_COLUMNS) {
      if (!rowKeys.includes(requiredColumn)) {
        throw new Error(`Invalid daily broker tax template: missing column "${requiredColumn}".`);
      }
    }
  }

  private parseNumber(value: unknown, column: string): number {
    const normalizedValue = String(value).trim();
    if (normalizedValue.length === 0 || normalizedValue === 'undefined') {
      throw new Error(`Invalid numeric value at column "${column}".`);
    }

    const numericValue = Number(normalizedValue.replace(',', '.'));
    if (!Number.isFinite(numericValue)) {
      throw new Error(`Invalid numeric value at column "${column}".`);
    }

    if (numericValue < 0) {
      throw new Error(`Numeric value at column "${column}" cannot be negative.`);
    }

    return numericValue;
  }

  private toDateString(value: unknown): string {
    const str = String(value).trim();
    if (!str || str === 'undefined') {
      throw new Error('Invalid daily broker tax template: Data is required.');
    }

    const numericValue = Number(str);
    if (!Number.isNaN(numericValue) && numericValue > 0 && numericValue < 1000000) {
      return this.formatExcelSerialDate(Math.round(numericValue));
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    throw new Error(`Formato de data inválido: "${str}". Esperado YYYY-MM-DD ou data do Excel.`);
  }

  private formatExcelSerialDate(serialDate: number): string {
    const excelEpochUtc = Date.UTC(1899, 11, 30);
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const date = new Date(excelEpochUtc + serialDate * millisecondsPerDay);
    return date.toISOString().slice(0, 10);
  }
}
