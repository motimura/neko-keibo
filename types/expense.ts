export const EXPENSE_CATEGORIES = [
  "food",
  "litter",
  "medical",
  "toy",
  "goods",
  "grooming",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  itemName: string;
  expenseDate: string;
  memo: string;
  inventoryId: string | null;
  reminderDays: number | null;
  notificationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  category: ExpenseCategory;
  amount: number;
  itemName: string;
  expenseDate: string;
  memo?: string;
  inventoryId?: string;
  reminderDays?: number;
  notificationId?: string;
}

export interface UpdateExpenseInput {
  category?: ExpenseCategory;
  amount?: number;
  itemName?: string;
  expenseDate?: string;
  memo?: string;
  reminderDays?: number | null;
  notificationId?: string | null;
}

export interface DashboardSummary {
  month: string;
  totalAmount: number;
  byCategory: Partial<Record<ExpenseCategory, number>>;
  comparedToPrevMonth: {
    diff: number;
    percentage: number;
  } | null;
}
