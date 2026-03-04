import { EXPENSE_CATEGORIES, type ExpenseCategory, type CreateExpenseInput } from "../types/expense";

export interface ValidationError {
  field: string;
  message: string;
}

export function validateCreateExpense(
  input: Partial<CreateExpenseInput>
): { data: CreateExpenseInput } | { errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (
    !input.category ||
    !EXPENSE_CATEGORIES.includes(input.category as ExpenseCategory)
  ) {
    errors.push({
      field: "category",
      message: `カテゴリは ${EXPENSE_CATEGORIES.join(", ")} のいずれかを指定してください`,
    });
  }

  if (
    typeof input.amount !== "number" ||
    input.amount <= 0 ||
    !Number.isInteger(input.amount)
  ) {
    errors.push({
      field: "amount",
      message: "金額は1以上の整数を指定してください",
    });
  }

  if (!input.itemName || input.itemName.trim().length === 0) {
    errors.push({
      field: "itemName",
      message: "品名は必須です",
    });
  }

  if (
    !input.expenseDate ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.expenseDate)
  ) {
    errors.push({
      field: "expenseDate",
      message: "日付はYYYY-MM-DD形式で指定してください",
    });
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    data: {
      category: input.category as ExpenseCategory,
      amount: input.amount as number,
      itemName: input.itemName!.trim(),
      expenseDate: input.expenseDate as string,
      memo: input.memo?.trim(),
    },
  };
}
