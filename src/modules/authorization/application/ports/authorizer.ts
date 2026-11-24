export interface Authorizer {
  assertCatalog(subject: string): Promise<void>;
  assertCanManageUser(subject: string, userId: number): Promise<void>;
  assertScreen(subject: string, submenuId: number): Promise<void>;
}
