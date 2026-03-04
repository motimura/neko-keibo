import * as Notifications from "expo-notifications";
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import { format } from "date-fns";
import { CATEGORY_EMOJI } from "./constants";
import { generateId } from "./id";

export async function initNotifications(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleReminder(
  itemName: string,
  categoryEmoji: string,
  days: number,
  expenseId?: string
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "🐱 猫計簿",
      body: `${categoryEmoji} ${itemName} そろそろ買い替え時です`,
      data: expenseId ? { expenseId } : undefined,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: days * 86400,
    },
  });
  return id;
}

export async function cancelReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function rescheduleReminder(
  oldNotificationId: string | null,
  itemName: string,
  categoryEmoji: string,
  days: number,
  expenseId?: string
): Promise<string> {
  if (oldNotificationId) {
    await cancelReminder(oldNotificationId).catch(() => {});
  }
  return scheduleReminder(itemName, categoryEmoji, days, expenseId);
}

export async function rescheduleAllReminders(db: SQLite.SQLiteDatabase): Promise<void> {
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of existing) {
    await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }

  const rows = await db.getAllAsync(
    `SELECT id, item_name, category, reminder_days, expense_date FROM expenses WHERE reminder_days IS NOT NULL ORDER BY expense_date DESC LIMIT 64`
  );

  for (const r of rows as Record<string, unknown>[]) {
    const itemName = r.item_name as string;
    const category = r.category as string;
    const reminderDays = r.reminder_days as number;
    const expenseId = r.id as string;
    const emoji = CATEGORY_EMOJI[category as keyof typeof CATEGORY_EMOJI] || "📦";

    try {
      const newId = await scheduleReminder(itemName, emoji, reminderDays, expenseId);
      await db.runAsync(
        `UPDATE expenses SET notification_id = ? WHERE id = ?`,
        [newId, expenseId]
      );
    } catch {}
  }
}

export async function checkDueNotifications(db: SQLite.SQLiteDatabase): Promise<number> {
  const today = format(new Date(), "yyyy-MM-dd");

  const rows = await db.getAllAsync(
    `SELECT e.id, e.category, e.item_name, e.amount, e.reminder_days
     FROM expenses e
     WHERE e.reminder_days IS NOT NULL
       AND date(e.expense_date, '+' || e.reminder_days || ' days') <= date(?)
       AND NOT EXISTS (
         SELECT 1 FROM notifications n WHERE n.expense_id = e.id
       )`,
    [today]
  );

  let count = 0;
  for (const r of rows as Record<string, unknown>[]) {
    await db.runAsync(
      `INSERT INTO notifications (id, expense_id, category, item_name, amount, reminder_days, notified_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        generateId(),
        r.id as string,
        r.category as string,
        r.item_name as string,
        r.amount as number,
        r.reminder_days as number,
        new Date().toISOString(),
      ]
    );
    count++;
  }
  return count;
}

export function setupNotificationReceivedListener(
  db: SQLite.SQLiteDatabase,
  onNewNotification?: () => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(async (event) => {
    const expenseId = event.request.content.data?.expenseId as string | undefined;
    if (!expenseId) return;

    const row = await db.getFirstAsync(
      `SELECT id, category, item_name, amount, reminder_days FROM expenses WHERE id = ?`,
      [expenseId]
    );
    if (!row) return;
    const r = row as Record<string, unknown>;

    const existing = await db.getFirstAsync(
      `SELECT 1 FROM notifications WHERE expense_id = ?`,
      [expenseId]
    );
    if (existing) return;

    await db.runAsync(
      `INSERT INTO notifications (id, expense_id, category, item_name, amount, reminder_days, notified_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        generateId(),
        expenseId,
        r.category as string,
        r.item_name as string,
        r.amount as number,
        r.reminder_days as number,
        new Date().toISOString(),
      ]
    );
    onNewNotification?.();
  });
}
