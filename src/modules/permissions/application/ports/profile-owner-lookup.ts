export interface ProfileOwnerLookup {
  findById(id: string): Promise<{ id: string; empresaId: string } | null>;
}
