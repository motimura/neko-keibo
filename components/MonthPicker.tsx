import { View, Text, Pressable } from "react-native";
import { format, addMonths, subMonths, parse } from "date-fns";
import { ja } from "date-fns/locale";

interface MonthPickerProps {
  month: string;
  onChangeMonth: (month: string) => void;
}

export default function MonthPicker({ month, onChangeMonth }: MonthPickerProps) {
  const date = parse(month, "yyyy-MM", new Date());
  const label = format(date, "yyyy年M月", { locale: ja });

  const goPrev = () => onChangeMonth(format(subMonths(date, 1), "yyyy-MM"));
  const goNext = () => onChangeMonth(format(addMonths(date, 1), "yyyy-MM"));

  return (
    <View className="flex-row items-center justify-center gap-4 py-3">
      <Pressable onPress={goPrev} className="px-3 py-1">
        <Text className="text-2xl">◀</Text>
      </Pressable>
      <Text className="text-xl font-bold">{label}</Text>
      <Pressable onPress={goNext} className="px-3 py-1">
        <Text className="text-2xl">▶</Text>
      </Pressable>
    </View>
  );
}
