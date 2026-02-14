import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mock } from 'jest-mock-extended';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CsvXlsxBrokerageNoteParser } from './csv-xlsx-brokerage-note.parser';
import { CsvXlsxTransactionParser } from './csv-xlsx-transaction.parser';
import type { BrokerRepositoryPort } from '../../application/repositories/broker.repository';

async function createTempFile(fileName: string, content: string): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tx-parser-test-'));
  const filePath = path.join(directory, fileName);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

describe('CsvXlsxTransactionParser', () => {
  let tempDir: string;
  const createdDirs: string[] = [];

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tx-'));
    createdDirs.push(tempDir);
  });

  afterEach(async () => {
    await Promise.all(
      createdDirs.map((d) => fs.rm(d, { recursive: true, force: true })),
    );
    createdDirs.length = 0;
  });

  it('parses csv and resolves broker by code to brokerId', async () => {
    const brokerRepo = mock<BrokerRepositoryPort>();
    brokerRepo.findById.mockResolvedValue(null);
    brokerRepo.findByName.mockResolvedValue(null);
    brokerRepo.findByCode.mockImplementation((code) =>
      Promise.resolve(
        code === 'XP'
          ? { id: 'broker-xp', name: 'XP Investimentos', cnpj: '00.000.000/0001-00', code: 'XP', active: true }
          : null,
      ),
    );
    brokerRepo.findAll.mockResolvedValue([]);
    brokerRepo.findAllActive.mockResolvedValue([]);
    brokerRepo.save.mockResolvedValue(undefined);
    brokerRepo.update.mockResolvedValue(undefined);
    const filePath = await createTempFile(
      'ops.csv',
      [
        'Data;Tipo;Ticker;Quantidade;Preco Unitario;Taxas Totais;Corretora',
        '2025-04-01;Compra;PETR4;10;20;1;XP',
      ].join('\n'),
    );
    createdDirs.push(path.dirname(filePath));

    const parser = new CsvXlsxTransactionParser(
      new CsvXlsxBrokerageNoteParser(),
      brokerRepo,
    );
    const result = await parser.parse(filePath);

    expect(result).toHaveLength(1);
    expect(result[0]?.brokerId).toBe('broker-xp');
    expect(result[0]?.tradeDate).toBe('2025-04-01');
    expect(result[0]?.operations).toHaveLength(1);
    expect(result[0]?.operations[0]?.ticker).toBe('PETR4');
    expect(result[0]?.operations[0]?.type).toBe('buy');
  });

  it('throws when broker code is not found in repository', async () => {
    const brokerRepo = mock<BrokerRepositoryPort>();
    brokerRepo.findById.mockResolvedValue(null);
    brokerRepo.findByName.mockResolvedValue(null);
    brokerRepo.findByCode.mockResolvedValue(null);
    brokerRepo.findAll.mockResolvedValue([]);
    brokerRepo.save.mockResolvedValue(undefined);
    const filePath = await createTempFile(
      'ops.csv',
      [
        'Data;Tipo;Ticker;Quantidade;Preco Unitario;Taxas Totais;Corretora',
        '2025-04-01;Compra;PETR4;10;20;1;INVALIDO',
      ].join('\n'),
    );
    createdDirs.push(path.dirname(filePath));

    const parser = new CsvXlsxTransactionParser(
      new CsvXlsxBrokerageNoteParser(),
      brokerRepo,
    );

    await expect(parser.parse(filePath)).rejects.toThrow(
      "Corretora com codigo 'INVALIDO' nao encontrada. Cadastre-a em Corretoras antes de importar.",
    );
  });
});
