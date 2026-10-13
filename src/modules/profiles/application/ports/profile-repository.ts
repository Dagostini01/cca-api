import type { Profile, ProfileStatus } from '../../domain/profile.js';

export type NewProfile = {
  empresaId: string;
  nome: string;
  descricao: string | null;
  status: ProfileStatus;
};

export interface ProfileRepository {
  add(profile: NewProfile): Promise<Profile>;
  list(empresaId?: string): Promise<Profile[]>;
  findById(id: string): Promise<Profile | null>;
  save(profile: Profile): Promise<Profile>;
}
