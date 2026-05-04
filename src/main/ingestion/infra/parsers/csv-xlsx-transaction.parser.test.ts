import { mock } from 'jest-mock-extended';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { SheetjsSpreadsheetFileReader } from '../file-readers/sheetjs.spreadsheet.file-reader';
import { CsvXlsxTransactionParser } from './csv-xlsx-transaction.parser';
import type { BrokerRepository } from '../../../portfolio/application/repositories/broker.repository';
import { AssetType, TransactionType } from '../../../../shared/types/domain';
import { Broker } from '../../../portfolio/domain/entities/broker.entity';
import { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';

async function createTempCsvFile(fileName: string, content: string): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tx-parser-test-'));
  const filePath = path.join(directory, fileName);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

async function createTempXlsxFile(
  fileName: string,
  rows: Array<Record<string, string | number>>,
): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tx-parser-test-'));
  const filePath = path.join(directory, fileName);
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

function createBroker(code = 'XP'): Broker {
  return Broker.restore({
    id: Uuid.create(),
    name: `${code} Investimentos`,
    cnpj: new Cnpj('00.000.000/0001-00'),
    code,
    active: true,
  });
}

describe('CsvXlsxTransactionParser', () => {
  let tempDir: string;
  const createdDirs: string[] = [];

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tx-'));
    createdDirs.push(tempDir);
  });

  afterEach(async () => {
    await Promise.all(createdDirs.map((d) => fs.rm(d, { recursive: true, force: true })));
    createdDirs.length = 0;
  });

  it('parses xlsx and resolves broker by code to brokerId', async () => {
    const brokerRepo = mock<BrokerRepository>();
    const broker = createBroker();
    brokerRepo.findAllByCodes.mockImplementation((codes) =>
      Promise.resolve(codes.includes('XP') ? [broker] : []),
    );

    const filePath = await createTempXlsxFile('ops.xlsx', [
      {
        Data: '2025-04-01',
        'Entrada/Saída': 'Crédito',
        Movimentação: 'Transferência - Liquidação',
        Ticker: 'PETR4',
        Quantidade: 10,
        'Preco Unitario': 20,
        Corretora: 'XP',
      },
    ]);
    createdDirs.push(path.dirname(filePath));

    const parser = new CsvXlsxTransactionParser(new SheetjsSpreadsheetFileReader(), brokerRepo);
    const result = await parser.parse(filePath);

    expect(result.batches).toHaveLength(1);
    expect(result.batches[0]?.brokerId).toBe(broker.id.value);
    expect(result.batches[0]?.tradeDate).toBe('2025-04-01');
    expect(result.batches[0]?.operations).toHaveLength(1);
    expect(result.batches[0]?.operations[0]?.ticker).toBe('PETR4');
    expect(result.batches[0]?.operations[0]?.type).toBe('buy');
    expect(result.unsupportedRows).toEqual([]);
  });

  it('throws when broker code is not found in repository', async () => {
    const brokerRepo = mock<BrokerRepository>();
    brokerRepo.findAllByCodes.mockResolvedValue([]);

    const filePath = await createTempXlsxFile('ops.xlsx', [
      {
        Data: '2025-04-01',
        'Entrada/Saída': 'Crédito',
        Movimentação: 'Transferência - Liquidação',
        Ticker: 'PETR4',
        Quantidade: 10,
        'Preco Unitario': 20,
        Corretora: 'INVALIDO',
      },
    ]);
    createdDirs.push(path.dirname(filePath));

    const parser = new CsvXlsxTransactionParser(new SheetjsSpreadsheetFileReader(), brokerRepo);

    await expect(parser.parse(filePath)).rejects.toThrow(
      'Corretoras nao encontradas: INVALIDO. Cadastre-as em Corretoras antes de importar.',
    );
  });

  it('throws with all missing broker codes when multiple are invalid', async () => {
    const brokerRepo = mock<BrokerRepository>();
    brokerRepo.findAllByCodes.mockResolvedValue([]);

    const filePath = await createTempXlsxFile('ops.xlsx', [
      {
        Data: '2025-04-01',
        'Entrada/Saída': 'Crédito',
        Movimentação: 'Transferência - Liquidação',
        Ticker: 'PETR4',
        Quantidade: 10,
        'Preco Unitario': 20,
        Corretora: 'XP',
      },
      {
        Data: '2025-04-01',
        'Entrada/Saída': 'Débito',
        Movimentação: 'Transferência - Liquidação',
        Ticker: 'VALE3',
        Quantidade: 5,
        'Preco Unitario': 40,
        Corretora: 'YY',
      },
    ]);
    createdDirs.push(path.dirname(filePath));

    const parser = new CsvXlsxTransactionParser(new SheetjsSpreadsheetFileReader(), brokerRepo);

    await expect(parser.parse(filePath)).rejects.toThrow(
      'Corretoras nao encontradas: XP, YY. Cadastre-as em Corretoras antes de importar.',
    );
  });

  it('loads unique broker codes once before mapping rows', async () => {
    const brokerRepo = mock<BrokerRepository>();
    brokerRepo.findAllByCodes.mockResolvedValue([createBroker()]);

    const filePath = await createTempXlsxFile('ops.xlsx', [
      {
        Data: '2025-04-01',
        'Entrada/Saída': 'Crédito',
        Movimentação: 'Transferência - Liquidação',
        Ticker: 'PETR4',
        Quantidade: 10,
        'Preco Unitario': 20,
        Corretora: 'XP',
      },
      {
        Data: '2025-04-02',
        'Entrada/Saída': 'Crédito',
        Movimentação: 'Transferência - Liquidação',
        Ticker: 'VALE3',
        Quantidade: 5,
        'Preco Unitario': 40,
        Corretora: 'xp',
      },
    ]);
    createdDirs.push(path.dirname(filePath));

    const parser = new CsvXlsxTransactionParser(new SheetjsSpreadsheetFileReader(), brokerRepo);

    await parser.parse(filePath);

    expect(brokerRepo.findAllByCodes).toHaveBeenCalledTimes(1);
    expect(brokerRepo.findAllByCodes).toHaveBeenCalledWith(['XP']);
  });

  it('parses csv and handles date format', async () => {
    const brokerRepo = mock<BrokerRepository>();
    const broker = createBroker();
    brokerRepo.findAllByCodes.mockImplementation((codes) =>
      Promise.resolve(codes.includes('XP') ? [broker] : []),
    );

    const filePath = await createTempCsvFile(
      'ops.csv',
      [
        'Data;Entrada/Saída;Movimentação;Ticker;Quantidade;Preco Unitario;Corretora',
        '2025-04-01;Crédito;Transferência - Liquidação;PETR4;10;20;XP',
      ].join('\n'),
    );
    createdDirs.push(path.dirname(filePath));

    const parser = new CsvXlsxTransactionParser(new SheetjsSpreadsheetFileReader(), brokerRepo);
    const result = await parser.parse(filePath);

    expect(result.batches).toHaveLength(1);
    expect(result.batches[0]?.brokerId).toBe(broker.id.value);
    expect(result.batches[0]?.tradeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.batches[0]?.operations[0]?.ticker).toBe('PETR4');
  });

  it('correctly parses Excel serial date without timezone issues', async () => {
    const brokerRepo = mock<BrokerRepository>();
    brokerRepo.findAllByCodes.mockResolvedValue([createBroker()]);

    // 45672 corresponds to 2025-01-15 in Excel
    const filePath = await createTempXlsxFile('ops.xlsx', [
      {
        Data: 45672,
        'Entrada/Saída': 'Crédito',
        Movimentação: 'Transferência - Liquidação',
        Ticker: 'PETR4',
        Quantidade: 10,
        'Preco Unitario': 20,
        Corretora: 'XP',
      },
    ]);
    createdDirs.push(path.dirname(filePath));

    const parser = new CsvXlsxTransactionParser(new SheetjsSpreadsheetFileReader(), brokerRepo);
    const result = await parser.parse(filePath);

    expect(result.batches).toHaveLength(1);
    expect(result.batches[0]?.tradeDate).toBe('2025-01-15');
  });

  it('parses new operation types: Bonificação, Split, Grupamento, Transferencia', async () => {
    const brokerRepo = mock<BrokerRepository>();
    brokerRepo.findAllByCodes.mockResolvedValue([createBroker()]);

    const filePath = await createTempXlsxFile('events.xlsx', [
      {
        Data: '2025-04-01',
        'Entrada/Saída': 'Crédito',
        Movimentação: 'Bonificação em ativos',
        Ticker: 'PETR4',
        Quantidade: 1,
        'Preco Unitario': 15,
        Corretora: 'XP',
      },
      {
        Data: '2025-04-02',
        'Entrada/Saída': 'Crédito',
        Movimentação: 'Split',
        Ticker: 'PETR4',
        Quantidade: 10,
        'Preco Unitario': '',
        Corretora: 'XP',
      },
      {
        Data: '2025-04-03',
        'Entrada/Saída': 'Débito',
        Movimentação: 'Agrupamento',
        Ticker: 'VALE3',
        Quantidade: 10,
        'Preco Unitario': 0,
        Corretora: 'XP',
      },
      {
        Data: '2025-04-04',
        'Entrada/Saída': 'Crédito',
        Movimentação: 'Transferência',
        Ticker: 'ITSA4',
        Quantidade: 100,
        'Preco Unitario': 10,
        Corretora: 'XP',
      },
    ]);
    createdDirs.push(path.dirname(filePath));

    const parser = new CsvXlsxTransactionParser(new SheetjsSpreadsheetFileReader(), brokerRepo);
    const result = await parser.parse(filePath);

    expect(result.batches).toHaveLength(4);
    expect(result.batches[0]?.operations[0]?.type).toBe(TransactionType.Bonus);
    expect(result.batches[0]?.operations[0]?.unitPrice).toBe(15);

    expect(result.batches[1]?.operations[0]?.type).toBe(TransactionType.Split);
    expect(result.batches[1]?.operations[0]?.unitPrice).toBe(0);

    expect(result.batches[2]?.operations[0]?.type).toBe(TransactionType.ReverseSplit);
    expect(result.batches[2]?.operations[0]?.unitPrice).toBe(0);

    expect(result.batches[3]?.operations[0]?.type).toBe(TransactionType.TransferIn);
    expect(result.batches[3]?.operations[0]?.unitPrice).toBe(10);
  });

  it('normalizes optional Tipo Ativo and separates unsupported events', async () => {
    const brokerRepo = mock<BrokerRepository>();
    brokerRepo.findAllByCodes.mockResolvedValue([createBroker()]);

    const filePath = await createTempXlsxFile('typed-events.xlsx', [
      {
        Data: '2025-04-01',
        'Entrada/Saída': 'Crédito',
        Movimentação: 'Transferência - Liquidação',
        Ticker: 'PETR4',
        Quantidade: 10,
        'Preco Unitario': 20,
        'Tipo Ativo': 'Ações',
        Corretora: 'XP',
      },
      {
        Data: '2025-04-02',
        'Entrada/Saída': 'Crédito',
        Movimentação: 'Evento Desconhecido',
        Ticker: 'HASH11',
        Quantidade: 1,
        'Preco Unitario': 99,
        'Tipo Ativo': 'Cripto',
        Corretora: 'XP',
      },
    ]);
    createdDirs.push(path.dirname(filePath));

    const parser = new CsvXlsxTransactionParser(new SheetjsSpreadsheetFileReader(), brokerRepo);
    const result = await parser.parse(filePath);

    expect(result.batches[0]?.operations[0]).toMatchObject({
      ticker: 'PETR4',
      sourceAssetType: AssetType.Stock,
      sourceAssetTypeLabel: 'Ações',
    });
    expect(result.unsupportedRows).toEqual([
      expect.objectContaining({
        ticker: 'HASH11',
        sourceAssetType: null,
        sourceAssetTypeLabel: 'Cripto',
        unsupportedReason: 'unsupported_event',
      }),
    ]);
  });
});
