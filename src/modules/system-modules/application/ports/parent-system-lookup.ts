export interface ParentSystemLookup {
  findById(id: number): Promise<{ id: number } | null>;
}
