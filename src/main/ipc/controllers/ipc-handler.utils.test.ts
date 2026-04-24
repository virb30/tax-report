import { describe, expect, it } from '@jest/globals';
import { z } from 'zod';
import { buildIpcErrorMessage, parseIpcPayload } from './ipc-handler.utils';

describe('ipc-handler utils', () => {
  it('parses object payloads and returns first zod issue message', () => {
    const schema = z.object({
      baseYear: z.number().int('Ano inválido.'),
    });

    expect(parseIpcPayload(schema, { baseYear: 2025 })).toEqual({ baseYear: 2025 });
    expect(() =>
      parseIpcPayload(schema, { baseYear: '2025' }, { payloadErrorMessage: 'Payload inválido.' }),
    ).toThrow('Invalid input: expected number, received string');
    expect(() =>
      parseIpcPayload(schema, null, { payloadErrorMessage: 'Payload inválido.' }),
    ).toThrow('Payload inválido.');
  });

  it('supports optional payloads when object input is not required', () => {
    const schema = z
      .object({
        activeOnly: z.boolean().optional(),
      })
      .optional()
      .catch(undefined);

    expect(parseIpcPayload(schema, undefined, { requireObjectInput: false })).toBeUndefined();
  });

  it('preserves non-zod errors raised while parsing payloads', () => {
    const schema = z.object({ value: z.string() }).transform(() => {
      throw new TypeError('Falha inesperada.');
    });

    expect(() => parseIpcPayload(schema, { value: 'payload' })).toThrow('Falha inesperada.');
  });

  it('formats generic errors and unknown values with the right message', () => {
    expect(buildIpcErrorMessage(new Error('Falha explícita.'))).toBe('Falha explícita.');
    expect(buildIpcErrorMessage('erro-desconhecido', 'Fallback padrão.')).toBe('Fallback padrão.');
  });

  it('falls back to zod and payload default messages when specific messages are absent', () => {
    expect(buildIpcErrorMessage(new z.ZodError([]))).toBe('[]');
    expect(() => parseIpcPayload(z.object({ value: z.string() }), undefined)).toThrow(
      'Invalid IPC payload.',
    );
  });
});
