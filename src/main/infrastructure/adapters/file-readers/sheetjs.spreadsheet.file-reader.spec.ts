
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { SheetjsSpreadsheetFileReader } from './sheetjs.spreadsheet.file-reader';

async function createTempFile(fileName: string, content: string): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sheetjs-test-'));
  const filePath = path.join(directory, fileName);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

describe('SheetjsSpreadsheetFileReader', () => {
  const createdDirs: string[] = [];

  beforeEach(async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sheetjs-'));
    createdDirs.push(dir);
  });

  afterEach(async () => {
    await Promise.all(
      createdDirs.map((d) => fs.rm(d, { recursive: true, force: true })),
    );
    createdDirs.length = 0;
  });

  it('reads xlsx file and returns rows', async () => {
    const directory = createdDirs[0];
    const filePath = path.join(directory, 'test.xlsx');

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([
      { Data: '2025-04-01', Tipo: 'Compra', Ticker: 'PETR4', Quantidade: 10, 'Preco Unitario': 20, Corretora: 'XP' },
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    XLSX.writeFile(workbook, filePath);

    const reader = new SheetjsSpreadsheetFileReader();
    const result = await reader.read(filePath);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      Data: '2025-04-01',
      Tipo: 'Compra',
      Ticker: 'PETR4',
      Quantidade: 10,
      'Preco Unitario': 20,
      Corretora: 'XP',
    });
  });

  it('reads csv file and returns rows', async () => {
    const filePath = await createTempFile(
      'test.csv',
      [
        'Data;Tipo;Ticker;Quantidade;Preco Unitario;Corretora',
        '2025-04-01;Compra;PETR4;10;20;XP',
      ].join('\n'),
    );
    createdDirs.push(path.dirname(filePath));

    const reader = new SheetjsSpreadsheetFileReader();
    const result = await reader.read(filePath);

    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('returns empty rows for empty xlsx', async () => {
    const directory = createdDirs[0];
    const filePath = path.join(directory, 'empty.xlsx');

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    XLSX.writeFile(workbook, filePath);

    const reader = new SheetjsSpreadsheetFileReader();
    const result = await reader.read(filePath);

    expect(result.rows).toEqual([]);
  });

  it('throws for unsupported file extension', async () => {
    const filePath = await createTempFile('test.txt', 'content');
    createdDirs.push(path.dirname(filePath));

    const reader = new SheetjsSpreadsheetFileReader();

    await expect(reader.read(filePath)).rejects.toThrow(
      'Extensão não suportada. Esperado .csv ou .xlsx.',
    );
  });

  it('accepts uppercase extension .XLSX', async () => {
    const directory = createdDirs[0];
    const filePath = path.join(directory, 'test.XLSX');

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([{ A: 1 }]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    XLSX.writeFile(workbook, filePath);

    const reader = new SheetjsSpreadsheetFileReader();
    const result = await reader.read(filePath);

    expect(result.rows).toHaveLength(1);
  });
});
