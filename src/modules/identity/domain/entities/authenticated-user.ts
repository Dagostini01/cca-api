export interface AuthenticatedUser {
  readonly id: string;
  readonly username?: string;
  readonly email?: string;
}
