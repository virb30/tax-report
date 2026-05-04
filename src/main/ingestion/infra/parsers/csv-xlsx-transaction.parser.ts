import {
  OperationType,
  TransactionType,
  UnsupportedImportReason,
} from '../../../../shared/types/domain';
import type {
  ParsedTransactionBatch,
  ParsedTransactionFile,
  ParsedTransactionOperation,
  UnsupportedParsedTransactionRow,
} from '../../../../preload/contracts/ingestion/import-transactions.contract';
import type { ImportTransactionsParser } from '../../application/interfaces/transactions.parser.interface';
import type {
  SpreadsheetFileReader,
  SpreadsheetRow,
} from '../../application/interfaces/spreadsheet.file-reader';
import type { BrokerRepository } from '../../../portfolio/application/repositories/broker.repository';
import { B3SpreadsheetTransactionMapper } from './b3-spreadsheet-transaction.mapper';
import { UnsupportedImportClassifier } from '../../domain/services/unsupported-import-classifier.service';

type GroupedRawBatch = {
  tradeDate: string;
  broker: string;
  totalOperationalCosts: number;
  operations: Array<{
    ticker: string;
    operationType: OperationType;
    quantity: number;
    unitPrice: number;
    sourceAssetType: ParsedTransactionOperation['sourceAssetType'];
    sourceAssetTypeLabel: ParsedTransactionOperation['sourceAssetTypeLabel'];
  }>;
};

type UnsupportedRawRow = {
  row: number;
  date: string;
  broker: string;
  ticker: string;
  quantity: number;
  unitPrice: number;
  sourceAssetType: ParsedTransactionOperation['sourceAssetType'];
  sourceAssetTypeLabel: ParsedTransactionOperation['sourceAssetTypeLabel'];
  unsupportedReason: UnsupportedImportReason.UnsupportedEvent;
};

type NormalizedTransactionRow = SpreadsheetRow;

type ResolvedBrokerMap = Map<
  string,
  Awaited<ReturnType<BrokerRepository['findAllByCodes']>>[number]
>;

export class CsvXlsxTransactionParser implements ImportTransactionsParser {
  private static readonly REQUIRED_COLUMNS = [
    'Data',
    'Entrada/Saída',
    'Movimentação',
    'Ticker',
    'Quantidade',
    'Preco Unitario',
    'Corretora',
  ] as const;

  private readonly mapper = new B3SpreadsheetTransactionMapper();
  private readonly classifier = new UnsupportedImportClassifier();

  constructor(
    private readonly fileReader: SpreadsheetFileReader,
    private readonly brokerRepository: BrokerRepository,
  ) {}

  async parse(filePath: string): Promise<ParsedTransactionFile> {
    const normalizedRows = await this.loadNormalizedRows(filePath);
    const brokersMap = await this.resolveBrokerMap(normalizedRows);
    const { groupedBatches, unsupportedRows } = this.groupRowsIntoBatches(normalizedRows);

    return {
      batches: this.toParsedBatches(groupedBatches, brokersMap),
      unsupportedRows: this.toUnsupportedRows(unsupportedRows, brokersMap),
    };
  }

  private async loadNormalizedRows(filePath: string): Promise<NormalizedTransactionRow[]> {
    const rawDto = await this.fileReader.read(filePath);

    if (rawDto.rows.length === 0) {
      throw new Error('Input file has no operation rows.');
    }

    const normalizedRows = rawDto.rows.map((row) => this.normalizeRowHeaders(row));
    this.validateRequiredColumns(normalizedRows[0]);

    return normalizedRows;
  }

  private async resolveBrokerMap(rows: NormalizedTransactionRow[]): Promise<ResolvedBrokerMap> {
    const uniqueBrokerCodes = this.extractUniqueBrokerCodes(rows);
    const brokersMap = await this.fetchBrokersByCodes(uniqueBrokerCodes);
    this.validateAllBrokersExist(uniqueBrokerCodes, brokersMap);
    return brokersMap;
  }

  private groupRowsIntoBatches(rows: NormalizedTransactionRow[]): {
    groupedBatches: GroupedRawBatch[];
    unsupportedRows: UnsupportedRawRow[];
  } {
    const batchesByDateAndBroker = new Map<string, GroupedRawBatch>();
    const unsupportedRows: UnsupportedRawRow[] = [];

    for (const [index, row] of rows.entries()) {
      const groupableRow = this.toGroupableRow(row, index + 1);

      if (!groupableRow) {
        continue;
      }

      if ('unsupportedReason' in groupableRow) {
        unsupportedRows.push(groupableRow);
        continue;
      }

      const { tradeDate, broker, operationalCost, operation } = groupableRow;
      const groupKey = `${tradeDate}::${broker}`;
      const existingBatch = batchesByDateAndBroker.get(groupKey);

      if (!existingBatch) {
        batchesByDateAndBroker.set(groupKey, {
          tradeDate,
          broker,
          totalOperationalCosts: operationalCost,
          operations: [operation],
        });
        continue;
      }

      existingBatch.totalOperationalCosts += operationalCost;
      existingBatch.operations.push(operation);
    }

    return {
      groupedBatches: [...batchesByDateAndBroker.values()].sort(
        (a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.broker.localeCompare(b.broker),
      ),
      unsupportedRows,
    };
  }

  private toParsedBatches(
    groupedBatches: GroupedRawBatch[],
    brokersMap: ResolvedBrokerMap,
  ): ParsedTransactionBatch[] {
    const batches: ParsedTransactionBatch[] = [];

    for (const batch of groupedBatches) {
      const broker = brokersMap.get(batch.broker.trim().toUpperCase())!;

      const operations: ParsedTransactionOperation[] = batch.operations.map((op) => ({
        ticker: op.ticker,
        type: this.mapOperationTypeToTransactionType(op.operationType),
        quantity: op.quantity,
        unitPrice: op.unitPrice,
        sourceAssetType: op.sourceAssetType,
        sourceAssetTypeLabel: op.sourceAssetTypeLabel,
      }));

      batches.push({
        tradeDate: batch.tradeDate,
        brokerId: broker.id.value,
        totalOperationalCosts: batch.totalOperationalCosts,
        operations,
      });
    }

    return batches;
  }

  private toUnsupportedRows(
    rows: UnsupportedRawRow[],
    brokersMap: ResolvedBrokerMap,
  ): UnsupportedParsedTransactionRow[] {
    return rows.map((row) => ({
      row: row.row,
      date: row.date,
      ticker: row.ticker,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      brokerId: brokersMap.get(row.broker.trim().toUpperCase())!.id.value,
      sourceAssetType: row.sourceAssetType,
      sourceAssetTypeLabel: row.sourceAssetTypeLabel,
      unsupportedReason: row.unsupportedReason,
    }));
  }

  private toGroupableRow(
    row: NormalizedTransactionRow,
    rowNumber: number,
  ):
    | {
        tradeDate: string;
        broker: string;
        operationalCost: number;
        operation: GroupedRawBatch['operations'][number];
      }
    | UnsupportedRawRow
    | null {
    const tradeDate = this.toDateString(row.Data);
    const broker = String(row.Corretora).trim();

    if (!tradeDate || tradeDate === 'undefined' || !broker || broker === 'undefined') {
      throw new Error('Invalid template: Data and Corretora are required.');
    }

    const operationType = this.mapper.mapRowType(
      String(row['Entrada/Saída']).trim(),
      String(row['Movimentação']).trim(),
    );
    const sourceAssetTypeLabel = this.toOptionalString(row['Tipo Ativo']);
    const sourceAssetType = this.classifier.normalizeAssetType(sourceAssetTypeLabel);

    if (!operationType) {
      return {
        row: rowNumber,
        date: tradeDate,
        broker,
        ticker: String(row.Ticker).trim(),
        quantity: this.parseNumber(row.Quantidade, 'Quantidade'),
        unitPrice: this.parseOptionalNumber(row['Preco Unitario'], 0),
        sourceAssetType,
        sourceAssetTypeLabel,
        unsupportedReason: UnsupportedImportReason.UnsupportedEvent,
      };
    }

    this.mapper.validateRowIntegrity(row, operationType);

    return {
      tradeDate,
      broker,
      operationalCost: this.hasColumn(row, 'Taxas Totais')
        ? this.parseOptionalNumber(row['Taxas Totais'], 0)
        : 0,
      operation: {
        ticker: String(row.Ticker).trim(),
        operationType,
        quantity: this.parseNumber(row.Quantidade, 'Quantidade'),
        unitPrice: this.parseOptionalNumber(row['Preco Unitario'], 0),
        sourceAssetType,
        sourceAssetTypeLabel,
      },
    };
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
    if (normalizedValue === 'preco unitario') {
      return 'Preco Unitario';
    }
    if (normalizedValue === 'tipo ativo') {
      return 'Tipo Ativo';
    }
    if (normalizedValue === 'irrf') {
      return 'IRRF';
    }
    for (const requiredColumn of CsvXlsxTransactionParser.REQUIRED_COLUMNS) {
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

  private parseNumber(value: unknown, column: string): number {
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

  private parseOptionalNumber(value: unknown, defaultValue: number): number {
    const normalizedValue = String(value).trim();
    if (normalizedValue.length === 0 || normalizedValue === 'undefined') {
      return defaultValue;
    }
    return this.parseNumber(value, 'optional');
  }

  private toOptionalString(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    const normalized = String(value).trim();
    if (!normalized || normalized === 'undefined') {
      return null;
    }
    return normalized;
  }

  private mapOperationTypeToTransactionType(operationType: OperationType): TransactionType {
    switch (operationType) {
      case OperationType.Buy:
        return TransactionType.Buy;
      case OperationType.Sell:
        return TransactionType.Sell;
      case OperationType.Bonus:
        return TransactionType.Bonus;
      case OperationType.Split:
        return TransactionType.Split;
      case OperationType.ReverseSplit:
        return TransactionType.ReverseSplit;
      case OperationType.TransferIn:
        return TransactionType.TransferIn;
      case OperationType.TransferOut:
        return TransactionType.TransferOut;
      default:
        return TransactionType.Buy;
    }
  }

  private extractUniqueBrokerCodes(rows: SpreadsheetRow[]): Set<string> {
    const codes = new Set<string>();
    for (const row of rows) {
      const rowBroker = String(row.Corretora).trim();
      if (rowBroker && rowBroker !== 'undefined') {
        codes.add(rowBroker.toUpperCase());
      }
    }
    return codes;
  }

  private async fetchBrokersByCodes(
    codes: Set<string>,
  ): Promise<Map<string, Awaited<ReturnType<BrokerRepository['findAllByCodes']>>[number]>> {
    const codeArray = [...codes];
    const brokers = await this.brokerRepository.findAllByCodes(codeArray);
    const map = new Map<string, Awaited<ReturnType<BrokerRepository['findAllByCodes']>>[number]>();
    for (const broker of brokers) {
      map.set(broker.code, broker);
    }
    return map;
  }

  private validateAllBrokersExist(
    codes: Set<string>,
    brokersMap: Map<string, Awaited<ReturnType<BrokerRepository['findAllByCodes']>>[number]>,
  ): void {
    const missing = [...codes].filter((code) => !brokersMap.has(code));
    if (missing.length > 0) {
      const list = missing.sort().join(', ');
      throw new Error(
        `Corretoras nao encontradas: ${list}. Cadastre-as em Corretoras antes de importar.`,
      );
    }
  }

  private validateRequiredColumns(row: SpreadsheetRow): void {
    const rowKeys = Object.keys(row).map((key) => this.toCanonicalHeader(key));
    for (const requiredColumn of CsvXlsxTransactionParser.REQUIRED_COLUMNS) {
      if (!rowKeys.includes(requiredColumn)) {
        throw new Error(`Invalid template: missing column "${requiredColumn}".`);
      }
    }
  }

  private hasColumn(row: SpreadsheetRow, column: string): boolean {
    return Object.keys(row).some((key) => this.toCanonicalHeader(key) === column);
  }

  private toDateString(value: unknown): string {
    const str = String(value).trim();
    if (!str || str === 'undefined') {
      return '';
    }

    const num = Number(str);
    if (!Number.isNaN(num) && num > 0 && num < 1000000) {
      return this.formatExcelSerialDate(Math.round(num));
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(str)) {
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
