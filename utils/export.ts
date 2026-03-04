import { File, Paths } from "expo-file-system";
import { shareAsync } from "expo-sharing";
import * as SQLite from "expo-sqlite";
import { format } from "date-fns";
import { CATEGORY_LABELS } from "./constants";
import type { Expense, ExpenseCategory } from "../types/expense";
import type { InventoryItem } from "../types/inventory";
import type { NotificationRecord } from "../types/notification";

interface ExportData {
  version: string;
  exportedAt: string;
  data: {
    expenses: ExportExpense[];
    inventory: ExportInventory[];
    notifications: ExportNotification[];
  };
}

interface ExportExpense {
  id: string;
  category: string;
  amount: number;
  itemName: string;
  expenseDate: string;
  memo: string;
  inventoryId: string | null;
  reminderDays: number | null;
  createdAt: string;
  updatedAt: string;
}

interface ExportInventory {
  id: string;
  itemName: string;
  category: string;
  status: string;
  lastPurchasedAt: string | null;
  averageConsumptionDays: number | null;
  nextPurchaseDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ExportNotification {
  id: string;
  expenseId: string;
  category: string;
  itemName: string;
  amount: number;
  reminderDays: number;
  notifiedAt: string;
  status: string;
  actedAt: string | null;
}

function expenseToExport(e: Expense): ExportExpense {
  return {
    id: e.id,
    category: e.category,
    amount: e.amount,
    itemName: e.itemName,
    expenseDate: e.expenseDate,
    memo: e.memo,
    inventoryId: e.inventoryId,
    reminderDays: e.reminderDays,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function inventoryToExport(i: InventoryItem): ExportInventory {
  return {
    id: i.id,
    itemName: i.itemName,
    category: i.category,
    status: i.status,
    lastPurchasedAt: i.lastPurchasedAt,
    averageConsumptionDays: i.averageConsumptionDays,
    nextPurchaseDate: i.nextPurchaseDate,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

function notificationToExport(n: NotificationRecord): ExportNotification {
  return {
    id: n.id,
    expenseId: n.expenseId,
    category: n.category,
    itemName: n.itemName,
    amount: n.amount,
    reminderDays: n.reminderDays,
    notifiedAt: n.notifiedAt,
    status: n.status,
    actedAt: n.actedAt,
  };
}

export function buildExportJSON(
  expenses: Expense[],
  inventory: InventoryItem[],
  notifications: NotificationRecord[]
): ExportData {
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    data: {
      expenses: expenses.map(expenseToExport),
      inventory: inventory.map(inventoryToExport),
      notifications: notifications.map(notificationToExport),
    },
  };
}

export function buildExportCSV(expenses: Expense[]): string {
  const BOM = "\uFEFF";
  const header = "日付,カテゴリ,品名,金額,メモ";
  const rows = expenses.map((e) => {
    const label = CATEGORY_LABELS[e.category] || e.category;
    const escapedName = csvEscape(e.itemName);
    const escapedMemo = csvEscape(e.memo);
    return `${e.expenseDate},${label},${escapedName},${e.amount},${escapedMemo}`;
  });
  return BOM + [header, ...rows].join("\n");
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function getAllExpenses(db: SQLite.SQLiteDatabase): Promise<Expense[]> {
  const rows = await db.getAllAsync(
    `SELECT * FROM expenses ORDER BY expense_date DESC, created_at DESC`
  );
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    category: row.category as ExpenseCategory,
    amount: row.amount as number,
    itemName: row.item_name as string,
    expenseDate: row.expense_date as string,
    memo: (row.memo as string) || "",
    inventoryId: (row.inventory_id as string) || null,
    reminderDays: (row.reminder_days as number) ?? null,
    notificationId: (row.notification_id as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

async function getAllInventory(db: SQLite.SQLiteDatabase): Promise<InventoryItem[]> {
  const rows = await db.getAllAsync(`SELECT * FROM inventory ORDER BY updated_at DESC`);
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    itemName: row.item_name as string,
    category: row.category as ExpenseCategory,
    status: row.status as InventoryItem["status"],
    lastPurchasedAt: (row.last_purchased_at as string) || null,
    averageConsumptionDays: (row.average_consumption_days as number) ?? null,
    nextPurchaseDate: (row.next_purchase_date as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

async function getAllNotifications(db: SQLite.SQLiteDatabase): Promise<NotificationRecord[]> {
  const rows = await db.getAllAsync(`SELECT * FROM notifications ORDER BY notified_at DESC`);
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    expenseId: row.expense_id as string,
    category: row.category as ExpenseCategory,
    itemName: row.item_name as string,
    amount: row.amount as number,
    reminderDays: row.reminder_days as number,
    notifiedAt: row.notified_at as string,
    status: row.status as NotificationRecord["status"],
    actedAt: (row.acted_at as string) || null,
  }));
}

export async function exportToJSON(db: SQLite.SQLiteDatabase): Promise<void> {
  const [expenses, inventory, notifications] = await Promise.all([
    getAllExpenses(db),
    getAllInventory(db),
    getAllNotifications(db),
  ]);

  const data = buildExportJSON(expenses, inventory, notifications);
  const json = JSON.stringify(data, null, 2);
  const fileName = `neko-keibo-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
  const file = new File(Paths.cache, fileName);

  file.write(json);
  await shareAsync(file.uri, {
    mimeType: "application/json",
    dialogTitle: "猫計簿バックアップ",
    UTI: "public.json",
  });
}

export async function exportToCSV(db: SQLite.SQLiteDatabase): Promise<void> {
  const expenses = await getAllExpenses(db);
  const csv = buildExportCSV(expenses);
  const fileName = `neko-keibo-backup-${format(new Date(), "yyyy-MM-dd")}.csv`;
  const file = new File(Paths.cache, fileName);

  file.write(csv);
  await shareAsync(file.uri, {
    mimeType: "text/csv",
    dialogTitle: "猫計簿 CSVエクスポート",
    UTI: "public.comma-separated-values-text",
  });
}

export async function getDataCounts(
  db: SQLite.SQLiteDatabase
): Promise<{ expenses: number; inventory: number; notifications: number }> {
  const [e, i, n] = await Promise.all([
    db.getFirstAsync(`SELECT COUNT(*) as c FROM expenses`),
    db.getFirstAsync(`SELECT COUNT(*) as c FROM inventory`),
    db.getFirstAsync(`SELECT COUNT(*) as c FROM notifications`),
  ]);
  return {
    expenses: (e as Record<string, unknown>).c as number,
    inventory: (i as Record<string, unknown>).c as number,
    notifications: (n as Record<string, unknown>).c as number,
  };
}

export async function clearAllData(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    DELETE FROM notifications;
    DELETE FROM inventory;
    DELETE FROM expenses;
  `);
}
