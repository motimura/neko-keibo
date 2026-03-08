import { useCallback } from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { useExpenseStore } from "../stores/useExpenseStore";
import { useNotificationStore } from "../stores/useNotificationStore";
import { checkDueNotifications } from "../utils/notifications";
import { CATEGORY_EMOJI } from "../utils/constants";
import type { NotificationRecord } from "../types/notification";

function NotificationCard({
  notification,
  onRepurchase,
  onDismiss,
}: {
  notification: NotificationRecord;
  onRepurchase: (n: NotificationRecord) => void;
  onDismiss: (n: NotificationRecord) => void;
}) {
  const emoji = CATEGORY_EMOJI[notification.category] || "📦";

  return (
    <View className="mx-4 mb-3 rounded-xl bg-white p-4 shadow-sm">
      <View className="mb-2 flex-row items-center gap-2">
        <Text className="text-xl">{emoji}</Text>
        <Text className="flex-1 text-lg font-bold">{notification.itemName}</Text>
        <Text className="text-lg font-bold">¥{notification.amount.toLocaleString()}</Text>
      </View>

      <Text className="mb-3 text-sm text-gray-400">
        通知日: {notification.notifiedAt.slice(0, 10)}
      </Text>

      <View className="flex-row gap-2">
        <Pressable
          onPress={() => onRepurchase(notification)}
          className="flex-1 rounded-lg bg-red-400 py-2"
        >
          <Text className="text-center text-base font-bold text-white">同じものを購入</Text>
        </Pressable>

        <Pressable
          onPress={() => Alert.alert("通知を保留しました", "あとで通知一覧から対応できます")}
          className="rounded-lg bg-gray-200 px-4 py-2"
        >
          <Text className="text-center text-base text-gray-600">あとで</Text>
        </Pressable>

        <Pressable onPress={() => onDismiss(notification)} className="rounded-lg px-3 py-2">
          <Text className="text-center text-base text-red-500">通知をオフ</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const ready = useExpenseStore((s) => s.ready);
  const db = useExpenseStore((s) => s.db);
  const { notifications, fetchNotifications, repurchase, dismiss } = useNotificationStore();

  useFocusEffect(
    useCallback(() => {
      if (!ready || !db) return;
      checkDueNotifications(db)
        .then(() => fetchNotifications())
        .catch(() => fetchNotifications());
    }, [ready, db, fetchNotifications])
  );

  const handleRepurchase = (notification: NotificationRecord) => {
    Alert.alert(
      "再購入確認",
      `「${notification.itemName}」を¥${notification.amount.toLocaleString()}で再購入しますか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "購入する",
          onPress: async () => {
            try {
              await repurchase(notification);
            } catch (e) {
              Alert.alert("エラー", (e as Error).message);
            }
          },
        },
      ]
    );
  };

  const handleDismiss = (notification: NotificationRecord) => {
    Alert.alert("通知をオフ", `「${notification.itemName}」の定期通知を解除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "解除する",
        style: "destructive",
        onPress: async () => {
          try {
            await dismiss(notification.id, notification.expenseId);
          } catch (e) {
            Alert.alert("エラー", (e as Error).message);
          }
        },
      },
    ]);
  };

  if (notifications.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="text-xl">🎉</Text>
        <Text className="mt-2 text-gray-400">通知はありません</Text>
        <Text className="mt-2 text-center text-sm text-gray-300">
          支出登録時に通知を設定すると、ここに表示されます
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 py-2">
        <Text className="text-base text-gray-500">{notifications.length}件の未対応通知</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationCard
            notification={item}
            onRepurchase={handleRepurchase}
            onDismiss={handleDismiss}
          />
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}
