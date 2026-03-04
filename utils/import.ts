import { getDocumentAsync } from "expo-document-picker";
import { File } from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { CATEGORY_LABELS } from "./constants";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "../types/expense";
import { INVENTORY_STATUSES } from "../types/inventory";
import { NOTIFICATION_STATUSES } from "../types/notification";
import { generateId } from "./id";

const LABEL_TO_CATEGORY: Record<string, ExpenseCategory> = Object.fromEntries(
  Object.entries(CATEGORY_LABELS).map(([k, v]) => [v, k as ExpenseCategory])
);

export type ImportMode = "overwrite" | "merge";

interface ImportJSON {
  version: string;
  exportedAt: string;
  data: {
    expenses: ImportExpense[];
    inventory: ImportInventory[];
    notifications: ImportNotification[];
  };
}

interface ImportExpense {
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

interface ImportInventory {
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

interface ImportNotification {
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

export interface ImportSummary {
  expenses: number;
  inventory: number;
  notifications: number;
}

export function validateImportJSON(content: string): ImportJSON {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("JSONの解析に失敗しました");
  }

  const obj = parsed as Record<string, unknown>;
  if (!obj || typeof obj !== "object") {
    throw new Error("無効なファイル形式です");
  }
  if (obj.version !== "1.0") {
    throw new Error(`未対応のバージョンです: ${obj.version}`);
  }
  const data = obj.data as Record<string, unknown>;
  if (!data || typeof data !== "object") {
    throw new Error("dataフィールドがありません");
  }
  if (!Array.isArray(data.expenses)) {
    throw new Error("expenses配列がありません");
  }
  if (!Array.isArray(data.inventory)) {
    throw new Error("inventory配列がありません");
  }
  if (!Array.isArray(data.notifications)) {
    throw new Error("notifications配列がありません");
  }

  for (const e of data.expenses) {
    if (!e.id || !e.category || typeof e.amount !== "number" || !e.itemName || !e.expenseDate) {
      throw new Error("不正な支出データが含まれています");
    }
    if (!EXPENSE_CATEGORIES.includes(e.category as ExpenseCategory)) {
      throw new Error(`不明なカテゴリ: ${e.category}`);
    }
  }

  for (const i of data.inventory) {
    if (!i.id || !i.itemName || !i.category) {
      throw new Error("不正な在庫データが含まれています");
    }
    if (!INVENTORY_STATUSES.includes(i.status as (typeof INVENTORY_STATUSES)[number])) {
      throw new Error(`不明なステータス: ${i.status}`);
    }
  }

  for (const n of data.notifications) {
    if (!n.id || !n.expenseId || !n.itemName || typeof n.amount !== "number") {
      throw new Error("不正な通知データが含まれています");
    }
    if (!NOTIFICATION_STATUSES.includes(n.status as (typeof NOTIFICATION_STATUSES)[number])) {
      throw new Error(`不明な通知ステータス: ${n.status}`);
    }
  }

  return parsed as ImportJSON;
}

export function parseCSV(content: string): ImportExpense[] {
  const text = content.replace(/^\uFEFF/, "");
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSVにデータ行がありません");

  const header = lines[0];
  if (!header.includes("日付") || !header.includes("カテゴリ")) {
    throw new Error("CSVヘッダーが不正です（日付,カテゴリ,品名,金額,メモ が必要）");
  }

  const result: ImportExpense[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = csvParseLine(lines[i]);
    if (fields.length < 4) {
      throw new Error(`${i + 1}行目: フィールドが不足しています`);
    }

    const [date, catLabel, itemName, amountStr, memo] = fields;
    const category = LABEL_TO_CATEGORY[catLabel];
    if (!category) {
      throw new Error(`${i + 1}行目: 不明なカテゴリ「${catLabel}」`);
    }

    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount < 0) {
      throw new Error(`${i + 1}行目: 金額が不正です`);
    }

    const now = new Date().toISOString();
    result.push({
      id: generateId(),
      category,
      amount,
      itemName: itemName || "",
      expenseDate: date,
      memo: memo || "",
      inventoryId: null,
      reminderDays: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  return result;
}

function csvParseLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

export async function pickJSONFile(): Promise<string | null> {
  const result = await getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const file = new File(result.assets[0].uri);
  return file.text();
}

export async function pickCSVFile(): Promise<string | null> {
  const result = await getDocumentAsync({
    type: ["text/csv", "text/comma-separated-values", "*/*"],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const file = new File(result.assets[0].uri);
  return file.text();
}

export async function importFromJSON(
  db: SQLite.SQLiteDatabase,
  content: string,
  mode: ImportMode
): Promise<ImportSummary> {
  const data = validateImportJSON(content);

  if (mode === "overwrite") {
    await db.execAsync(`
      DELETE FROM notifications;
      DELETE FROM inventory;
      DELETE FROM expenses;
    `);
  }

  let expenseCount = 0;
  let inventoryCount = 0;
  let notificationCount = 0;

  const existingExpenseIds = new Set<string>();
  const existingInventoryIds = new Set<string>();
  const existingNotificationIds = new Set<string>();

  if (mode === "merge") {
    const eIds = await db.getAllAsync(`SELECT id FROM expenses`);
    for (const r of eIds as Record<string, unknown>[]) existingExpenseIds.add(r.id as string);

    const iIds = await db.getAllAsync(`SELECT id FROM inventory`);
    for (const r of iIds as Record<string, unknown>[]) existingInventoryIds.add(r.id as string);

    const nIds = await db.getAllAsync(`SELECT id FROM notifications`);
    for (const r of nIds as Record<string, unknown>[]) existingNotificationIds.add(r.id as string);
  }

  await db.withTransactionAsync(async () => {
    for (const e of data.data.expenses) {
      if (mode === "merge" && existingExpenseIds.has(e.id)) continue;
      await db.runAsync(
        `INSERT INTO expenses (id, category, amount, item_name, expense_date, memo, inventory_id, reminder_days, notification_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.id, e.category, e.amount, e.itemName, e.expenseDate, e.memo || "", e.inventoryId || null, e.reminderDays ?? null, null, e.createdAt, e.updatedAt]
      );
      expenseCount++;
    }

    for (const i of data.data.inventory) {
      if (mode === "merge" && existingInventoryIds.has(i.id)) continue;
      await db.runAsync(
        `INSERT INTO inventory (id, item_name, category, status, last_purchased_at, average_consumption_days, next_purchase_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [i.id, i.itemName, i.category, i.status, i.lastPurchasedAt || null, i.averageConsumptionDays ?? null, i.nextPurchaseDate || null, i.createdAt, i.updatedAt]
      );
      inventoryCount++;
    }

    for (const n of data.data.notifications) {
      if (mode === "merge" && existingNotificationIds.has(n.id)) continue;
      await db.runAsync(
        `INSERT INTO notifications (id, expense_id, category, item_name, amount, reminder_days, notified_at, status, acted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [n.id, n.expenseId, n.category, n.itemName, n.amount, n.reminderDays, n.notifiedAt, n.status, n.actedAt || null]
      );
      notificationCount++;
    }
  });

  return { expenses: expenseCount, inventory: inventoryCount, notifications: notificationCount };
}

export async function importFromCSV(
  db: SQLite.SQLiteDatabase,
  content: string
): Promise<ImportSummary> {
  const expenses = parseCSV(content);

  await db.withTransactionAsync(async () => {
    for (const e of expenses) {
      await db.runAsync(
        `INSERT INTO expenses (id, category, amount, item_name, expense_date, memo, inventory_id, reminder_days, notification_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.id, e.category, e.amount, e.itemName, e.expenseDate, e.memo || "", null, null, null, e.createdAt, e.updatedAt]
      );
    }
  });

  return { expenses: expenses.length, inventory: 0, notifications: 0 };
}
