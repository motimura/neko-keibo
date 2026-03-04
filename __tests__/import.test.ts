jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "test-uuid-" + Math.random().toString(36).slice(2, 8)),
}));

import { validateImportJSON, parseCSV } from "../utils/import";

const validJSON = JSON.stringify({
  version: "1.0",
  exportedAt: "2025-01-01T00:00:00.000Z",
  data: {
    expenses: [
      {
        id: "e1",
        category: "food",
        amount: 3000,
        itemName: "ロイヤルカナン",
        expenseDate: "2025-01-15",
        memo: "",
        inventoryId: null,
        reminderDays: null,
        createdAt: "2025-01-15T00:00:00.000Z",
        updatedAt: "2025-01-15T00:00:00.000Z",
      },
    ],
    inventory: [
      {
        id: "inv1",
        itemName: "ロイヤルカナン",
        category: "food",
        status: "sufficient",
        lastPurchasedAt: "2025-01-15",
        averageConsumptionDays: 30,
        nextPurchaseDate: "2025-02-14",
        createdAt: "2025-01-15T00:00:00.000Z",
        updatedAt: "2025-01-15T00:00:00.000Z",
      },
    ],
    notifications: [
      {
        id: "n1",
        expenseId: "e1",
        category: "food",
        itemName: "ロイヤルカナン",
        amount: 3000,
        reminderDays: 30,
        notifiedAt: "2025-02-14T00:00:00.000Z",
        status: "pending",
        actedAt: null,
      },
    ],
  },
});

describe("validateImportJSON", () => {
  it("accepts valid JSON", () => {
    const result = validateImportJSON(validJSON);
    expect(result.version).toBe("1.0");
    expect(result.data.expenses).toHaveLength(1);
    expect(result.data.inventory).toHaveLength(1);
    expect(result.data.notifications).toHaveLength(1);
  });

  it("rejects invalid JSON syntax", () => {
    expect(() => validateImportJSON("{bad}")).toThrow("JSONの解析に失敗しました");
  });

  it("rejects wrong version", () => {
    const data = JSON.parse(validJSON);
    data.version = "2.0";
    expect(() => validateImportJSON(JSON.stringify(data))).toThrow("未対応のバージョン");
  });

  it("rejects missing data field", () => {
    expect(() => validateImportJSON(JSON.stringify({ version: "1.0" }))).toThrow(
      "dataフィールドがありません"
    );
  });

  it("rejects missing expenses array", () => {
    const data = { version: "1.0", data: { inventory: [], notifications: [] } };
    expect(() => validateImportJSON(JSON.stringify(data))).toThrow("expenses配列がありません");
  });

  it("rejects invalid category in expense", () => {
    const data = JSON.parse(validJSON);
    data.data.expenses[0].category = "invalid";
    expect(() => validateImportJSON(JSON.stringify(data))).toThrow("不明なカテゴリ");
  });

  it("rejects invalid inventory status", () => {
    const data = JSON.parse(validJSON);
    data.data.inventory[0].status = "unknown";
    expect(() => validateImportJSON(JSON.stringify(data))).toThrow("不明なステータス");
  });

  it("rejects invalid notification status", () => {
    const data = JSON.parse(validJSON);
    data.data.notifications[0].status = "bad";
    expect(() => validateImportJSON(JSON.stringify(data))).toThrow("不明な通知ステータス");
  });

  it("rejects expense missing required fields", () => {
    const data = JSON.parse(validJSON);
    delete data.data.expenses[0].amount;
    expect(() => validateImportJSON(JSON.stringify(data))).toThrow("不正な支出データ");
  });
});

describe("parseCSV", () => {
  it("parses valid CSV with BOM", () => {
    const csv = "\uFEFF日付,カテゴリ,品名,金額,メモ\n2025-01-15,フード,ロイヤルカナン,3000,大袋";
    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("food");
    expect(result[0].amount).toBe(3000);
    expect(result[0].itemName).toBe("ロイヤルカナン");
    expect(result[0].expenseDate).toBe("2025-01-15");
    expect(result[0].memo).toBe("大袋");
  });

  it("parses CSV without BOM", () => {
    const csv = "日付,カテゴリ,品名,金額,メモ\n2025-01-15,猫砂,トフカス,1500,";
    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("litter");
    expect(result[0].amount).toBe(1500);
  });

  it("converts all category labels to codes", () => {
    const csv = [
      "日付,カテゴリ,品名,金額,メモ",
      "2025-01-01,フード,a,100,",
      "2025-01-01,猫砂,b,200,",
      "2025-01-01,医療,c,300,",
      "2025-01-01,おもちゃ,d,400,",
      "2025-01-01,グッズ,e,500,",
      "2025-01-01,トリミング,f,600,",
      "2025-01-01,その他,g,700,",
    ].join("\n");

    const result = parseCSV(csv);
    expect(result.map((r) => r.category)).toEqual([
      "food",
      "litter",
      "medical",
      "toy",
      "goods",
      "grooming",
      "other",
    ]);
  });

  it("handles quoted fields with commas", () => {
    const csv = '日付,カテゴリ,品名,金額,メモ\n2025-01-15,フード,"フード, 大袋",3000,"テスト,メモ"';
    const result = parseCSV(csv);

    expect(result[0].itemName).toBe("フード, 大袋");
    expect(result[0].memo).toBe("テスト,メモ");
  });

  it("handles escaped quotes in fields", () => {
    const csv = '日付,カテゴリ,品名,金額,メモ\n2025-01-15,フード,"フード ""特大""",3000,';
    const result = parseCSV(csv);

    expect(result[0].itemName).toBe('フード "特大"');
  });

  it("rejects CSV with no data rows", () => {
    expect(() => parseCSV("日付,カテゴリ,品名,金額,メモ")).toThrow("データ行がありません");
  });

  it("rejects invalid header", () => {
    expect(() => parseCSV("a,b,c\n1,2,3")).toThrow("CSVヘッダーが不正");
  });

  it("rejects unknown category label", () => {
    const csv = "日付,カテゴリ,品名,金額,メモ\n2025-01-15,不明カテゴリ,test,100,";
    expect(() => parseCSV(csv)).toThrow("不明なカテゴリ");
  });

  it("rejects invalid amount", () => {
    const csv = "日付,カテゴリ,品名,金額,メモ\n2025-01-15,フード,test,abc,";
    expect(() => parseCSV(csv)).toThrow("金額が不正");
  });

  it("generates new IDs for each row", () => {
    const csv = "日付,カテゴリ,品名,金額,メモ\n2025-01-15,フード,a,100,\n2025-01-16,猫砂,b,200,";
    const result = parseCSV(csv);

    expect(result[0].id).toBeTruthy();
    expect(result[1].id).toBeTruthy();
    expect(result[0].id).not.toBe(result[1].id);
  });
});
