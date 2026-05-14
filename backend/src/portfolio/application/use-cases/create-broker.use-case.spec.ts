import type { BrokerRepository } from '../repositories/broker.repository';
import { mock, mockReset } from 'jest-mock-extended';
import { CreateBrokerUseCase } from './create-broker.use-case';
import { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';
import { Broker } from '../../domain/entities/broker.entity';

describe('CreateBrokerUseCase', () => {
  const brokerRepository = mock<BrokerRepository>();
  let useCase: CreateBrokerUseCase;

  beforeEach(() => {
    mockReset(brokerRepository);
    brokerRepository.findByCode.mockResolvedValue(null);
    brokerRepository.findByCnpj.mockResolvedValue(null);
    brokerRepository.save.mockResolvedValue(undefined);
    useCase = new CreateBrokerUseCase(brokerRepository);
  });

  it('should create broker successfully', async () => {
    const result = await useCase.execute({
      name: 'Nova Corretora',
      code: 'NOVA',
      cnpj: '12.345.678/0001-90',
    });

    expect(result.name).toBe('Nova Corretora');
    expect(result.cnpj).toBe('12.345.678/0001-90');
    expect(result.code).toBe('NOVA');
    expect(result.active).toBe(true);
    expect(result.id).toBeDefined();
    expect(brokerRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw an error when name is empty', async () => {
    await expect(
      useCase.execute({ name: '   ', code: 'XP', cnpj: '12.345.678/0001-90' }),
    ).rejects.toThrow(new Error('Nome da corretora e obrigatorio.'));
    expect(brokerRepository.save).not.toHaveBeenCalled();
  });

  it('should throw an error when CNPJ is duplicated', async () => {
    const existingBroker = Broker.create({
      name: 'XP',
      cnpj: new Cnpj('02.332.886/0001-04'),
      code: 'XP',
    });
    brokerRepository.findByCnpj.mockResolvedValue(existingBroker);
    await expect(
      useCase.execute({ name: 'Outra Corretora', code: 'OUTRA', cnpj: '02.332.886/0001-04' }),
    ).rejects.toThrow(new Error('CNPJ já cadastrado para outra corretora.'));
  });
});
