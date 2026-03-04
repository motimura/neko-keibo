import { create } from "zustand";
import { format } from "date-fns";
import type { NotificationRecord } from "../types/notification";
import {
  getPendingNotifications,
  getNotificationCount,
  updateNotificationStatus,
} from "../db/notifications";
import { createExpense } from "../db/expenses";
import { scheduleReminder, cancelReminder } from "../utils/notifications";
import { CATEGORY_EMOJI } from "../utils/constants";
import { useExpenseStore } from "./useExpenseStore";
import { useInventoryStore } from "./useInventoryStore";

interface NotificationStore {
  notifications: NotificationRecord[];
  pendingCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchPendingCount: () => Promise<void>;
  repurchase: (notification: NotificationRecord) => Promise<void>;
  dismiss: (id: string, expenseId?: string) => Promise<void>;
}

function getDb() {
  return useExpenseStore.getState().db;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  pendingCount: 0,
  loading: false,

  fetchNotifications: async () => {
    const db = getDb();
    if (!db) return;
    set({ loading: true });
    try {
      const notifications = await getPendingNotifications(db);
      set({ notifications, pendingCount: notifications.length });
    } finally {
      set({ loading: false });
    }
  },

  fetchPendingCount: async () => {
    const db = getDb();
    if (!db) return;
    const pendingCount = await getNotificationCount(db);
    set({ pendingCount });
  },

  repurchase: async (notification: NotificationRecord) => {
    const db = getDb();
    if (!db) throw new Error("DB not initialized");

    const today = format(new Date(), "yyyy-MM-dd");
    const emoji = CATEGORY_EMOJI[notification.category] || "📦";

    const expense = await createExpense(db, {
      category: notification.category,
      amount: notification.amount,
      itemName: notification.itemName,
      expenseDate: today,
      reminderDays: notification.reminderDays,
    });

    const newNotificationId = await scheduleReminder(
      notification.itemName,
      emoji,
      notification.reminderDays,
      expense.id
    );

    await db.runAsync(
      `UPDATE expenses SET notification_id = ?, updated_at = ? WHERE id = ?`,
      [newNotificationId, new Date().toISOString(), expense.id]
    );

    await updateNotificationStatus(db, notification.id, "purchased");

    await useInventoryStore
      .getState()
      .linkPurchase(notification.itemName, notification.category, today);

    await get().fetchNotifications();
  },

  dismiss: async (id: string, expenseId?: string) => {
    const db = getDb();
    if (!db) throw new Error("DB not initialized");

    if (expenseId) {
      const row = await db.getFirstAsync(
        `SELECT notification_id FROM expenses WHERE id = ?`,
        [expenseId]
      );
      if (row) {
        const notifId = (row as Record<string, unknown>).notification_id as string | null;
        if (notifId) {
          await cancelReminder(notifId).catch(() => {});
        }
      }
      await db.runAsync(
        `UPDATE expenses SET reminder_days = NULL, notification_id = NULL, updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), expenseId]
      );
    }

    await updateNotificationStatus(db, id, "dismissed");
    await get().fetchNotifications();
  },
}));
