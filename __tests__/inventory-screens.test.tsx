jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => ({
    runAsync: jest.fn(),
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    execAsync: jest.fn(),
  })),
}));

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({ navigate: jest.fn() })),
  useFocusEffect: jest.fn((cb) => cb()),
  Tabs: Object.assign(
    ({ children }: { children: React.ReactNode }) => children,
    { Screen: () => null }
  ),
}));

import React from "react";
import { render, screen } from "@testing-library/react-native";
import InventoryList from "../components/InventoryList";
import InventoryEditModal from "../components/InventoryEditModal";
import type { InventoryItem } from "../types/inventory";

const mockItem: InventoryItem = {
  id: "inv-1",
  itemName: "ロイヤルカナン",
  category: "food",
  status: "critical",
  lastPurchasedAt: "2026-02-01",
  averageConsumptionDays: 30,
  nextPurchaseDate: "2026-03-03",
  createdAt: "2026-02-01T00:00:00Z",
  updatedAt: "2026-02-01T00:00:00Z",
};

describe("InventoryList", () => {
  it("空リストのメッセージを表示", () => {
    render(<InventoryList items={[]} onPress={jest.fn()} />);
    expect(screen.getByText("在庫アイテムがありません")).toBeTruthy();
  });

  it("アイテムを表示する", () => {
    render(
      <InventoryList
        items={[mockItem]}
        onPress={jest.fn()}
      />
    );
    expect(screen.getByText("ロイヤルカナン")).toBeTruthy();
  });

  it("ステータスセクションヘッダーを表示する", () => {
    render(
      <InventoryList
        items={[mockItem]}
        onPress={jest.fn()}
      />
    );
    expect(screen.getByText(/切れそう/)).toBeTruthy();
  });
});

describe("InventoryEditModal", () => {
  it("アイテム情報を表示する", () => {
    render(
      <InventoryEditModal
        item={mockItem}
        visible={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText(/ロイヤルカナン/)).toBeTruthy();
    expect(screen.getByText("在庫詳細")).toBeTruthy();
  });

  it("itemがnullの場合は何も表示しない", () => {
    const { toJSON } = render(
      <InventoryEditModal
        item={null}
        visible={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(toJSON()).toBeNull();
  });
});
