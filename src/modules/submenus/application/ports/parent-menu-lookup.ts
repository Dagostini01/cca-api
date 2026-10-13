export interface ParentMenuLookup {
  findById(id: string): Promise<{ id: string } | null>;
}
