import type { TokenVerifier } from '../ports/token-verifier.js';

export class GetCurrentUser {
  constructor(private readonly verifier: TokenVerifier) {}
  execute(token: string) {
    return this.verifier.verify(token);
  }
}
