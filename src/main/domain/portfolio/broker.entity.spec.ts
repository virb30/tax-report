import { Uuid } from "../shared/uuid.vo";
import { Broker } from "./broker.entity";
import { Cnpj } from "../shared/cnpj.vo";

describe('BrokerEntity', () => {
  it('should create a broker', () => {
    const broker = Broker.create({
      name: 'Broker 1',
      cnpj: new Cnpj('12345678901214'),
      code: '1234567890',
    });

    expect(broker.id).toBeDefined();
    expect(broker.name).toBe('Broker 1');
    expect(broker.cnpj.value).toBe('12.345.678/9012-14');
    expect(broker.code).toBe('1234567890');
    expect(broker.isActive()).toBe(true);
  });

  it('should restore a broker', () => {
    const uuid = Uuid.create();
    const broker = Broker.restore({ id: uuid, name: 'Broker 1', cnpj: new Cnpj('12345678901214'), code: '1234567890', active: true });
    expect(broker.id).toBe(uuid.value);
    expect(broker.name).toBe('Broker 1');
    expect(broker.cnpj.value).toBe('12.345.678/9012-14');
    expect(broker.code).toBe('1234567890');
    expect(broker.isActive()).toBe(true);
  });

  it('should throw an error if the name is empty', () => {
    expect(() => Broker.create({ name: '', cnpj: new Cnpj('12345678901214'), code: '1234567890' })).toThrow('Nome da corretora e obrigatorio.');
  });

  it('should throw an error if the code is empty', () => {
    expect(() => Broker.create({ name: 'Broker 1', cnpj: new Cnpj('12345678901214'), code: '' })).toThrow('Código da corretora e obrigatorio.');
  });

});