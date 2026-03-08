jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => ({
    runAsync: jest.fn(),
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    execAsync: jest.fn(),
  })),
}));

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({ navigate: jest.fn(), push: jest.fn(), back: jest.fn(), replace: jest.fn() })),
  useFocusEffect: jest.fn((cb) => cb()),
  usePathname: jest.fn(() => "/expenses"),
  Tabs: Object.assign(
    ({ children }: { children: React.ReactNode }) => children,
    { Screen: () => null }
  ),
  Slot: () => null,
  Link: ({ children }: { children: React.ReactNode }) => children,
  Redirect: () => null,
}));

jest.mock("react-native-chart-kit", () => ({
  PieChart: () => null,
}));

jest.mock("expo-notifications", () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve("mock-notif-id")),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
}));

import React from "react";
import { render, screen } from "@testing-library/react-native";
import Dashboard from "../components/Dashboard";
import MonthPicker from "../components/MonthPicker";
import ExpenseList from "../components/ExpenseList";
import CategoryBadge from "../components/CategoryBadge";
import InventoryList from "../components/InventoryList";
import NotificationsScreen from "../app/notifications";
import { useExpenseStore } from "../stores/useExpenseStore";
import { useNotificationStore } from "../stores/useNotificationStore";

describe("Dashboard", () => {
  it("summaryがnullの場合ローディング表示", () => {
    render(<Dashboard summary={null} />);
    expect(screen.getByText("データを読み込み中...")).toBeTruthy();
  });

  it("合計金額を表示する", () => {
    render(
      <Dashboard
        summary={{
          month: "2026-03",
          totalAmount: 12500,
          byCategory: { food: 8000, litter: 4500 },
          comparedToPrevMonth: null,
        }}
      />
    );
    expect(screen.getByText("今月の合計")).toBeTruthy();
  });

  it("支出がない場合のメッセージを表示", () => {
    render(
      <Dashboard
        summary={{
          month: "2026-03",
          totalAmount: 0,
          byCategory: {},
          comparedToPrevMonth: null,
        }}
      />
    );
    expect(screen.getByText("まだ支出がありません")).toBeTruthy();
  });
});

describe("MonthPicker", () => {
  it("月をフォーマットして表示する", () => {
    const onChangeMonth = jest.fn();
    render(<MonthPicker month="2026-03" onChangeMonth={onChangeMonth} />);
    expect(screen.getByText("2026年3月")).toBeTruthy();
  });

  it("◀と▶ボタンを表示する", () => {
    render(<MonthPicker month="2026-03" onChangeMonth={jest.fn()} />);
    expect(screen.getByText("◀")).toBeTruthy();
    expect(screen.getByText("▶")).toBeTruthy();
  });
});

describe("ExpenseList", () => {
  it("空リストのメッセージを表示", () => {
    render(<ExpenseList expenses={[]} onDelete={jest.fn()} onEdit={jest.fn()} />);
    expect(screen.getByText("この月の支出はありません")).toBeTruthy();
  });

  it("支出アイテムを表示する", () => {
    render(
      <ExpenseList
        expenses={[
          {
            id: "1",
            category: "food",
            amount: 2980,
            itemName: "ロイヤルカナン",
            expenseDate: "2026-03-01",
            memo: "",
            inventoryId: null,
            reminderDays: null,
            notificationId: null,
            createdAt: "2026-03-01T00:00:00Z",
            updatedAt: "2026-03-01T00:00:00Z",
          },
        ]}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
      />
    );
    expect(screen.getByText("ロイヤルカナン")).toBeTruthy();
  });
});

describe("CategoryBadge", () => {
  it("カテゴリの絵文字とラベルを表示", () => {
    render(<CategoryBadge category="food" />);
    expect(screen.getByText("🍗")).toBeTruthy();
    expect(screen.getByText("フード")).toBeTruthy();
  });
});

describe("InventoryList empty state", () => {
  it("items=[]で空メッセージを表示", () => {
    render(<InventoryList items={[]} onPress={jest.fn()} />);
    expect(screen.getByText("在庫アイテムがありません")).toBeTruthy();
  });
});

describe("NotificationsScreen empty state", () => {
  beforeEach(() => {
    useExpenseStore.setState({ ready: true, db: null });
    useNotificationStore.setState({
      notifications: [],
      pendingCount: 0,
      loading: false,
      fetchNotifications: jest.fn(),
      fetchPendingCount: jest.fn(),
      repurchase: jest.fn(),
      dismiss: jest.fn(),
    });
  });

  it("notifications=[]で「通知はありません」を表示", () => {
    render(<NotificationsScreen />);
    expect(screen.getByText("通知はありません")).toBeTruthy();
  });
});
