import { Cnpj } from "./cnpj.vo";

describe('Cnpj', () => {
  it('should create a valid CNPJ', () => {
    const cnpj = new Cnpj('12345678901214');
    expect(cnpj.rawValue).toBe('12345678901214');
    expect(cnpj.value).toBe('12.345.678/9012-14');
  });

  it('should throw an error if the CNPJ is invalid', () => {
    expect(() => new Cnpj('1234567890121')).toThrow('CNPJ inválido.');
  });
});