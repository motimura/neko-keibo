import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert } from "react-native";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "../types/expense";
import type { InventoryStatus } from "../types/inventory";
import { INVENTORY_STATUSES } from "../types/inventory";
import {
  CATEGORY_LABELS,
  CATEGORY_EMOJI,
  INVENTORY_STATUS_LABELS,
  INVENTORY_STATUS_EMOJI,
  INVENTORY_STATUS_COLORS,
} from "../utils/constants";

interface InventoryFormProps {
  onSubmit: (data: {
    itemName: string;
    category: ExpenseCategory;
    status: InventoryStatus;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function InventoryForm({ onSubmit, onCancel }: InventoryFormProps) {
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [itemName, setItemName] = useState("");
  const [status, setStatus] = useState<InventoryStatus>("sufficient");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!itemName.trim()) {
      Alert.alert("入力エラー", "品名は必須です");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        itemName: itemName.trim(),
        category,
        status,
      });
    } catch (e) {
      Alert.alert("エラー", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 p-4">
      <Text className="mb-2 text-base font-medium text-gray-600">カテゴリ</Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {EXPENSE_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setCategory(cat)}
            className={`rounded-full px-3 py-2 ${category === cat ? "bg-red-100" : "bg-gray-100"}`}
          >
            <Text className={category === cat ? "font-bold" : ""}>
              {CATEGORY_EMOJI[cat]} {CATEGORY_LABELS[cat]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text className="mb-2 text-base font-medium text-gray-600">品名</Text>
      <TextInput
        value={itemName}
        onChangeText={setItemName}
        placeholder="例: ロイヤルカナン インドア 2kg"
        className="mb-4 rounded-lg border border-gray-200 px-3 py-3"
      />

      <Text className="mb-2 text-base font-medium text-gray-600">ステータス</Text>
      <View className="mb-6 flex-row gap-2">
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
              className="text-center text-base font-bold"
              style={{ color: status === s ? "#fff" : "#666" }}
            >
              {INVENTORY_STATUS_EMOJI[s]} {INVENTORY_STATUS_LABELS[s]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={submitting}
        className="rounded-lg bg-red-400 py-4"
        style={{ opacity: submitting ? 0.5 : 1 }}
      >
        <Text className="text-center text-lg font-bold text-white">追加する</Text>
      </Pressable>

      <Pressable onPress={onCancel} className="mt-3 py-3">
        <Text className="text-center text-gray-500">キャンセル</Text>
      </Pressable>
    </ScrollView>
  );
}
