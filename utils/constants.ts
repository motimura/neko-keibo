import type { ExpenseCategory } from "../types/expense";
import type { InventoryStatus } from "../types/inventory";

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: "フード",
  litter: "消耗品",
  medical: "医療",
  toy: "おもちゃ",
  goods: "グッズ",
  grooming: "トリミング",
  other: "その他",
};

export const CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  food: "🍗",
  litter: "🧻",
  medical: "🏥",
  toy: "🧸",
  goods: "🛏️",
  grooming: "✂️",
  other: "📦",
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: "#FF6B6B",
  litter: "#4ECDC4",
  medical: "#45B7D1",
  toy: "#96CEB4",
  goods: "#FFEAA7",
  grooming: "#DDA0DD",
  other: "#B0BEC5",
};

export const CONSUMABLE_CATEGORIES: ExpenseCategory[] = ["food", "litter"];

export const INVENTORY_STATUS_THRESHOLD_DAYS = 7;

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  sufficient: "十分",
  low: "そろそろ",
  critical: "切れそう",
};

export const INVENTORY_STATUS_COLORS: Record<InventoryStatus, string> = {
  sufficient: "#4ECDC4",
  low: "#FFEAA7",
  critical: "#FF6B6B",
};

export const INVENTORY_STATUS_EMOJI: Record<InventoryStatus, string> = {
  sufficient: "🟢",
  low: "🟡",
  critical: "🔴",
};
