export interface AccessPartyLookup {
  findById(id: string): Promise<{ id: string; empresaId: string } | null>;
}
