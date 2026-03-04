import "../global.css";
import { useEffect } from "react";
import { Text } from "react-native";
import { Tabs, SplashScreen } from "expo-router";
import { useExpenseStore } from "../stores/useExpenseStore";
import { useInventoryStore } from "../stores/useInventoryStore";
import { useNotificationStore } from "../stores/useNotificationStore";
import {
  initNotifications,
  rescheduleAllReminders,
  checkDueNotifications,
  setupNotificationReceivedListener,
} from "../utils/notifications";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const init = useExpenseStore((s) => s.init);
  const ready = useExpenseStore((s) => s.ready);
  const db = useExpenseStore((s) => s.db);
  const criticalCount = useInventoryStore((s) => s.criticalCount);
  const refreshStatuses = useInventoryStore((s) => s.refreshStatuses);
  const pendingCount = useNotificationStore((s) => s.pendingCount);
  const fetchPendingCount = useNotificationStore((s) => s.fetchPendingCount);

  useEffect(() => {
    init().then(() => {
      refreshStatuses().catch(() => {});
      initNotifications().catch(() => {});
    });
  }, [init, refreshStatuses]);

  useEffect(() => {
    if (!ready || !db) return;

    checkDueNotifications(db)
      .then(() => fetchPendingCount())
      .catch(() => {});
    rescheduleAllReminders(db).catch(() => {});

    const subscription = setupNotificationReceivedListener(db, () => {
      fetchPendingCount().catch(() => {});
    });

    return () => subscription.remove();
  }, [ready, db, fetchPendingCount]);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTitleStyle: { fontWeight: "bold" },
        tabBarActiveTintColor: "#FF6B6B",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ホーム",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "登録",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>✏️</Text>,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "一覧",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "在庫",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📦</Text>,
          tabBarBadge: criticalCount > 0 ? criticalCount : undefined,
          tabBarBadgeStyle: { backgroundColor: "#FF6B6B" },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "通知",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔔</Text>,
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: "#FF6B6B" },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "設定",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
