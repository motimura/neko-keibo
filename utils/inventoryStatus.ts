import * as SQLite from "expo-sqlite";
import * as Notifications from "expo-notifications";
import { differenceInDays, addDays } from "date-fns";
import type { InventoryStatus } from "../types/inventory";
import { INVENTORY_STATUS_THRESHOLD_DAYS } from "./constants";

const STATUS_SEVERITY: Record<InventoryStatus, number> = {
  sufficient: 0,
  low: 1,
  critical: 2,
};

export function calculateStatus(
  lastPurchasedAt: string,
  avgDays: number,
  today: Date = new Date()
): InventoryStatus {
  const nextDate = addDays(new Date(lastPurchasedAt), avgDays);
  const remaining = differenceInDays(nextDate, today);

  if (remaining <= 0) return "critical";
  if (remaining <= INVENTORY_STATUS_THRESHOLD_DAYS) return "low";
  return "sufficient";
}

export async function refreshAllInventoryStatuses(
  db: SQLite.SQLiteDatabase
): Promise<number> {
  const rows = await db.getAllAsync(
    `SELECT inv.id, inv.item_name, inv.last_purchased_at, inv.status, e.reminder_days
     FROM inventory inv
     INNER JOIN expenses e ON e.inventory_id = inv.id
     WHERE inv.last_purchased_at IS NOT NULL
       AND e.reminder_days IS NOT NULL
       AND e.id = (
         SELECT e2.id FROM expenses e2
         WHERE e2.inventory_id = inv.id AND e2.reminder_days IS NOT NULL
         ORDER BY e2.expense_date DESC, e2.created_at DESC LIMIT 1
       )`
  );

  const today = new Date();
  let updatedCount = 0;

  for (const r of rows as Record<string, unknown>[]) {
    const newStatus = calculateStatus(
      r.last_purchased_at as string,
      r.reminder_days as number,
      today
    );
    if (newStatus !== r.status) {
      await db.runAsync(
        `UPDATE inventory SET status = ?, updated_at = ? WHERE id = ?`,
        [newStatus, new Date().toISOString(), r.id as string]
      );
      updatedCount++;

      const oldSeverity = STATUS_SEVERITY[r.status as InventoryStatus] ?? 0;
      const newSeverity = STATUS_SEVERITY[newStatus];
      if (newSeverity > oldSeverity && (newStatus === "low" || newStatus === "critical")) {
        const itemName = r.item_name as string;
        const body =
          newStatus === "low"
            ? `🟡 ${itemName} そろそろ買い替え時です`
            : `🔴 ${itemName} 切れそうです！`;
        try {
          await Notifications.scheduleNotificationAsync({
            content: { title: "🐱 猫計簿", body },
            trigger: null,
          });
        } catch {
          // 通知スケジュール失敗は在庫ステータス更新に影響させない
        }
      }
    }
  }

  return updatedCount;
}
