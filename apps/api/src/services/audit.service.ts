/**
 * Audit logging service
 * Records all user actions for compliance and debugging
 */

import { PrismaClient } from "@prisma/client";

export async function auditLog(
  prisma: PrismaClient,
  data: {
    tenantId?: string | null;
    actorId?: string | null;
    actorEmail?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: data.tenantId || null,
        actorId: data.actorId || null,
        actorEmail: data.actorEmail || null,
        action: data.action as string,
        entityType: data.entityType,
        entityId: data.entityId || null,
        oldValues: data.oldValues || null,
        newValues: data.newValues || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  } catch (error) {
    // Log but don't throw - audit logging should not break main flow
    console.error("Audit logging error:", error);
  }
}
