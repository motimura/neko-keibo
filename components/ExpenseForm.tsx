import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert, Switch } from "react-native";
import { format } from "date-fns";
import CalendarPicker from "./CalendarPicker";
import { EXPENSE_CATEGORIES, type ExpenseCategory, type Expense } from "../types/expense";
import { CATEGORY_LABELS, CATEGORY_EMOJI, CONSUMABLE_CATEGORIES } from "../utils/constants";
import { validateCreateExpense } from "../utils/validator";
import ReminderSetting from "./ReminderSetting";

interface ExpenseFormProps {
  onSubmit: (data: {
    category: ExpenseCategory;
    amount: number;
    itemName: string;
    expenseDate: string;
    memo?: string;
  }) => Promise<void>;
  editTarget?: Expense | null;
  onCancelEdit?: () => void;
  showInventoryToggle?: boolean;
  inventoryToggleValue?: boolean;
  onInventoryToggleChange?: (on: boolean) => void;
  onCategoryChange?: (cat: ExpenseCategory) => void;
  showReminderSetting?: boolean;
  reminderEnabled?: boolean;
  onReminderEnabledChange?: (on: boolean) => void;
  reminderDays?: number | null;
  onReminderDaysChange?: (days: number | null) => void;
}

export default function ExpenseForm({
  onSubmit,
  editTarget,
  onCancelEdit,
  showInventoryToggle,
  inventoryToggleValue,
  onInventoryToggleChange,
  onCategoryChange,
  showReminderSetting,
  reminderEnabled,
  onReminderEnabledChange,
  reminderDays,
  onReminderDaysChange,
}: ExpenseFormProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [amount, setAmount] = useState("");
  const [itemName, setItemName] = useState("");
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  useEffect(() => {
    if (editTarget) {
      setCategory(editTarget.category);
      setAmount(String(editTarget.amount));
      setItemName(editTarget.itemName);
      setExpenseDate(editTarget.expenseDate);
      setMemo(editTarget.memo);
    }
  }, [editTarget]);

  const handleCategoryChange = (cat: ExpenseCategory) => {
    setCategory(cat);
    onCategoryChange?.(cat);
  };

  const reset = () => {
    setCategory("food");
    setAmount("");
    setItemName("");
    setExpenseDate(format(new Date(), "yyyy-MM-dd"));
    setMemo("");
  };

  const handleSubmit = async () => {
    const result = validateCreateExpense({
      category,
      amount: Number(amount),
      itemName,
      expenseDate,
      memo,
    });

    if ("errors" in result) {
      Alert.alert("入力エラー", result.errors.map((e) => e.message).join("\n"));
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(result.data);
      if (!editTarget) {
        reset();
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    } catch (e) {
      Alert.alert("エラー", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView ref={scrollRef} className="flex-1 p-4" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      {editTarget && (
        <View className="mb-4 rounded-lg px-4 py-3" style={{ backgroundColor: '#FFF8E1' }}>
          <Text className="text-base font-bold text-amber-700">
            ✏️ 編集中: {editTarget.itemName}
          </Text>
        </View>
      )}
      <Text className="mb-2 text-base font-medium text-gray-600">カテゴリ</Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {EXPENSE_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => handleCategoryChange(cat)}
            className={`rounded-2xl px-4 py-3 ${category === cat ? "bg-red-100 border-2 border-red-400" : "bg-gray-100"}`}
          >
            <Text className={`text-lg ${category === cat ? "font-bold" : ""}`}>
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

      <Text className="mb-2 text-base font-medium text-gray-600">金額 (円)</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
        keyboardType="number-pad"
        className={`rounded-lg border px-3 py-3 ${amount !== "" && Number(amount) <= 0 ? "border-red-400" : "border-gray-200"}`}
      />
      {amount !== "" && Number(amount) <= 0 && (
        <Text className="mt-1 text-sm text-red-500">1円以上を入力してください</Text>
      )}
      <View className="mb-4" />

      <Text className="mb-2 text-base font-medium text-gray-600">日付</Text>
      <Pressable
        onPress={() => setDatePickerVisible(true)}
        className="mb-4 rounded-lg border border-gray-200 px-3 py-3"
      >
        <Text className="text-lg text-gray-900">📅 {expenseDate}</Text>
      </Pressable>
      <CalendarPicker
        visible={datePickerVisible}
        date={new Date(expenseDate + "T00:00:00")}
        onConfirm={(date) => {
          setExpenseDate(format(date, "yyyy-MM-dd"));
          setDatePickerVisible(false);
        }}
        onCancel={() => setDatePickerVisible(false)}
      />

      <Text className="mb-2 text-base font-medium text-gray-600">メモ (任意)</Text>
      <TextInput
        value={memo}
        onChangeText={setMemo}
        placeholder="メモ"
        multiline
        className="mb-4 rounded-lg border border-gray-200 px-3 py-3"
      />

      {showInventoryToggle && (
        <View className="mb-6 flex-row items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
          <View>
            <Text className="text-base font-medium text-gray-700">在庫に追加</Text>
            <Text className="text-sm text-gray-400">購入品を在庫管理に登録します</Text>
          </View>
          <Switch
            value={inventoryToggleValue}
            onValueChange={onInventoryToggleChange}
            trackColor={{ false: "#ccc", true: "#FF6B6B" }}
          />
        </View>
      )}

      {showReminderSetting && onReminderEnabledChange && onReminderDaysChange && (
        <ReminderSetting
          enabled={reminderEnabled ?? false}
          onEnabledChange={onReminderEnabledChange}
          days={reminderDays ?? null}
          onDaysChange={onReminderDaysChange}
        />
      )}

      <Pressable
        onPress={handleSubmit}
        disabled={submitting || (amount !== "" && Number(amount) <= 0)}
        className="rounded-lg bg-red-400 py-4"
        style={{ opacity: submitting || (amount !== "" && Number(amount) <= 0) ? 0.5 : 1 }}
      >
        <Text className="text-center text-lg font-bold text-white">
          {editTarget ? "更新する" : "登録する"}
        </Text>
      </Pressable>

      {editTarget && onCancelEdit && (
        <Pressable onPress={onCancelEdit} className="mt-3 py-3">
          <Text className="text-center text-gray-500">キャンセル</Text>
        </Pressable>
      )}

      <View className="h-32" />
    </ScrollView>
  );
}
