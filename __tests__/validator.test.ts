import { validateCreateExpense } from "../utils/validator";

describe("validateCreateExpense", () => {
  const validInput = {
    category: "food" as const,
    amount: 1000,
    itemName: "ロイヤルカナン",
    expenseDate: "2026-03-01",
  };

  it("正常な入力を受け付ける", () => {
    const result = validateCreateExpense(validInput);
    expect(result).toHaveProperty("data");
    if ("data" in result) {
      expect(result.data.category).toBe("food");
      expect(result.data.amount).toBe(1000);
      expect(result.data.itemName).toBe("ロイヤルカナン");
    }
  });

  it("メモ付きの入力を受け付ける", () => {
    const result = validateCreateExpense({ ...validInput, memo: "セール品" });
    expect(result).toHaveProperty("data");
    if ("data" in result) {
      expect(result.data.memo).toBe("セール品");
    }
  });

  it("品名の前後空白をトリムする", () => {
    const result = validateCreateExpense({ ...validInput, itemName: "  テスト  " });
    expect(result).toHaveProperty("data");
    if ("data" in result) {
      expect(result.data.itemName).toBe("テスト");
    }
  });

  it("不正なカテゴリを拒否する", () => {
    const result = validateCreateExpense({ ...validInput, category: "invalid" as never });
    expect(result).toHaveProperty("errors");
    if ("errors" in result) {
      expect(result.errors.some((e) => e.field === "category")).toBe(true);
    }
  });

  it("金額0を拒否する", () => {
    const result = validateCreateExpense({ ...validInput, amount: 0 });
    expect(result).toHaveProperty("errors");
    if ("errors" in result) {
      expect(result.errors.some((e) => e.field === "amount")).toBe(true);
    }
  });

  it("負の金額を拒否する", () => {
    const result = validateCreateExpense({ ...validInput, amount: -100 });
    expect(result).toHaveProperty("errors");
  });

  it("小数の金額を拒否する", () => {
    const result = validateCreateExpense({ ...validInput, amount: 10.5 });
    expect(result).toHaveProperty("errors");
  });

  it("空の品名を拒否する", () => {
    const result = validateCreateExpense({ ...validInput, itemName: "" });
    expect(result).toHaveProperty("errors");
    if ("errors" in result) {
      expect(result.errors.some((e) => e.field === "itemName")).toBe(true);
    }
  });

  it("空白のみの品名を拒否する", () => {
    const result = validateCreateExpense({ ...validInput, itemName: "   " });
    expect(result).toHaveProperty("errors");
  });

  it("不正な日付形式を拒否する", () => {
    const result = validateCreateExpense({ ...validInput, expenseDate: "2026/03/01" });
    expect(result).toHaveProperty("errors");
    if ("errors" in result) {
      expect(result.errors.some((e) => e.field === "expenseDate")).toBe(true);
    }
  });

  it("日付なしを拒否する", () => {
    const result = validateCreateExpense({ ...validInput, expenseDate: undefined as never });
    expect(result).toHaveProperty("errors");
  });

  it("複数エラーを同時に返す", () => {
    const result = validateCreateExpense({});
    expect(result).toHaveProperty("errors");
    if ("errors" in result) {
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    }
  });
});
