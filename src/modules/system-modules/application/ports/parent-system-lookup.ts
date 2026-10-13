export interface ParentSystemLookup {
  findById(id: string): Promise<{ id: string } | null>;
}
