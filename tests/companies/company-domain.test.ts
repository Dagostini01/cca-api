import { describe, expect, it } from 'vitest';
import { isValidCnpj } from '../../src/modules/companies/domain/cnpj.js';
import { normalizeCnpj, normalizeCompanyName } from '../../src/modules/companies/domain/company.js';
import { InvalidCompanyDocumentError, InvalidCompanyNameError } from '../../src/modules/companies/domain/company-errors.js';

describe('company document', () => {
  it('accepts a formatted CNPJ and stores only the digits', () => {
    expect(isValidCnpj('11222333000181')).toBe(true);
    expect(isValidCnpj('04252011000110')).toBe(true);
    expect(normalizeCnpj('11.222.333/0001-81')).toBe('11222333000181');
  });

  it('rejects repeated digits, wrong check digits and a blank document', () => {
    expect(isValidCnpj('11111111111111')).toBe(false);
    expect(isValidCnpj('11222333000180')).toBe(false);
    expect(() => normalizeCnpj('11.222.333/0001-80')).toThrow(InvalidCompanyDocumentError);
    expect(() => normalizeCnpj('   ')).toThrow(InvalidCompanyDocumentError);
    expect(normalizeCnpj(null)).toBeNull();
    expect(normalizeCnpj(undefined)).toBeNull();
  });

  it('trims the name and rejects an empty name', () => {
    expect(normalizeCompanyName('  Datasite  ')).toBe('Datasite');
    expect(() => normalizeCompanyName('   ')).toThrow(InvalidCompanyNameError);
    expect(() => normalizeCompanyName('a'.repeat(129))).toThrow(InvalidCompanyNameError);
  });
});
