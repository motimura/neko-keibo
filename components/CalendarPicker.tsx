import { useState, useMemo } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { ja } from "date-fns/locale";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

interface CalendarPickerProps {
  visible: boolean;
  date: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

export default function CalendarPicker({ visible, date, onConfirm, onCancel }: CalendarPickerProps) {
  const [viewMonth, setViewMonth] = useState(date);
  const [selected, setSelected] = useState(date);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
    const result: Date[] = [];
    let current = start;
    while (current <= end) {
      result.push(current);
      current = addDays(current, 1);
    }
    return result;
  }, [viewMonth]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable onPress={onCancel} className="flex-1 items-center justify-center bg-black/40">
        <Pressable onPress={() => {}} className="mx-6 w-80 rounded-2xl bg-white p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Pressable onPress={() => setViewMonth(subMonths(viewMonth, 1))} className="px-3 py-1">
              <Text className="text-xl">◀</Text>
            </Pressable>
            <Text className="text-base font-bold">
              {format(viewMonth, "yyyy年M月", { locale: ja })}
            </Text>
            <Pressable onPress={() => setViewMonth(addMonths(viewMonth, 1))} className="px-3 py-1">
              <Text className="text-xl">▶</Text>
            </Pressable>
          </View>

          <View className="mb-1 flex-row">
            {WEEKDAYS.map((d, i) => (
              <View key={d} className="flex-1 items-center py-1">
                <Text className={`text-xs font-medium ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"}`}>
                  {d}
                </Text>
              </View>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {days.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, viewMonth);
              const isSelected = isSameDay(day, selected);
              const dayOfWeek = day.getDay();
              return (
                <Pressable
                  key={idx}
                  onPress={() => {
                    setSelected(day);
                    if (!isCurrentMonth) setViewMonth(day);
                  }}
                  className="items-center justify-center"
                  style={{ width: "14.28%", height: 40 }}
                >
                  <View
                    className={`h-8 w-8 items-center justify-center rounded-full ${isSelected ? "bg-red-400" : ""}`}
                  >
                    <Text
                      className={`text-sm ${
                        isSelected
                          ? "font-bold text-white"
                          : !isCurrentMonth
                            ? "text-gray-300"
                            : dayOfWeek === 0
                              ? "text-red-400"
                              : dayOfWeek === 6
                                ? "text-blue-400"
                                : "text-gray-800"
                      }`}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <Pressable onPress={() => setViewMonth(subMonths(viewMonth, 1))} className="rounded-lg bg-gray-100 px-4 py-2">
              <Text className="text-sm text-gray-600">◀ 前月</Text>
            </Pressable>
            <Pressable onPress={() => setViewMonth(addMonths(viewMonth, 1))} className="rounded-lg bg-gray-100 px-4 py-2">
              <Text className="text-sm text-gray-600">翌月 ▶</Text>
            </Pressable>
          </View>

          <View className="mt-3 flex-row justify-end gap-3">
            <Pressable onPress={onCancel} className="rounded-lg px-5 py-2">
              <Text className="text-sm text-gray-500">キャンセル</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(selected)}
              className="rounded-lg bg-red-400 px-5 py-2"
            >
              <Text className="text-sm font-bold text-white">確定</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
