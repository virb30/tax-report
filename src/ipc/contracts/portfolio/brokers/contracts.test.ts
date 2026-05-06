import {
  brokerIpcContracts,
  createBrokerSchema,
  listBrokersContract,
  listBrokersSchema,
  toggleActiveBrokerSchema,
  updateBrokerSchema,
} from './contracts';

describe('portfolio broker contracts', () => {
  it('preserves broker channel metadata', () => {
    expect(
      brokerIpcContracts.map((contract) => ({
        apiName: contract.api?.name,
        channel: contract.channel,
        id: contract.id,
      })),
    ).toEqual([
      { apiName: 'listBrokers', channel: 'brokers:list', id: 'brokers.list' },
      { apiName: 'createBroker', channel: 'brokers:create', id: 'brokers.create' },
      { apiName: 'updateBroker', channel: 'brokers:update', id: 'brokers.update' },
      {
        apiName: 'toggleBrokerActive',
        channel: 'brokers:toggle-active',
        id: 'brokers.toggleActive',
      },
    ]);
    expect(listBrokersContract.errorMode).toBe('throw');
  });

  it('validates optional list broker filters', () => {
    expect(listBrokersSchema.parse(undefined)).toBeUndefined();
    expect(listBrokersSchema.parse({ activeOnly: true })).toEqual({ activeOnly: true });
  });

  it('accepts code and legacy codigo create broker payloads', () => {
    expect(
      createBrokerSchema.parse({
        name: 'XP',
        cnpj: '11.111.111/0001-11',
        code: 'xp',
      }),
    ).toEqual({
      name: 'XP',
      cnpj: '11.111.111/0001-11',
      code: 'xp',
    });
    expect(
      createBrokerSchema.parse({
        name: 'Clear',
        cnpj: '22.222.222/0001-22',
        codigo: 'clear',
      }),
    ).toEqual({
      name: 'Clear',
      cnpj: '22.222.222/0001-22',
      code: 'clear',
    });
    expect(() => createBrokerSchema.parse({ name: 'XP', cnpj: '11.111.111/0001-11' })).toThrow();
  });

  it('validates update and toggle broker payloads', () => {
    expect(updateBrokerSchema.parse({ id: ' broker-xp ', name: 'XP Investimentos' })).toEqual({
      id: 'broker-xp',
      name: 'XP Investimentos',
    });
    expect(toggleActiveBrokerSchema.parse({ id: ' broker-xp ' })).toEqual({ id: 'broker-xp' });
    expect(() => toggleActiveBrokerSchema.parse({ id: ' ' })).toThrow();
  });
});
