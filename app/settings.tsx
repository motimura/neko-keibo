import { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";
import { useExpenseStore } from "../stores/useExpenseStore";
import { getDataCounts } from "../utils/export";

export default function SettingsScreen() {
  const db = useExpenseStore((s) => s.db);
  const [counts, setCounts] = useState({ expenses: 0, inventory: 0, notifications: 0 });

  useFocusEffect(
    useCallback(() => {
      if (!db) return;
      getDataCounts(db).then(setCounts).catch(() => {});
    }, [db])
  );

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <Text className="mb-2 text-sm font-medium uppercase text-gray-400">アプリ情報</Text>
      <View className="mb-6 rounded-xl bg-white p-4">
        <Text className="mb-1 text-xl font-bold">猫計簿</Text>
        <Text className="mb-4 text-base text-gray-500">Version 2.0.0</Text>
        <View className="gap-1">
          <Text className="text-base text-gray-600">支出: {counts.expenses}件</Text>
          <Text className="text-base text-gray-600">在庫: {counts.inventory}件</Text>
          <Text className="text-base text-gray-600">通知: {counts.notifications}件</Text>
        </View>
        <Text className="mt-4 text-sm text-gray-400">
          猫にかかる費用を記録・管理するアプリです。{"\n"}
          データは端末内に保存されます。
        </Text>
      </View>
    </ScrollView>
  );
}

function SettingsButton({
  label,
  description,
  icon,
  onPress,
  destructive,
}: {
  label: string;
  description: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center px-4 py-3">
      <Text className="mr-3 text-xl">{icon}</Text>
      <View className="flex-1">
        <Text className={`text-lg font-medium ${destructive ? "text-red-500" : ""}`}>{label}</Text>
        <Text className="text-sm text-gray-400">{description}</Text>
      </View>
      <Text className="text-gray-300">›</Text>
    </Pressable>
  );
}

function Divider() {
  return <View className="ml-12 border-b border-gray-100" />;
}
