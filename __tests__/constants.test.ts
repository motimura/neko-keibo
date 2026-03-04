import { EXPENSE_CATEGORIES } from "../types/expense";
import { CATEGORY_LABELS, CATEGORY_EMOJI, CATEGORY_COLORS } from "../utils/constants";

describe("カテゴリ定義", () => {
  it("7つのカテゴリが定義されている", () => {
    expect(EXPENSE_CATEGORIES).toHaveLength(7);
  });

  it("全カテゴリにラベルが定義されている", () => {
    for (const cat of EXPENSE_CATEGORIES) {
      expect(CATEGORY_LABELS[cat]).toBeDefined();
      expect(typeof CATEGORY_LABELS[cat]).toBe("string");
    }
  });

  it("全カテゴリに絵文字が定義されている", () => {
    for (const cat of EXPENSE_CATEGORIES) {
      expect(CATEGORY_EMOJI[cat]).toBeDefined();
    }
  });

  it("全カテゴリに色が定義されている", () => {
    for (const cat of EXPENSE_CATEGORIES) {
      expect(CATEGORY_COLORS[cat]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
