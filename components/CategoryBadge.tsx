import { View, Text } from "react-native";
import type { ExpenseCategory } from "../types/expense";
import { CATEGORY_LABELS, CATEGORY_EMOJI, CATEGORY_COLORS } from "../utils/constants";

interface CategoryBadgeProps {
  category: ExpenseCategory;
}

export default function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <View
      className="flex-row items-center rounded-full px-2 py-1"
      style={{ backgroundColor: CATEGORY_COLORS[category] + "30" }}
    >
      <Text className="mr-1">{CATEGORY_EMOJI[category]}</Text>
      <Text className="text-xs font-medium" style={{ color: CATEGORY_COLORS[category] }}>
        {CATEGORY_LABELS[category]}
      </Text>
    </View>
  );
}
