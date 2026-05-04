import { mock } from 'jest-mock-extended';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { SheetjsSpreadsheetFileReader } from '../file-readers/sheetjs.spreadsheet.file-reader';
import { CsvXlsxDailyBrokerTaxParser } from './csv-xlsx-daily-broker-tax.parser';
import type { BrokerRepository } from '../../../portfolio/application/repositories/broker.repository';
import { Broker } from '../../../portfolio/domain/entities/broker.entity';
import { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';

async function createTempXlsxFile(
  fileName: string,
  rows: Array<Record<string, string | number>>,
): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'daily-tax-parser-test-'));
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

describe('CsvXlsxDailyBrokerTaxParser', () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      createdDirs.map((directory) => fs.rm(directory, { recursive: true, force: true })),
    );
    createdDirs.length = 0;
  });

  it('parses daily broker taxes and resolves broker by code', async () => {
    const brokerRepository = mock<BrokerRepository>();
    const broker = createBroker();
    brokerRepository.findAllByCodes.mockResolvedValue([broker]);
    const filePath = await createTempXlsxFile('taxes.xlsx', [
      {
        Data: '2025-04-01',
        Corretora: 'xp',
        Taxas: '1,23',
        IRRF: '0.01',
      },
    ]);
    createdDirs.push(path.dirname(filePath));

    const parser = new CsvXlsxDailyBrokerTaxParser(
      new SheetjsSpreadsheetFileReader(),
      brokerRepository,
    );

    await expect(parser.parse(filePath)).resolves.toEqual({
      taxes: [
        {
          date: '2025-04-01',
          brokerId: broker.id.value,
          fees: 1.23,
          irrf: 0.01,
        },
      ],
    });
    expect(brokerRepository.findAllByCodes).toHaveBeenCalledWith(['XP']);
  });

  it('throws when a broker code does not exist', async () => {
    const brokerRepository = mock<BrokerRepository>();
    brokerRepository.findAllByCodes.mockResolvedValue([]);
    const filePath = await createTempXlsxFile('taxes.xlsx', [
      {
        Data: '2025-04-01',
        Corretora: 'INVALIDO',
        Taxas: 1,
        IRRF: 0,
      },
    ]);
    createdDirs.push(path.dirname(filePath));
    const parser = new CsvXlsxDailyBrokerTaxParser(
      new SheetjsSpreadsheetFileReader(),
      brokerRepository,
    );

    await expect(parser.parse(filePath)).rejects.toThrow(
      'Corretoras nao encontradas: INVALIDO. Cadastre-as em Corretoras antes de importar.',
    );
  });
});
