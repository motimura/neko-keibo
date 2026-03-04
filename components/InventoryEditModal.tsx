import { useState } from "react";
import { View, Text, TextInput, Pressable, Modal, Alert } from "react-native";
import type { InventoryItem, InventoryStatus } from "../types/inventory";
import {
  INVENTORY_STATUS_LABELS,
  INVENTORY_STATUS_EMOJI,
  INVENTORY_STATUS_COLORS,
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
} from "../utils/constants";
import { INVENTORY_STATUSES } from "../types/inventory";

interface InventoryEditModalProps {
  item: InventoryItem | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, updates: { status?: InventoryStatus; averageConsumptionDays?: number }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function InventoryEditModal({
  item,
  visible,
  onClose,
  onSave,
  onDelete,
}: InventoryEditModalProps) {
  const [status, setStatus] = useState<InventoryStatus>("sufficient");
  const [avgDays, setAvgDays] = useState("");
  const [saving, setSaving] = useState(false);

  const handleOpen = () => {
    if (item) {
      setStatus(item.status);
      setAvgDays(item.averageConsumptionDays ? String(item.averageConsumptionDays) : "");
    }
  };

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const days = avgDays ? parseInt(avgDays, 10) : undefined;
      if (avgDays && (!days || days <= 0)) {
        Alert.alert("入力エラー", "消費日数は1以上の整数を入力してください");
        return;
      }
      await onSave(item.id, { status, averageConsumptionDays: days });
      onClose();
    } catch (e) {
      Alert.alert("エラー", (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!item) return;
    Alert.alert("削除確認", `「${item.itemName}」を在庫から削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          await onDelete(item.id);
          onClose();
        },
      },
    ]);
  };

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onShow={handleOpen}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white p-4">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-lg font-bold">在庫詳細</Text>
          <Pressable onPress={onClose}>
            <Text className="text-base text-gray-500">閉じる</Text>
          </Pressable>
        </View>

        <View className="mb-4 rounded-lg bg-gray-50 p-4">
          <Text className="text-lg font-bold">
            {CATEGORY_EMOJI[item.category]} {item.itemName}
          </Text>
          <Text className="mt-1 text-sm text-gray-500">
            {CATEGORY_LABELS[item.category]}
          </Text>
          {item.lastPurchasedAt && (
            <Text className="mt-1 text-sm text-gray-400">
              最終購入日: {item.lastPurchasedAt}
            </Text>
          )}
          {item.nextPurchaseDate && (
            <Text className="mt-1 text-sm text-gray-400">
              次回購入予定: {item.nextPurchaseDate}
            </Text>
          )}
        </View>

        <Text className="mb-2 text-sm font-medium text-gray-600">ステータス</Text>
        <View className="mb-4 flex-row gap-2">
          {INVENTORY_STATUSES.map((s) => (
            <Pressable
              key={s}
              onPress={() => setStatus(s)}
              className="flex-1 rounded-lg py-3"
              style={{
                backgroundColor: status === s ? INVENTORY_STATUS_COLORS[s] : "#f3f4f6",
              }}
            >
              <Text
                className="text-center text-sm font-bold"
                style={{ color: status === s ? "#fff" : "#666" }}
              >
                {INVENTORY_STATUS_EMOJI[s]} {INVENTORY_STATUS_LABELS[s]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="mb-2 text-sm font-medium text-gray-600">
          平均消費日数 (日)
        </Text>
        <TextInput
          value={avgDays}
          onChangeText={setAvgDays}
          placeholder="例: 30"
          keyboardType="number-pad"
          className="mb-6 rounded-lg border border-gray-200 px-3 py-3"
        />

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="rounded-lg bg-red-400 py-4"
          style={{ opacity: saving ? 0.5 : 1 }}
        >
          <Text className="text-center text-base font-bold text-white">保存</Text>
        </Pressable>

        <Pressable onPress={handleDelete} className="mt-3 py-3">
          <Text className="text-center text-red-500">削除する</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
