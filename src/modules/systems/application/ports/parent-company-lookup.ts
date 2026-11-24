export interface ParentCompanyLookup {
  findById(id: number): Promise<{ id: number } | null>;
}
