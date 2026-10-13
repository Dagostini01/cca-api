import { describe, expect, it, vi } from 'vitest';
import { InvalidTokenError, TokenVerifierUnavailableError } from '../../src/modules/identity/application/errors/token-verification-error.js';
import type { TokenVerifier } from '../../src/modules/identity/application/ports/token-verifier.js';
import { GetCurrentUser } from '../../src/modules/identity/application/use-cases/get-current-user.js';

describe('GetCurrentUser', () => {
  it('returns the user produced by the token verifier', async () => {
    const user = { id: 'sub-1', username: 'ana', email: 'ana@datasite.com.br' };
    const verifier: TokenVerifier = { verify: vi.fn(async () => user) };
    const useCase = new GetCurrentUser(verifier);

    await expect(useCase.execute('token-1')).resolves.toEqual(user);
    expect(verifier.verify).toHaveBeenCalledWith('token-1');
  });

  it('propagates an invalid token error', async () => {
    const verifier: TokenVerifier = { verify: async () => { throw new InvalidTokenError(); } };
    const useCase = new GetCurrentUser(verifier);

    await expect(useCase.execute('bad')).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('propagates verifier unavailability', async () => {
    const verifier: TokenVerifier = { verify: async () => { throw new TokenVerifierUnavailableError(); } };
    const useCase = new GetCurrentUser(verifier);

    await expect(useCase.execute('any')).rejects.toBeInstanceOf(TokenVerifierUnavailableError);
  });
});
