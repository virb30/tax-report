
import { mock, mockReset } from 'jest-mock-extended';
import type { BrokerRepository } from '../../repositories/broker.repository';
import { UpdateBrokerUseCase } from './update-broker.use-case';
import { Uuid } from '../../../domain/shared/uuid.vo';
import { Broker } from '../../../domain/portfolio/entities/broker.entity';
import { Cnpj } from '../../../domain/shared/cnpj.vo';

describe('UpdateBrokerUseCase', () => {
  const brokerRepository = mock<BrokerRepository>();
  let useCase: UpdateBrokerUseCase;

  beforeEach(() => {
    mockReset(brokerRepository);
    brokerRepository.findById.mockResolvedValue(null);
    brokerRepository.update.mockResolvedValue(undefined);
    useCase = new UpdateBrokerUseCase(brokerRepository);
  });

  it('should update broker successfully', async () => {
    const id = Uuid.create();
    const existing = Broker.restore({ id, name: 'XP', cnpj: new Cnpj('02.332.886/0001-04'), code: 'XP', active: true });
    brokerRepository.findById.mockResolvedValue(existing);
    const result = await useCase.execute({
      id: id.value,
      name: 'XP Investimentos',
      code: 'XPInc',
    });

    expect(result.id).toBe(id.value);
    expect(result.name).toBe('XP Investimentos');
    expect(result.cnpj).toBe('02.332.886/0001-04');
    expect(result.code).toBe('XPINC');
    expect(result.active).toBe(true);

    expect(brokerRepository.update).toHaveBeenCalledWith(existing);
  });

  it('should throw an error if the broker is not found', async () => {
    const id = Uuid.create();
    await expect(() => useCase.execute({ id: id.value, name: '   ' })).rejects.toThrow(new Error('Corretora nao encontrada.'));
  });

  it('should throw an error when CNPJ is duplicated by another broker', async () => {
    const existingBroker = Broker.create({
      name: 'XP',
      cnpj: new Cnpj('02.332.886/0001-04'),
      code: 'XP',
    });
    const otherBroker = Broker.create({
      name: 'Clear',
      cnpj: new Cnpj('02.332.886/0011-78'),
      code: 'CLEAR',
    });
    brokerRepository.findById.mockResolvedValue(existingBroker);
    brokerRepository.findByCnpj.mockResolvedValue(otherBroker);
    await expect(useCase.execute({ id: existingBroker.id.value, cnpj: otherBroker.cnpj.value })).rejects.toThrow(new Error('CNPJ ja cadastrado para outra corretora.'));
  });

  it('update does not fail when CNPJ is same as own broker', async () => {
    const existingBroker = Broker.create({
      name: 'XP',
      cnpj: new Cnpj('02.332.886/0001-04'),
      code: 'XP',
    });
    brokerRepository.findById.mockResolvedValue(existingBroker);
    brokerRepository.findByCnpj.mockResolvedValue(existingBroker);
    const result = await useCase.execute({ id: existingBroker.id.value, cnpj: existingBroker.cnpj.value, name: 'XP Investimentos' });
    expect(result.id).toBe(existingBroker.id.value);
    expect(result.name).toBe('XP Investimentos');
    expect(result.cnpj).toBe(existingBroker.cnpj.value);
    expect(result.code).toBe(existingBroker.code);
    expect(result.active).toBe(true);
    expect(brokerRepository.update).toHaveBeenCalledWith(existingBroker);
  });

  it('should throw an error when code is duplicated by another broker', async () => {
    const existingBroker = Broker.create({
      name: 'XP',
      cnpj: new Cnpj('02.332.886/0001-04'),
      code: 'XP',
    });
    const otherBroker = Broker.create({
      name: 'Test',
      cnpj: new Cnpj('02.332.886/0011-78'),
      code: 'TST',
    });
    brokerRepository.findById.mockResolvedValue(existingBroker);
    brokerRepository.findByCode.mockResolvedValue(otherBroker);
    await expect(useCase.execute({ id: existingBroker.id.value, code: otherBroker.code })).rejects.toThrow(new Error('Código ja cadastrado para outra corretora.'));
  });

  it('update does not fail when code is same as own broker', async () => {
    const existingBroker = Broker.create({
      name: 'XP',
      cnpj: new Cnpj('02.332.886/0001-04'),
      code: 'XP',
    });
    brokerRepository.findById.mockResolvedValue(existingBroker);
    brokerRepository.findByCode.mockResolvedValue(existingBroker);
    const result = await useCase.execute({ id: existingBroker.id.value, code: existingBroker.code });
    expect(result.id).toBe(existingBroker.id.value);
    expect(result.name).toBe('XP');
    expect(result.cnpj).toBe(existingBroker.cnpj.value);
    expect(result.code).toBe(existingBroker.code);
    expect(result.active).toBe(true);
    expect(brokerRepository.update).toHaveBeenCalledWith(existingBroker);
  });
});
