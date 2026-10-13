export interface ParentCompanyLookup {
  findById(id: string): Promise<{ id: string } | null>;
}
