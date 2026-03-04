import { useCallback } from "react";
import { ScrollView, View, Text } from "react-native";
import { useFocusEffect, Link } from "expo-router";
import { useExpenseStore } from "../stores/useExpenseStore";
import { useInventoryStore } from "../stores/useInventoryStore";
import MonthPicker from "../components/MonthPicker";
import Dashboard from "../components/Dashboard";

export default function HomeScreen() {
  const { currentMonth, setMonth, fetchSummary, summary, ready } = useExpenseStore();
  const criticalCount = useInventoryStore((s) => s.criticalCount);
  const refreshStatuses = useInventoryStore((s) => s.refreshStatuses);

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      fetchSummary();
      refreshStatuses().catch(() => {});
    }, [ready, currentMonth, fetchSummary, refreshStatuses])
  );

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {criticalCount > 0 && (
        <Link href="/inventory" asChild>
          <View className="mx-4 mt-3 rounded-lg bg-red-50 px-4 py-3">
            <Text className="text-sm font-bold text-red-600">
              🔴 {criticalCount}件の在庫が切れそうです
            </Text>
          </View>
        </Link>
      )}
      <MonthPicker month={currentMonth} onChangeMonth={setMonth} />
      <Dashboard summary={summary} />
    </ScrollView>
  );
}
