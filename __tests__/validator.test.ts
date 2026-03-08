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

  // --- Boundary tests ---

  it("超長い品名（1000文字）を受け付ける", () => {
    const longName = "あ".repeat(1000);
    const result = validateCreateExpense({ ...validInput, itemName: longName });
    expect(result).toHaveProperty("data");
    if ("data" in result) {
      expect(result.data.itemName).toBe(longName);
    }
  });

  it("高額（10,000,000以上）の金額を受け付ける", () => {
    const result = validateCreateExpense({ ...validInput, amount: 10000000 });
    expect(result).toHaveProperty("data");
    if ("data" in result) {
      expect(result.data.amount).toBe(10000000);
    }
  });

  it("非常に大きい金額（Number.MAX_SAFE_INTEGER）を受け付ける", () => {
    const result = validateCreateExpense({ ...validInput, amount: Number.MAX_SAFE_INTEGER });
    expect(result).toHaveProperty("data");
    if ("data" in result) {
      expect(result.data.amount).toBe(Number.MAX_SAFE_INTEGER);
    }
  });

  it("Unicode/絵文字の品名を受け付ける", () => {
    const emojiName = "🐱フード🍗プレミアム";
    const result = validateCreateExpense({ ...validInput, itemName: emojiName });
    expect(result).toHaveProperty("data");
    if ("data" in result) {
      expect(result.data.itemName).toBe(emojiName);
    }
  });

  it("存在しない日付（2026-02-30）はregexのみなので通過する", () => {
    const result = validateCreateExpense({ ...validInput, expenseDate: "2026-02-30" });
    // Current validator only checks YYYY-MM-DD regex format, not date validity
    expect(result).toHaveProperty("data");
    if ("data" in result) {
      expect(result.data.expenseDate).toBe("2026-02-30");
    }
  });

  it("空オブジェクト{}は全フィールドのエラーを返す", () => {
    const result = validateCreateExpense({});
    expect(result).toHaveProperty("errors");
    if ("errors" in result) {
      const fields = result.errors.map((e) => e.field);
      expect(fields).toContain("category");
      expect(fields).toContain("amount");
      expect(fields).toContain("itemName");
      expect(fields).toContain("expenseDate");
      expect(result.errors.length).toBe(4);
    }
  });

  it("金額1（最小有効値）を受け付ける", () => {
    const result = validateCreateExpense({ ...validInput, amount: 1 });
    expect(result).toHaveProperty("data");
    if ("data" in result) {
      expect(result.data.amount).toBe(1);
    }
  });

  it("全カテゴリを受け付ける", () => {
    const categories = ["food", "litter", "medical", "toy", "goods", "grooming", "other"] as const;
    for (const cat of categories) {
      const result = validateCreateExpense({ ...validInput, category: cat });
      expect(result).toHaveProperty("data");
    }
  });
});
