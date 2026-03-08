jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "test-uuid-" + Math.random().toString(36).slice(2, 8)),
}));

jest.mock("expo-notifications", () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve("mock-notif-id")),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
}));

jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => ({
    runAsync: jest.fn(),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn(),
  })),
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

import * as Notifications from "expo-notifications";
import {
  initNotifications,
  scheduleReminder,
  cancelReminder,
  rescheduleReminder,
} from "../utils/notifications";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("initNotifications", () => {
  it("requestPermissionsAsyncを呼び出しgrantedならtrueを返す", async () => {
    const result = await initNotifications();
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it("権限が拒否された場合はfalseを返す", async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: "denied",
    });
    const result = await initNotifications();
    expect(result).toBe(false);
  });
});

describe("scheduleReminder", () => {
  it("scheduleNotificationAsyncを正しいパラメータで呼び出す", async () => {
    const result = await scheduleReminder("ロイヤルカナン", "🍗", 30);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.content.title).toBe("🐱 猫計簿");
    expect(call.content.body).toBe("🍗 ロイヤルカナン そろそろ買い替え時です");
    expect(call.trigger.seconds).toBe(30 * 86400);
    expect(result).toBe("mock-notif-id");
  });

  it("triggerのsecondsがdays*86400になる", async () => {
    await scheduleReminder("猫砂", "🪣", 7);

    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.trigger.seconds).toBe(7 * 86400);
  });
});

describe("cancelReminder", () => {
  it("cancelScheduledNotificationAsyncを呼び出す", async () => {
    await cancelReminder("notif-123");
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("notif-123");
  });
});

describe("rescheduleReminder", () => {
  it("cancel→scheduleの順序で呼び出し新しいIDを返す", async () => {
    const result = await rescheduleReminder("old-notif-id", "ロイヤルカナン", "🍗", 30);

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("old-notif-id");
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(result).toBe("mock-notif-id");
  });

  it("oldIdがnullの場合はcancelをスキップする", async () => {
    const result = await rescheduleReminder(null, "ロイヤルカナン", "🍗", 30);

    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(result).toBe("mock-notif-id");
  });
});
