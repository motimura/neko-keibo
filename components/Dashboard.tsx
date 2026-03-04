import { View, Text, Dimensions } from "react-native";
import { PieChart } from "react-native-chart-kit";
import type { DashboardSummary, ExpenseCategory } from "../types/expense";
import { CATEGORY_LABELS, CATEGORY_EMOJI, CATEGORY_COLORS } from "../utils/constants";

interface DashboardProps {
  summary: DashboardSummary | null;
}

export default function Dashboard({ summary }: DashboardProps) {
  if (!summary) {
    return (
      <View className="items-center py-10">
        <Text className="text-gray-400">データを読み込み中...</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get("window").width;

  const chartData = Object.entries(summary.byCategory).map(([cat, amount]) => ({
    name: `${CATEGORY_EMOJI[cat as ExpenseCategory]} ${CATEGORY_LABELS[cat as ExpenseCategory]}`,
    amount: amount ?? 0,
    color: CATEGORY_COLORS[cat as ExpenseCategory],
    legendFontColor: "#333",
    legendFontSize: 12,
  }));

  return (
    <View className="p-4">
      <View className="mb-4 items-center rounded-xl bg-white p-6 shadow-sm">
        <Text className="text-sm text-gray-500">今月の合計</Text>
        <Text className="text-3xl font-bold">¥{summary.totalAmount.toLocaleString()}</Text>
        {summary.comparedToPrevMonth && (
          <Text
            className="mt-1 text-sm"
            style={{ color: summary.comparedToPrevMonth.diff > 0 ? "#FF6B6B" : "#4ECDC4" }}
          >
            前月比 {summary.comparedToPrevMonth.diff > 0 ? "+" : ""}
            ¥{summary.comparedToPrevMonth.diff.toLocaleString()} (
            {summary.comparedToPrevMonth.percentage > 0 ? "+" : ""}
            {summary.comparedToPrevMonth.percentage}%)
          </Text>
        )}
      </View>

      {chartData.length > 0 ? (
        <View className="items-center rounded-xl bg-white p-4 shadow-sm">
          <Text className="mb-2 text-sm font-medium text-gray-500">カテゴリ別内訳</Text>
          <PieChart
            data={chartData}
            width={screenWidth - 64}
            height={200}
            chartConfig={{
              color: () => "#333",
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="0"
          />
        </View>
      ) : (
        <View className="items-center rounded-xl bg-white p-6">
          <Text className="text-gray-400">まだ支出がありません</Text>
        </View>
      )}
    </View>
  );
}
