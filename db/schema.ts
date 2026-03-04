import * as SQLite from "expo-sqlite";

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      amount INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      expense_date TEXT NOT NULL,
      memo TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      item_name TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sufficient',
      last_purchased_at TEXT,
      average_consumption_days INTEGER,
      next_purchase_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      category TEXT NOT NULL,
      item_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reminder_days INTEGER NOT NULL,
      notified_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      acted_at TEXT,
      FOREIGN KEY (expense_id) REFERENCES expenses(id)
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
  `);

  try {
    await db.runAsync(`ALTER TABLE expenses ADD COLUMN inventory_id TEXT`);
  } catch {
    // column already exists
  }
  try {
    await db.runAsync(`ALTER TABLE expenses ADD COLUMN reminder_days INTEGER`);
  } catch {
    // column already exists
  }
  try {
    await db.runAsync(`ALTER TABLE expenses ADD COLUMN notification_id TEXT`);
  } catch {
    // column already exists
  }

  // Migrate average_consumption_days → reminder_days
  await db.runAsync(`
    UPDATE expenses SET reminder_days = (
      SELECT inv.average_consumption_days FROM inventory inv
      WHERE inv.id = expenses.inventory_id AND inv.average_consumption_days IS NOT NULL
    )
    WHERE inventory_id IS NOT NULL AND reminder_days IS NULL
      AND EXISTS (SELECT 1 FROM inventory WHERE id = expenses.inventory_id AND average_consumption_days IS NOT NULL)
  `);
}
