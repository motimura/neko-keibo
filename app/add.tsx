import { useState } from "react";
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

    router.navigate("/");
  };

  const handleCategoryChange = (cat: ExpenseCategory) => {
    setLinkInventory(CONSUMABLE_CATEGORIES.includes(cat));
  };

  return (
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
  );
}
