import { afterEach, describe, expect, it } from '@jest/globals';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { AssetType, OperationType, SourceType } from '../../../shared/types/domain';
import { CsvXlsxBrokerageNoteParser } from './csv-xlsx-brokerage-note.parser';

async function createTempFile(fileName: string, content: string): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'parser-test-'));
  const filePath = path.join(directory, fileName);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

describe('CsvXlsxBrokerageNoteParser', () => {
  const createdDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      createdDirectories.map(async (directoryPath) => {
        await fs.rm(directoryPath, { recursive: true, force: true });
      }),
    );
    createdDirectories.length = 0;
  });

  it('supports any broker for csv/xlsx and rejects empty broker or pdf', () => {
    const parser = new CsvXlsxBrokerageNoteParser();

    expect(parser.supports({ broker: 'XP', fileType: 'csv' })).toBe(true);
    expect(parser.supports({ broker: 'INTER', fileType: 'xlsx' })).toBe(true);
    expect(parser.supports({ broker: 'XP', fileType: 'pdf' })).toBe(false);
    expect(parser.supports({ broker: '', fileType: 'csv' })).toBe(false);
  });

  it('parses csv template and maps operations', async () => {
    const parser = new CsvXlsxBrokerageNoteParser();
    const filePath = await createTempFile(
      'operations.csv',
      [
        'Data;Tipo;Ticker;Quantidade;Preço Unitário;Taxas Totais;Corretora;Tipo Ativo;IRRF',
        '2025-04-01;Compra;PETR4;10;20.50;1.25;XP;stock;0',
        '2025-04-01;Venda;PETR4;2;21.00;0.75;XP;stock;0.10',
      ].join('\n'),
    );
    createdDirectories.push(path.dirname(filePath));

    const result = await parser.parse(filePath);

    expect(result).toEqual([
      {
        tradeDate: '2025-04-01',
        broker: 'XP',
        sourceType: SourceType.Csv,
        totalOperationalCosts: 2,
        operations: [
          {
            ticker: 'PETR4',
            assetType: AssetType.Stock,
            operationType: OperationType.Buy,
            quantity: 10,
            unitPrice: 20.5,
            irrfWithheld: 0,
          },
          {
            ticker: 'PETR4',
            assetType: AssetType.Stock,
            operationType: OperationType.Sell,
            quantity: 2,
            unitPrice: 21,
            irrfWithheld: 0.1,
          },
        ],
      },
    ]);
  });

  it('accepts uppercase csv extension', async () => {
    const parser = new CsvXlsxBrokerageNoteParser();
    const filePath = await createTempFile(
      'operations.CSV',
      [
        'Data;Tipo;Ticker;Quantidade;Preço Unitário;Taxas Totais;Corretora',
        '2025-04-01;Compra;PETR4;1;10;0;XP',
      ].join('\n'),
    );
    createdDirectories.push(path.dirname(filePath));

    const result = await parser.parse(filePath);
    expect(result[0]?.operations).toHaveLength(1);
  });

  it('maps etf and bdr asset types and ignores extra columns', async () => {
    const parser = new CsvXlsxBrokerageNoteParser();
    const filePath = await createTempFile(
      'asset-types.csv',
      [
        'Data;Tipo;Ticker;Quantidade;Preço Unitário;Taxas Totais;Corretora;Tipo Ativo;Observacao',
        '2025-04-01;Compra;BOVA11;1;100;0;XP;etf;ok',
        '2025-04-01;Compra;AAPL34;1;50;0;XP;bdr;ok',
      ].join('\n'),
    );
    createdDirectories.push(path.dirname(filePath));

    const result = await parser.parse(filePath);

    expect(result[0]?.operations[0]?.assetType).toBe(AssetType.Etf);
    expect(result[0]?.operations[1]?.assetType).toBe(AssetType.Bdr);
  });

  it('parses xlsx template', async () => {
    const parser = new CsvXlsxBrokerageNoteParser();
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'parser-xlsx-'));
    createdDirectories.push(directory);
    const filePath = path.join(directory, 'operations.xlsx');

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([
      {
        Data: '2025-05-01',
        Tipo: 'Compra',
        Ticker: 'HGLG11',
        Quantidade: 3,
        'Preco Unitario': 150.2,
        'Taxas Totais': 0.5,
        Corretora: 'XP',
        'Tipo Ativo': 'fii',
      },
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    XLSX.writeFile(workbook, filePath);

    const result = await parser.parse(filePath);

    expect(result[0]?.operations[0]?.assetType).toBe(AssetType.Fii);
    expect(result[0]?.totalOperationalCosts).toBe(0.5);
  });

  it('throws clear error for unsupported file extension', async () => {
    const parser = new CsvXlsxBrokerageNoteParser();
    const filePath = await createTempFile('operations.txt', 'content');
    createdDirectories.push(path.dirname(filePath));

    await expect(parser.parse(filePath)).rejects.toThrow(
      'Unsupported file extension. Expected .csv or .xlsx',
    );
  });

  it('throws when csv has no operation rows', async () => {
    const parser = new CsvXlsxBrokerageNoteParser();
    const filePath = await createTempFile(
      'empty.csv',
      'Data;Tipo;Ticker;Quantidade;Preço Unitário;Taxas Totais;Corretora',
    );
    createdDirectories.push(path.dirname(filePath));

    await expect(parser.parse(filePath)).rejects.toThrow('Input file has no operation rows.');
  });

  it('throws when required column is missing', async () => {
    const parser = new CsvXlsxBrokerageNoteParser();
    const filePath = await createTempFile(
      'missing-column.csv',
      ['Data;Tipo;Ticker;Quantidade;Corretora', '2025-04-01;Compra;PETR4;1;XP'].join('\n'),
    );
    createdDirectories.push(path.dirname(filePath));

    await expect(parser.parse(filePath)).rejects.toThrow(
      'Invalid template: missing column "Preco Unitario".',
    );
  });

  it('groups rows by date and broker', async () => {
    const parser = new CsvXlsxBrokerageNoteParser();
    const filePath = await createTempFile(
      'grouped.csv',
      [
        'Data;Tipo;Ticker;Quantidade;Preço Unitário;Taxas Totais;Corretora',
        '2025-04-01;Compra;PETR4;1;10;1;XP',
        '2025-04-02;Compra;PETR4;1;10;1;XP',
        '2025-04-01;Compra;PETR4;1;10;1;NU',
      ].join('\n'),
    );
    createdDirectories.push(path.dirname(filePath));

    const result = await parser.parse(filePath);

    expect(result).toHaveLength(3);
  });

  it('fills missing trailing csv cell with empty value', async () => {
    const parser = new CsvXlsxBrokerageNoteParser();
    const filePath = await createTempFile(
      'missing-trailing-cell.csv',
      [
        'Data;Tipo;Ticker;Quantidade;Preço Unitário;Taxas Totais;Corretora;Tipo Ativo;IRRF',
        '2025-04-01;Compra;PETR4;1;10;1;XP;stock',
      ].join('\n'),
    );
    createdDirectories.push(path.dirname(filePath));

    const result = await parser.parse(filePath);
    expect(result[0]?.operations[0]?.irrfWithheld).toBe(0);
  });

  it('throws when data or broker is empty in first row', async () => {
    const parser = new CsvXlsxBrokerageNoteParser();
    const filePath = await createTempFile(
      'missing-date-or-broker.csv',
      [
        'Data;Tipo;Ticker;Quantidade;Preço Unitário;Taxas Totais;Corretora',
        ';Compra;PETR4;1;10;1;XP',
      ].join('\n'),
    );
    createdDirectories.push(path.dirname(filePath));

    await expect(parser.parse(filePath)).rejects.toThrow(
      'Invalid template: Data and Corretora are required.',
    );
  });

  it('throws when numeric values are invalid', async () => {
    const parser = new CsvXlsxBrokerageNoteParser();
    const filePath = await createTempFile(
      'invalid-number.csv',
      [
        'Data;Tipo;Ticker;Quantidade;Preço Unitário;Taxas Totais;Corretora',
        '2025-04-01;Compra;PETR4;ABC;10;1;XP',
      ].join('\n'),
    );
    createdDirectories.push(path.dirname(filePath));

    await expect(parser.parse(filePath)).rejects.toThrow(
      'Invalid numeric value at column "Quantidade".',
    );
  });

  it('throws when numeric required field (Preco Unitario) is empty', async () => {
    const parser = new CsvXlsxBrokerageNoteParser();
    const filePath = await createTempFile(
      'empty-numeric.csv',
      [
        'Data;Tipo;Ticker;Quantidade;Preço Unitário;Taxas Totais;Corretora',
        '2025-04-01;Compra;PETR4;1;;1;XP',
      ].join('\n'),
    );
    createdDirectories.push(path.dirname(filePath));

    await expect(parser.parse(filePath)).rejects.toThrow(
      'Invalid numeric value at column "Preco Unitario".',
    );
  });

  it('throws when operation type is invalid', async () => {
    const parser = new CsvXlsxBrokerageNoteParser();
    const filePath = await createTempFile(
      'invalid-type.csv',
      [
        'Data;Tipo;Ticker;Quantidade;Preço Unitário;Taxas Totais;Corretora',
        '2025-04-01;Transferencia;PETR4;1;10;1;XP',
      ].join('\n'),
    );
    createdDirectories.push(path.dirname(filePath));

    await expect(parser.parse(filePath)).rejects.toThrow(
      'Invalid operation type. Expected Compra/Venda.',
    );
  });

  it('throws when asset type is invalid', async () => {
    const parser = new CsvXlsxBrokerageNoteParser();
    const filePath = await createTempFile(
      'invalid-asset-type.csv',
      [
        'Data;Tipo;Ticker;Quantidade;Preço Unitário;Taxas Totais;Corretora;Tipo Ativo',
        '2025-04-01;Compra;PETR4;1;10;1;XP;cripto',
      ].join('\n'),
    );
    createdDirectories.push(path.dirname(filePath));

    await expect(parser.parse(filePath)).rejects.toThrow(
      'Invalid asset type. Expected stock/fii/etf/bdr.',
    );
  });

});
