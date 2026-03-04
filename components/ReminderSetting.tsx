import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, Switch } from "react-native";

type Unit = "days" | "weeks" | "months";

const UNITS: { key: Unit; label: string }[] = [
  { key: "days", label: "日後" },
  { key: "weeks", label: "週間後" },
  { key: "months", label: "ヶ月後" },
];

function toDays(value: number, unit: Unit): number {
  switch (unit) {
    case "days":
      return value;
    case "weeks":
      return value * 7;
    case "months":
      return value * 30;
  }
}

interface ReminderSettingProps {
  enabled: boolean;
  onEnabledChange: (on: boolean) => void;
  days: number | null;
  onDaysChange: (days: number | null) => void;
}

export default function ReminderSetting({
  enabled,
  onEnabledChange,
  days,
  onDaysChange,
}: ReminderSettingProps) {
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<Unit>("days");

  useEffect(() => {
    if (days && days > 0) {
      if (days % 30 === 0) {
        setValue(String(days / 30));
        setUnit("months");
      } else if (days % 7 === 0) {
        setValue(String(days / 7));
        setUnit("weeks");
      } else {
        setValue(String(days));
        setUnit("days");
      }
    }
  }, []);

  const handleValueChange = (text: string) => {
    setValue(text);
    const num = parseInt(text, 10);
    if (num > 0) {
      onDaysChange(toDays(num, unit));
    } else {
      onDaysChange(null);
    }
  };

  const handleUnitChange = (newUnit: Unit) => {
    setUnit(newUnit);
    const num = parseInt(value, 10);
    if (num > 0) {
      onDaysChange(toDays(num, newUnit));
    }
  };

  return (
    <View className="mb-6 rounded-lg bg-gray-50 px-4 py-3">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-sm font-medium text-gray-700">通知を設定する</Text>
          <Text className="text-xs text-gray-400">買い替え時期をリマインドします</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onEnabledChange}
          trackColor={{ false: "#ccc", true: "#FF6B6B" }}
        />
      </View>

      {enabled && (
        <View className="mt-3">
          <TextInput
            value={value}
            onChangeText={handleValueChange}
            placeholder="数値を入力"
            keyboardType="number-pad"
            className="mb-3 rounded-lg border border-gray-200 bg-white px-3 py-3"
          />
          <View className="flex-row gap-2">
            {UNITS.map((u) => (
              <Pressable
                key={u.key}
                onPress={() => handleUnitChange(u.key)}
                className={`flex-1 rounded-lg py-2 ${unit === u.key ? "bg-red-400" : "bg-gray-200"}`}
              >
                <Text
                  className={`text-center text-sm font-bold ${unit === u.key ? "text-white" : "text-gray-600"}`}
                >
                  {u.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
