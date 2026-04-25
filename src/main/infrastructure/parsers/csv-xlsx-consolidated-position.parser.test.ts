import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CsvXlsxConsolidatedPositionParser } from './csv-xlsx-consolidated-position.parser';

async function createTempFile(fileName: string, content: string): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'consolidated-'));
  const filePath = path.join(directory, fileName);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

describe('CsvXlsxConsolidatedPositionParser', () => {
  const createdDirs: string[] = [];
  const parser = new CsvXlsxConsolidatedPositionParser();

  afterEach(async () => {
    await Promise.all(
      createdDirs.map((d) => fs.rm(d, { recursive: true, force: true })),
    );
    createdDirs.length = 0;
  });

  it('parses CSV with correct columns', async () => {
    const filePath = await createTempFile(
      'pos.csv',
      [
        'Ticker;Quantidade;Preco Medio;Corretora',
        'PETR4;100;25.50;XP',
        'VALE3;50;68.00;Clear',
      ].join('\n'),
    );
    createdDirs.push(path.dirname(filePath));

    const result = await parser.parse(filePath);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      ticker: 'PETR4',
      quantity: 100,
      averagePrice: 25.5,
      brokerCode: 'XP',
    });
    expect(result[1]).toEqual({
      ticker: 'VALE3',
      quantity: 50,
      averagePrice: 68,
      brokerCode: 'CLEAR',
    });
  });

  it('accepts Preço Médio as header (accented)', async () => {
    const filePath = await createTempFile(
      'pos.csv',
      ['Ticker;Quantidade;Preço Médio;Corretora', 'ITUB4;200;28;XP'].join('\n'),
    );
    createdDirs.push(path.dirname(filePath));

    const result = await parser.parse(filePath);

    expect(result).toHaveLength(1);
    expect(result[0]?.averagePrice).toBe(28);
  });

  it('throws when required column is missing', async () => {
    const filePath = await createTempFile(
      'pos.csv',
      ['Ticker;Quantidade;Corretora', 'PETR4;100;XP'].join('\n'),
    );
    createdDirs.push(path.dirname(filePath));

    await expect(parser.parse(filePath)).rejects.toThrow(/Preco Medio|ausente/);
  });

  it('throws when quantity is invalid', async () => {
    const filePath = await createTempFile(
      'pos.csv',
      [
        'Ticker;Quantidade;Preco Medio;Corretora',
        'PETR4;abc;25.50;XP',
      ].join('\n'),
    );
    createdDirs.push(path.dirname(filePath));

    await expect(parser.parse(filePath)).rejects.toThrow(/Quantidade|invalido/i);
  });

  it('throws when quantity is zero', async () => {
    const filePath = await createTempFile(
      'pos.csv',
      [
        'Ticker;Quantidade;Preco Medio;Corretora',
        'PETR4;0;25.50;XP',
      ].join('\n'),
    );
    createdDirs.push(path.dirname(filePath));

    await expect(parser.parse(filePath)).rejects.toThrow(/maior que zero/);
  });

  it('throws when average price is zero', async () => {
    const filePath = await createTempFile(
      'pos.csv',
      [
        'Ticker;Quantidade;Preco Medio;Corretora',
        'PETR4;100;0;XP',
      ].join('\n'),
    );
    createdDirs.push(path.dirname(filePath));

    await expect(parser.parse(filePath)).rejects.toThrow(/maior que zero/);
  });

  it('throws when file is empty', async () => {
    const filePath = await createTempFile('pos.csv', 'Ticker;Quantidade;Preco Medio;Corretora');
    createdDirs.push(path.dirname(filePath));

    await expect(parser.parse(filePath)).rejects.toThrow(/não contém linhas|nao contem linhas/i);
  });

  it('throws when ticker or corretora is empty', async () => {
    const filePath = await createTempFile(
      'pos.csv',
      [
        'Ticker;Quantidade;Preco Medio;Corretora',
        ';100;25;XP',
      ].join('\n'),
    );
    createdDirs.push(path.dirname(filePath));

    await expect(parser.parse(filePath)).rejects.toThrow(/obrigatórios|obrigatorios/i);
  });

  it('throws for unsupported file extension', async () => {
    const filePath = await createTempFile('pos.txt', '');
    createdDirs.push(path.dirname(filePath));

    await expect(parser.parse(filePath)).rejects.toThrow(/nao suportada|\.csv|\.xlsx/);
  });
});
