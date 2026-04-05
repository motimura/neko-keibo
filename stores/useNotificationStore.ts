import { create } from "zustand";
import { format } from "date-fns";
import type { NotificationRecord } from "../types/notification";
import {
  getPendingNotifications,
  getNotificationCount,
  updateNotificationStatus,
  snoozeNotification,
} from "../db/notifications";
import { createExpense, updateExpense } from "../db/expenses";
import { scheduleReminder, cancelReminder } from "../utils/notifications";
import { CATEGORY_EMOJI } from "../utils/constants";
import { useExpenseStore } from "./useExpenseStore";
import { useInventoryStore } from "./useInventoryStore";

interface NotificationStore {
  notifications: NotificationRecord[];
  pendingCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  fetchPendingCount: () => Promise<void>;
  repurchase: (notification: NotificationRecord) => Promise<void>;
  snooze: (id: string, days: number) => Promise<void>;
  dismiss: (id: string, expenseId?: string) => Promise<void>;
}

function getDb() {
  return useExpenseStore.getState().db;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  pendingCount: 0,
  loading: false,
  error: null,

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

    try {
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

      if (newNotificationId) {
        await updateExpense(db, expense.id, { notificationId: newNotificationId });
      }

      await updateNotificationStatus(db, notification.id, "purchased");

      await useInventoryStore
        .getState()
        .linkPurchase(notification.itemName, notification.category, today);

      await get().fetchNotifications();
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  snooze: async (id: string, days: number) => {
    const db = getDb();
    if (!db) throw new Error("DB not initialized");
    try {
      await snoozeNotification(db, id, days);
      await get().fetchNotifications();
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  dismiss: async (id: string, expenseId?: string) => {
    const db = getDb();
    if (!db) throw new Error("DB not initialized");

    try {
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
        await updateExpense(db, expenseId, { reminderDays: null, notificationId: null });
      }

      await updateNotificationStatus(db, id, "dismissed");
      await get().fetchNotifications();
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },
}));
