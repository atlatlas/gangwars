import { db, schema } from "../db";

export function logActivityEvent(
  userId: number,
  type: string,
  message: string,
  metadata?: Record<string, unknown>
): void {
  db.insert(schema.activityEvents).values({
    userId,
    type,
    message,
    metadata: metadata ? JSON.stringify(metadata) : null,
    createdAt: new Date().toISOString(),
  }).run();
}
