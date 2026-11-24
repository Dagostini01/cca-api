export interface ParentModuleLookup {
  findById(id: number): Promise<{ id: number } | null>;
}
