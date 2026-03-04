import { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { useExpenseStore } from "../stores/useExpenseStore";
import type { Expense } from "../types/expense";
import MonthPicker from "../components/MonthPicker";
import ExpenseList from "../components/ExpenseList";
import ExpenseForm from "../components/ExpenseForm";

export default function ExpensesScreen() {
  const { currentMonth, setMonth, expenses, fetchExpenses, removeExpense, editExpense, ready } =
    useExpenseStore();
  const [editTarget, setEditTarget] = useState<Expense | null>(null);

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
    <View className="flex-1 bg-gray-50">
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
    </View>
  );
}
