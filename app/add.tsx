import { useState } from "react";
import { View, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useExpenseStore } from "../stores/useExpenseStore";
import ExpenseForm from "../components/ExpenseForm";
import { CONSUMABLE_CATEGORIES, CATEGORY_EMOJI } from "../utils/constants";
import { scheduleReminder } from "../utils/notifications";
import type { ExpenseCategory } from "../types/expense";

export default function AddScreen() {
  const addExpense = useExpenseStore((s) => s.addExpense);
  const editExpense = useExpenseStore((s) => s.editExpense);
  const router = useRouter();
  const [linkInventory, setLinkInventory] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState<number | null>(null);

  const handleSubmit = async (data: Parameters<typeof addExpense>[0]) => {
    const finalReminderDays =
      reminderEnabled && reminderDays && reminderDays > 0 ? reminderDays : undefined;

    const expense = await addExpense(
      { ...data, reminderDays: finalReminderDays },
      linkInventory
    );

    if (finalReminderDays) {
      const emoji = CATEGORY_EMOJI[data.category] || "📦";
      const notificationId = await scheduleReminder(
        data.itemName,
        emoji,
        finalReminderDays,
        expense.id
      );
      await editExpense(expense.id, { notificationId });
    }

    router.back();
  };

  const handleCategoryChange = (cat: ExpenseCategory) => {
    setLinkInventory(CONSUMABLE_CATEGORIES.includes(cat));
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3">
        <Text className="text-lg font-bold">支出登録</Text>
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          hitSlop={8}
        >
          <Text className="text-lg text-gray-500">✕</Text>
        </Pressable>
      </View>
      <ExpenseForm
        onSubmit={handleSubmit}
        showInventoryToggle
        inventoryToggleValue={linkInventory}
        onInventoryToggleChange={setLinkInventory}
        onCategoryChange={handleCategoryChange}
        showReminderSetting
        reminderEnabled={reminderEnabled}
        onReminderEnabledChange={setReminderEnabled}
        reminderDays={reminderDays}
        onReminderDaysChange={setReminderDays}
      />
    </SafeAreaView>
  );
}
