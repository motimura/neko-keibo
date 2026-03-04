import { useCallback, useState } from "react";
import { View, Pressable, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { useExpenseStore } from "../../stores/useExpenseStore";
import { useInventoryStore } from "../../stores/useInventoryStore";
import type { InventoryItem, InventoryStatus } from "../../types/inventory";
import InventoryList from "../../components/InventoryList";
import InventoryEditModal from "../../components/InventoryEditModal";
import InventoryForm from "../../components/InventoryForm";

export default function InventoryScreen() {
  const ready = useExpenseStore((s) => s.ready);
  const { items, fetchItems, addItem, editItem, removeItem, refreshStatuses } =
    useInventoryStore();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      refreshStatuses();
    }, [ready, refreshStatuses])
  );

  const handlePress = (item: InventoryItem) => {
    setSelectedItem(item);
    setModalVisible(true);
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

  if (showForm) {
    return (
      <InventoryForm
        onSubmit={async (data) => {
          await addItem(data);
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
          <Text className="text-base font-bold text-white">＋ 追加</Text>
        </Pressable>
      </View>

      <InventoryList items={items} onPress={handlePress} />

      <InventoryEditModal
        item={selectedItem}
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedItem(null);
        }}
        onSave={handleSave}
        onDelete={handleDelete}
        onRepurchase={async (item) => {
          await useInventoryStore.getState().repurchaseFromInventory(item);
        }}
      />
    </View>
  );
}
