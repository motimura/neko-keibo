import { View, Text, SectionList, Pressable } from "react-native";
import { differenceInDays } from "date-fns";
import type { InventoryItem, InventoryStatus } from "../types/inventory";
import { CATEGORY_EMOJI } from "../utils/constants";
import {
  INVENTORY_STATUS_LABELS,
  INVENTORY_STATUS_EMOJI,
  INVENTORY_STATUS_COLORS,
} from "../utils/constants";

interface InventoryListProps {
  items: InventoryItem[];
  onPress: (item: InventoryItem) => void;
}

function buildSections(items: InventoryItem[]) {
  const statusOrder: InventoryStatus[] = ["critical", "low", "sufficient"];
  return statusOrder
    .map((status) => ({
      status,
      title: `${INVENTORY_STATUS_EMOJI[status]} ${INVENTORY_STATUS_LABELS[status]}`,
      color: INVENTORY_STATUS_COLORS[status],
      data: items.filter((i) => i.status === status),
    }))
    .filter((s) => s.data.length > 0);
}

function RemainingDays({ item }: { item: InventoryItem }) {
  if (!item.nextPurchaseDate) return null;
  const remaining = differenceInDays(new Date(item.nextPurchaseDate), new Date());
  if (remaining <= 0) {
    return <Text className="text-sm text-red-500">期限超過</Text>;
  }
  return <Text className="text-sm text-gray-400">あと{remaining}日</Text>;
}

export default function InventoryList({ items, onPress }: InventoryListProps) {
  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-xl">📦</Text>
        <Text className="mt-2 text-gray-400">在庫アイテムがありません</Text>
        <Text className="mt-2 text-center text-sm text-gray-300">
          フード・猫砂の支出を登録すると自動で追加されます
        </Text>
      </View>
    );
  }

  const sections = buildSections(items);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <View
          className="flex-row items-center justify-between px-4 py-2"
          style={{ backgroundColor: section.color + "20" }}
        >
          <Text className="text-base font-bold">{section.title}</Text>
          <Text className="text-sm text-gray-500">{section.data.length}件</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onPress(item)}
          className="flex-row items-center border-b border-gray-100 bg-white px-4 py-3"
        >
          <Text className="mr-2 text-xl">{CATEGORY_EMOJI[item.category]}</Text>
          <View className="flex-1">
            <Text className="text-base font-medium">{item.itemName}</Text>
            <View className="flex-row items-center gap-2">
              {item.lastPurchasedAt && (
                <Text className="text-sm text-gray-400">
                  最終購入: {item.lastPurchasedAt}
                </Text>
              )}
              <RemainingDays item={item} />
            </View>
          </View>
          <Text className="text-xl">›</Text>
        </Pressable>
      )}
      contentContainerStyle={{ paddingBottom: 32 }}
    />
  );
}
