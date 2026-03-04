import { View, Text, FlatList, Pressable, Alert } from "react-native";
import type { Expense } from "../types/expense";
import CategoryBadge from "./CategoryBadge";

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

export default function ExpenseList({ expenses, onDelete, onEdit }: ExpenseListProps) {
  const handleDelete = (expense: Expense) => {
    Alert.alert("削除確認", `「${expense.itemName}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      { text: "削除", style: "destructive", onPress: () => onDelete(expense.id) },
    ]);
  };

  if (expenses.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-10">
        <Text className="text-gray-400 text-lg">この月の支出はありません</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={expenses}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onEdit(item)}
          onLongPress={() => handleDelete(item)}
          className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3"
        >
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <CategoryBadge category={item.category} />
              <Text className="font-medium">{item.itemName}</Text>
              {item.reminderDays != null && (
                <Text className="text-base text-gray-400">🔔</Text>
              )}
            </View>
            <Text className="text-sm text-gray-400">{item.expenseDate}</Text>
          </View>
          <Text className="text-lg font-bold">¥{item.amount.toLocaleString()}</Text>
        </Pressable>
      )}
    />
  );
}
