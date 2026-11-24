export interface ParentMenuLookup {
  findById(id: number): Promise<{ id: number } | null>;
}
