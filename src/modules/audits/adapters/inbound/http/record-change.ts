import type { AuditChange, AuditRecorder } from '../../../application/ports/audit-recorder.js';

export async function recordChange(
  recorder: AuditRecorder | undefined,
  subject: string,
  change: Omit<AuditChange, 'subject'>,
): Promise<void> {
  if (recorder) await recorder.record({ subject, ...change });
}
