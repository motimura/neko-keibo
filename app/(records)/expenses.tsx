import { useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useExpenseStore } from "../../stores/useExpenseStore";
import type { Expense } from "../../types/expense";
import MonthPicker from "../../components/MonthPicker";
import ExpenseList from "../../components/ExpenseList";
import ExpenseForm from "../../components/ExpenseForm";

export default function ExpensesScreen() {
  const { currentMonth, setMonth, expenses, fetchExpenses, removeExpense, editExpense, ready } =
    useExpenseStore();
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      fetchExpenses();
    }, [ready, currentMonth, fetchExpenses])
  );

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (editTarget) {
    return (
      <ExpenseForm
        editTarget={editTarget}
        onSubmit={async (data) => {
          await editExpense(editTarget.id, data);
          setEditTarget(null);
        }}
        onCancelEdit={() => setEditTarget(null)}
      />
    );
  }

  return (
    <View className="flex-1">
      <MonthPicker month={currentMonth} onChangeMonth={setMonth} />
      <View className="flex-row items-center justify-between px-4 pb-2">
        <Text className="text-sm text-gray-500">{expenses.length}件</Text>
        <Text className="text-sm font-bold">合計 ¥{total.toLocaleString()}</Text>
      </View>
      <ExpenseList
        expenses={expenses}
        onDelete={removeExpense}
        onEdit={setEditTarget}
      />
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
