import { SystemCompanyNotFoundError } from '../../domain/system-errors.js';
import type { ParentCompanyLookup } from '../ports/parent-company-lookup.js';

export async function resolveCompanyIds(ids: number[], companies?: ParentCompanyLookup): Promise<number[]> {
  const unique = [...new Set(ids)].sort((left, right) => left - right);
  if (companies) {
    for (const id of unique) {
      if (!(await companies.findById(id))) throw new SystemCompanyNotFoundError();
    }
  }
  return unique;
}
