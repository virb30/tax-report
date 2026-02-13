import { describe, expect, it, jest } from '@jest/globals';
import { SourceType } from '../../../shared/types/domain';
import type { BrokerageNoteParserPort } from '../../application/ports/brokerage-note-parser.port';
import { BrokerageNoteParserStrategy } from './brokerage-note-parser.strategy';

describe('BrokerageNoteParserStrategy', () => {
  it('selects parser by broker and file type', async () => {
    const parserA: BrokerageNoteParserPort = {
      supports: jest.fn().mockReturnValue(false),
      parse: jest.fn(),
    };
    const parseMock = jest.fn().mockResolvedValue([
      {
        tradeDate: '2025-01-01',
        broker: 'XP',
        sourceType: SourceType.Csv,
        totalOperationalCosts: 0,
        operations: [],
      },
    ]);
    const parserB: BrokerageNoteParserPort = {
      supports: jest.fn().mockReturnValue(true),
      parse: parseMock,
    };
    const strategy = new BrokerageNoteParserStrategy([parserA, parserB]);

    const result = await strategy.parse({
      broker: 'XP',
      fileType: 'csv',
      filePath: '/tmp/operations.csv',
    });

    expect(result[0]?.broker).toBe('XP');
    expect(parseMock).toHaveBeenCalledWith('/tmp/operations.csv');
  });

  it('throws when no parser supports input', async () => {
    const strategy = new BrokerageNoteParserStrategy([
      {
        supports: () => false,
        parse: () =>
          Promise.resolve([
            {
              tradeDate: '2025-01-01',
              broker: 'XP',
              sourceType: SourceType.Csv,
              totalOperationalCosts: 0,
              operations: [],
            },
          ]),
      },
    ]);

    await expect(
      strategy.parse({
        broker: 'XP',
        fileType: 'pdf',
        filePath: '/tmp/operations.pdf',
      }),
    ).rejects.toThrow('Unsupported parser for broker "XP" and file type "pdf".');
  });
});
