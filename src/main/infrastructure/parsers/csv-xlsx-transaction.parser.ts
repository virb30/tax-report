import * as XLSX from 'xlsx';
import { OperationType, TransactionType } from '../../../shared/types/domain';
import type {
  ParsedTransactionBatch,
  ParsedTransactionOperation,
} from '../../../shared/contracts/import-transactions.contract';
import type { ImportTransactionsParser } from '../../application/interfaces/transactions.parser.interface';
import type { SpreadsheetFileReader } from '../../application/interfaces/spreadsheet.file-reader';
import type { SpreadsheetRow } from '../../application/interfaces/spreadsheet.file-reader';
import type { BrokerRepository } from '../../application/repositories/broker.repository';

type GroupedRawBatch = {
  tradeDate: string;
  broker: string;
  totalOperationalCosts: number;
  operations: Array<{
    ticker: string;
    operationType: OperationType;
    quantity: number;
    unitPrice: number;
  }>;
};

export class CsvXlsxTransactionParser implements ImportTransactionsParser {
  private static readonly REQUIRED_COLUMNS = [
    'Data',
    'Tipo',
    'Ticker',
    'Quantidade',
    'Preco Unitario',
    'Corretora',
  ] as const;

  constructor(
    private readonly fileReader: SpreadsheetFileReader,
    private readonly brokerRepository: BrokerRepository,
  ) {}

  async parse(filePath: string): Promise<ParsedTransactionBatch[]> {
    const rawDto = await this.fileReader.read(filePath);
    const rows = rawDto.rows;

    if (rows.length === 0) {
      throw new Error('Input file has no operation rows.');
    }

    const normalizedRows = rows.map((row) => this.normalizeRowHeaders(row));
    this.validateRequiredColumns(normalizedRows[0]!);

    const uniqueBrokerCodes = this.extractUniqueBrokerCodes(normalizedRows);
    const brokersMap = await this.fetchBrokersByCodes(uniqueBrokerCodes);
    this.validateAllBrokersExist(uniqueBrokerCodes, brokersMap);

    const batchesByDateAndBroker = new Map<string, GroupedRawBatch>();

    for (const row of normalizedRows) {
      const rowTradeDate = this.toDateString(row.Data);
      const rowBroker = String(row.Corretora).trim();
      if (!rowTradeDate || rowTradeDate === 'undefined' || !rowBroker || rowBroker === 'undefined') {
        throw new Error('Invalid template: Data and Corretora are required.');
      }

      const operationalCost = this.hasColumn(row, 'Taxas Totais')
        ? this.parseOptionalNumber(row['Taxas Totais'], 0)
        : 0;
      const operation = {
        ticker: String(row.Ticker).trim(),
        operationType: this.parseOperationType(row.Tipo),
        quantity: this.parseNumber(row.Quantidade, 'Quantidade'),
        unitPrice: this.parseNumber(row['Preco Unitario'], 'Preco Unitario'),
      };
      const groupKey = `${rowTradeDate}::${rowBroker}`;
      const existingBatch = batchesByDateAndBroker.get(groupKey);
      if (!existingBatch) {
        batchesByDateAndBroker.set(groupKey, {
          tradeDate: rowTradeDate,
          broker: rowBroker,
          totalOperationalCosts: operationalCost,
          operations: [operation],
        });
        continue;
      }
      existingBatch.totalOperationalCosts += operationalCost;
      existingBatch.operations.push(operation);
    }

    const sortedBatches = [...batchesByDateAndBroker.values()].sort(
      (a, b) =>
        a.tradeDate.localeCompare(b.tradeDate) ||
        a.broker.localeCompare(b.broker),
    );

    const batches: ParsedTransactionBatch[] = [];
    for (const batch of sortedBatches) {
      const broker = brokersMap.get(batch.broker.trim().toUpperCase())!;

      const operations: ParsedTransactionOperation[] = batch.operations.map((op) => ({
        ticker: op.ticker,
        type: this.mapOperationTypeToTransactionType(op.operationType),
        quantity: op.quantity,
        unitPrice: op.unitPrice,
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

  private normalizeHeader(value: string): string {
    return value
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
    return value.trim();
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

  private parseOperationType(value: unknown): OperationType {
    const normalizedValue = this.normalizeHeader(String(value));
    if (normalizedValue === 'compra') {
      return OperationType.Buy;
    }
    if (normalizedValue === 'venda') {
      return OperationType.Sell;
    }
    throw new Error('Invalid operation type. Expected Compra/Venda.');
  }

  private mapOperationTypeToTransactionType(operationType: OperationType): TransactionType {
    return operationType === OperationType.Buy ? TransactionType.Buy : TransactionType.Sell;
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
      return XLSX.SSF.format('yyyy-mm-dd', Math.round(num));
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(str)) {
      return str;
    }

    throw new Error(`Formato de data inválido: "${str}". Esperado YYYY-MM-DD ou data do Excel.`);
  }
}
