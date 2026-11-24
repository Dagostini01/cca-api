import type { ScreenDraft } from '../../../accesses/application/ports/access-repository.js';
import type { BusinessUser } from '../../domain/user.js';
import type { NewBusinessUser } from './user-repository.js';

export interface UserRegistrar {
  register(user: NewBusinessUser, screens: ScreenDraft[]): Promise<BusinessUser>;
}
