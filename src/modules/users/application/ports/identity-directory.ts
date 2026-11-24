export type DirectoryProfile = {
  nome: string;
  email: string;
  enabled: boolean;
};

export type DirectorySync = {
  nome: string;
  email?: string;
  enabled: boolean;
};

export interface IdentityDirectory {
  provision(profile: DirectoryProfile): Promise<{ id: string }>;
  assertExists(id: string): Promise<void>;
  sync(id: string, profile: DirectorySync): Promise<void>;
  remove(id: string): Promise<void>;
  issueTemporaryPassword(id: string, value: string): Promise<void>;
}
