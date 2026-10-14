export type DirectoryProfile = {
  nome: string;
  email: string;
  enabled: boolean;
};

export interface IdentityDirectory {
  provision(profile: DirectoryProfile): Promise<{ id: string }>;
  assertExists(id: string): Promise<void>;
  sync(id: string, profile: DirectoryProfile): Promise<void>;
  remove(id: string): Promise<void>;
}
