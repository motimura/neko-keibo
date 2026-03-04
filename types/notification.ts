import type { ExpenseCategory } from "./expense";

export const NOTIFICATION_STATUSES = ["pending", "purchased", "dismissed"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface NotificationRecord {
  id: string;
  expenseId: string;
  category: ExpenseCategory;
  itemName: string;
  amount: number;
  reminderDays: number;
  notifiedAt: string;
  status: NotificationStatus;
  actedAt: string | null;
}

export interface CreateNotificationInput {
  expenseId: string;
  category: ExpenseCategory;
  itemName: string;
  amount: number;
  reminderDays: number;
  notifiedAt: string;
}
