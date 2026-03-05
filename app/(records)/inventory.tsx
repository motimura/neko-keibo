import { useCallback, useState } from "react";
import { View, Pressable, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { useExpenseStore } from "../../stores/useExpenseStore";
import { useInventoryStore } from "../../stores/useInventoryStore";
import type { InventoryItem, InventoryStatus } from "../../types/inventory";
import InventoryList from "../../components/InventoryList";
import InventoryEditModal from "../../components/InventoryEditModal";
import InventoryForm from "../../components/InventoryForm";
import { createExpense, getLatestExpenseByInventoryId, updateExpense } from "../../db/expenses";
import { updateStatusFromPurchase } from "../../db/inventory";
import { scheduleReminder, cancelReminder } from "../../utils/notifications";
import { CATEGORY_EMOJI } from "../../utils/constants";
import { format } from "date-fns";

export default function InventoryScreen() {
  const ready = useExpenseStore((s) => s.ready);
  const { items, fetchItems, addItem, editItem, removeItem, refreshStatuses } =
    useInventoryStore();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedReminderDays, setSelectedReminderDays] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      refreshStatuses();
    }, [ready, refreshStatuses])
  );

  const handlePress = async (item: InventoryItem) => {
    setSelectedItem(item);
    setSelectedReminderDays(null);
    setModalVisible(true);
    const db = useExpenseStore.getState().db;
    if (db) {
      const expense = await getLatestExpenseByInventoryId(db, item.id);
      setSelectedReminderDays(expense?.reminderDays ?? null);
    }
  };

  const handleSave = async (
    id: string,
    updates: { status?: InventoryStatus }
  ) => {
    await editItem(id, updates);
  };

  const handleDelete = async (id: string) => {
    await removeItem(id);
  };

  const handleUpdateReminder = async (inventoryId: string, days: number | null) => {
    const db = useExpenseStore.getState().db;
    if (!db) return;
    const expense = await getLatestExpenseByInventoryId(db, inventoryId);
    if (!expense) return;

    // Cancel old notification
    if (expense.notificationId) {
      try { await cancelReminder(expense.notificationId); } catch {}
    }

    // Schedule new notification if days > 0
    let newNotificationId: string | null = null;
    if (days && days > 0) {
      const item = items.find((i) => i.id === inventoryId);
      const emoji = CATEGORY_EMOJI[expense.category] || "📦";
      newNotificationId = await scheduleReminder(
        expense.itemName,
        emoji,
        days,
        expense.id
      );
    }

    // Update expense
    await updateExpense(db, expense.id, {
      reminderDays: days,
      notificationId: newNotificationId,
    });

    // Recalculate inventory status
    if (expense.expenseDate) {
      await updateStatusFromPurchase(db, inventoryId, expense.expenseDate);
    }

    await fetchItems();
  };

  if (showForm) {
    return (
      <InventoryForm
        onSubmit={async (data) => {
          const item = await addItem(data);
          if (data.reminderDays && data.reminderDays > 0 && item) {
            const db = useExpenseStore.getState().db;
            if (db) {
              const today = format(new Date(), "yyyy-MM-dd");
              const expense = await createExpense(db, {
                category: data.category,
                amount: 0,
                itemName: data.itemName,
                expenseDate: today,
                memo: "手持ち登録",
                inventoryId: item.id,
                reminderDays: data.reminderDays,
              });
              const emoji = CATEGORY_EMOJI[data.category] || "📦";
              const notificationId = await scheduleReminder(
                data.itemName,
                emoji,
                data.reminderDays,
                expense.id
              );
              await updateExpense(db, expense.id, { notificationId });
            }
          }
          setShowForm(false);
        }}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="text-base text-gray-500">{items.length}件</Text>
        <Pressable
          onPress={() => setShowForm(true)}
          className="rounded-full bg-red-400 px-4 py-2"
        >
          <Text className="text-base font-bold text-white">📦 手持ちを登録</Text>
        </Pressable>
      </View>

      <InventoryList items={items} onPress={handlePress} />

      <InventoryEditModal
        item={selectedItem}
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedItem(null);
          setSelectedReminderDays(null);
        }}
        onSave={handleSave}
        onDelete={handleDelete}
        onUpdateReminder={handleUpdateReminder}
        onRepurchase={async (item) => {
          await useInventoryStore.getState().repurchaseFromInventory(item);
        }}
        reminderDays={selectedReminderDays}
      />
    </View>
  );
}
