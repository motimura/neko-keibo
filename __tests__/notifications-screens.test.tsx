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

jest.mock("expo-notifications", () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve("mock-notif-id")),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
}));

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { useNotificationStore } from "../stores/useNotificationStore";
import { useExpenseStore } from "../stores/useExpenseStore";
import NotificationsScreen from "../app/notifications";
import type { NotificationRecord } from "../types/notification";

const mockNotification: NotificationRecord = {
  id: "notif-1",
  expenseId: "exp-1",
  category: "food",
  itemName: "ロイヤルカナン",
  amount: 2980,
  reminderDays: 30,
  notifiedAt: "2026-03-01T09:00:00Z",
  status: "pending",
  actedAt: null,
};

beforeEach(() => {
  useExpenseStore.setState({ ready: true });
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

describe("NotificationsScreen", () => {
  it("空の通知一覧で「通知はありません」を表示する", () => {
    render(<NotificationsScreen />);
    expect(screen.getByText("通知はありません")).toBeTruthy();
  });

  it("通知カードに品名と金額を表示する", () => {
    useNotificationStore.setState({
      notifications: [mockNotification],
      pendingCount: 1,
    });

    render(<NotificationsScreen />);
    expect(screen.getByText("ロイヤルカナン")).toBeTruthy();
    expect(screen.getByText("¥2,980")).toBeTruthy();
  });

  it("アクションボタンを表示する", () => {
    useNotificationStore.setState({
      notifications: [mockNotification],
      pendingCount: 1,
    });

    render(<NotificationsScreen />);
    expect(screen.getByText("同じものを購入")).toBeTruthy();
    expect(screen.getByText("あとで")).toBeTruthy();
    expect(screen.getByText("通知をオフ")).toBeTruthy();
  });

  it("未対応件数を表示する", () => {
    useNotificationStore.setState({
      notifications: [mockNotification],
      pendingCount: 1,
    });

    render(<NotificationsScreen />);
    expect(screen.getByText("1件の未対応通知")).toBeTruthy();
  });
});
