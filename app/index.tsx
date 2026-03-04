import { useCallback } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useFocusEffect, Link, useRouter } from "expo-router";
import { useExpenseStore } from "../stores/useExpenseStore";
import { useInventoryStore } from "../stores/useInventoryStore";
import MonthPicker from "../components/MonthPicker";
import Dashboard from "../components/Dashboard";

export default function HomeScreen() {
  const { currentMonth, setMonth, fetchSummary, summary, ready } = useExpenseStore();
  const criticalCount = useInventoryStore((s) => s.criticalCount);
  const refreshStatuses = useInventoryStore((s) => s.refreshStatuses);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      fetchSummary();
      refreshStatuses().catch(() => {});
    }, [ready, currentMonth, fetchSummary, refreshStatuses])
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {criticalCount > 0 && (
          <Link href="/(records)/inventory" asChild>
            <Pressable className="mx-4 mt-3 rounded-lg bg-red-50 px-4 py-3">
              <Text className="text-base font-bold text-red-600">
                🔴 {criticalCount}件の在庫が切れそうです
              </Text>
            </Pressable>
          </Link>
        )}
        <MonthPicker month={currentMonth} onChangeMonth={setMonth} />
        <Dashboard summary={summary} />
      </ScrollView>
      <Pressable
        onPress={() => router.push("/add")}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-red-400 shadow-lg"
        style={{ elevation: 5 }}
      >
        <Text className="text-2xl font-bold text-white">＋</Text>
      </Pressable>
    </View>
  );
}
