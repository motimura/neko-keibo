import { useState } from "react";
import { View, Pressable, Text } from "react-native";
import { Slot, useRouter, usePathname } from "expo-router";

const SEGMENTS = [
  { key: "expenses", label: "支出一覧" },
  { key: "inventory", label: "在庫管理" },
] as const;

export default function RecordsLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const active = pathname.includes("inventory") ? "inventory" : "expenses";

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row bg-white px-4 pb-2 pt-2">
        {SEGMENTS.map((seg) => (
          <Pressable
            key={seg.key}
            onPress={() => router.replace(`/(records)/${seg.key}`)}
            className={`flex-1 rounded-full py-2 ${active === seg.key ? "bg-red-400" : "bg-gray-100"}`}
            style={{ marginHorizontal: 4 }}
          >
            <Text
              className={`text-center text-sm font-bold ${active === seg.key ? "text-white" : "text-gray-600"}`}
            >
              {seg.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Slot />
    </View>
  );
}
