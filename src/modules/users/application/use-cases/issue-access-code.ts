import { randomInt } from 'node:crypto';
import type { BusinessUser } from '../../domain/user.js';
import { AccessCodeUnavailableError } from '../../domain/user-errors.js';
import type { IdentityDirectory } from '../ports/identity-directory.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GROUPS = 3;
const GROUP_LENGTH = 4;

export function generateAccessCode(): string {
  const groups: string[] = [];
  for (let group = 0; group < GROUPS; group += 1) {
    let chunk = '';
    for (let index = 0; index < GROUP_LENGTH; index += 1) chunk += ALPHABET[randomInt(ALPHABET.length)];
    groups.push(chunk);
  }
  return groups.join('-');
}

export class IssueAccessCode {
  constructor(
    private readonly directory?: IdentityDirectory,
    private readonly generate: () => string = generateAccessCode,
  ) {}

  async execute(user: BusinessUser): Promise<{ codigo: string }> {
    if (!this.directory || !user.keycloakSub || user.status !== 'ATIVADO') throw new AccessCodeUnavailableError();
    const codigo = this.generate();
    await this.directory.issueTemporaryPassword(user.keycloakSub, codigo);
    return { codigo };
  }
}
