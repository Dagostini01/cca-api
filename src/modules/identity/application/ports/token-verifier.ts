import type { AuthenticatedUser } from '../../domain/entities/authenticated-user.js';

export interface TokenVerifier {
  verify(token: string): Promise<AuthenticatedUser>;
}
