import { Uuid } from "./uuid.vo";

describe('Uuid', () => {
  it('should create a valid UUID', () => {
    const uuid = Uuid.create();
    expect(uuid.value).toBeDefined();
  });

  it('should create a valid UUID from a string', () => {
    const validUuid = '019c5d29-fa57-735e-ba78-acc07b179392';
    const uuid = Uuid.from(validUuid);
    expect(uuid.value).toBe(validUuid);
  });

  it('should throw an error if the UUID is invalid', () => {
    expect(() => Uuid.from('invalid')).toThrow('Invalid UUID: invalid');
  });

  it('should throw an error if the UUID version is invalid', () => {
    const invalidUuidVersion = '019c5d29-fa57-435e-ba78-acc07b179392';
    expect(() => Uuid.from(invalidUuidVersion)).toThrow(`Invalid UUID version: ${invalidUuidVersion}`);
  });
});