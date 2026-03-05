import { View, Text, Pressable } from "react-native";
import { format, addMonths, subMonths, parse, isSameMonth, isAfter } from "date-fns";
import { ja } from "date-fns/locale";

interface MonthPickerProps {
  month: string;
  onChangeMonth: (month: string) => void;
}

export default function MonthPicker({ month, onChangeMonth }: MonthPickerProps) {
  const date = parse(month, "yyyy-MM", new Date());
  const label = format(date, "yyyy年M月", { locale: ja });
  const now = new Date();
  const isAtOrAfterCurrent = isSameMonth(date, now) || isAfter(date, now);

  const goPrev = () => onChangeMonth(format(subMonths(date, 1), "yyyy-MM"));
  const goNext = () => onChangeMonth(format(addMonths(date, 1), "yyyy-MM"));

  return (
    <View className="flex-row items-center justify-center gap-4 py-3">
      <Pressable onPress={goPrev} className="px-3 py-1" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text className="text-2xl">◀</Text>
      </Pressable>
      <Text className="text-xl font-bold">{label}</Text>
      <Pressable
        onPress={goNext}
        disabled={isAtOrAfterCurrent}
        className="px-3 py-1"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ opacity: isAtOrAfterCurrent ? 0.3 : 1 }}
      >
        <Text className="text-2xl">▶</Text>
      </Pressable>
    </View>
  );
}
