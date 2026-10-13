export interface ParentModuleLookup {
  findById(id: string): Promise<{ id: string } | null>;
}
