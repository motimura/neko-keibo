import { useCallback, useRef, useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable, PanResponder, Animated, Dimensions } from "react-native";
import { useFocusEffect, Link, useRouter } from "expo-router";
import { format, addMonths, subMonths, parse, isSameMonth, isAfter } from "date-fns";
import { useExpenseStore } from "../stores/useExpenseStore";
import { useInventoryStore } from "../stores/useInventoryStore";
import { CATEGORY_LABELS, CATEGORY_EMOJI, CATEGORY_COLORS } from "../utils/constants";
import type { ExpenseCategory } from "../types/expense";
import MonthPicker from "../components/MonthPicker";
import Dashboard from "../components/Dashboard";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function HomeScreen() {
  const { currentMonth, setMonth, fetchSummary, summary, ready, yearlyByCategory, fetchYearlyByCategory } = useExpenseStore();
  const criticalCount = useInventoryStore((s) => s.criticalCount);
  const refreshStatuses = useInventoryStore((s) => s.refreshStatuses);
  const router = useRouter();
  const monthRef = useRef(currentMonth);
  monthRef.current = currentMonth;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const swipingRef = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gs) =>
          !swipingRef.current && Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 10,
        onPanResponderMove: (_, gs) => {
          const clamped = Math.max(-100, Math.min(100, gs.dx));
          translateX.setValue(clamped);
        },
        onPanResponderRelease: (_, gs) => {
          const cur = parse(monthRef.current, "yyyy-MM", new Date());
          if (gs.dx > 50) {
            swipingRef.current = true;
            Animated.timing(translateX, {
              toValue: SCREEN_WIDTH,
              duration: 150,
              useNativeDriver: true,
            }).start(() => {
              opacity.setValue(0);
              translateX.setValue(0);
              setMonth(format(subMonths(cur, 1), "yyyy-MM"));
              requestAnimationFrame(() => {
                Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start(() => {
                  swipingRef.current = false;
                });
              });
            });
          } else if (gs.dx < -50) {
            const now = new Date();
            if (!isSameMonth(cur, now) && !isAfter(cur, now)) {
              swipingRef.current = true;
              Animated.timing(translateX, {
                toValue: -SCREEN_WIDTH,
                duration: 150,
                useNativeDriver: true,
              }).start(() => {
                opacity.setValue(0);
                translateX.setValue(0);
                setMonth(format(addMonths(cur, 1), "yyyy-MM"));
                requestAnimationFrame(() => {
                  Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start(() => {
                    swipingRef.current = false;
                  });
                });
              });
            } else {
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
              }).start();
            }
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [setMonth, translateX, opacity]
  );

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      fetchSummary();
      fetchYearlyByCategory();
      refreshStatuses().catch(() => {});
    }, [ready, currentMonth, fetchSummary, fetchYearlyByCategory, refreshStatuses])
  );

  const yearlyEntries = Object.entries(yearlyByCategory) as [ExpenseCategory, number][];
  const yearlyTotal = yearlyEntries.reduce((sum, [, amount]) => sum + amount, 0);

  return (
    <View className="flex-1 bg-gray-50">
      <Animated.View style={{ flex: 1, transform: [{ translateX }], opacity }}>
        <ScrollView className="flex-1" {...panResponder.panHandlers}>
          {criticalCount > 0 && (
            <Link href="/(records)/inventory" asChild>
              <Pressable className="mx-4 mt-3 rounded-lg bg-red-50 px-4 py-3">
                <Text className="text-base font-bold text-red-600">
                  🔴 {criticalCount}件の在庫が切れそうです
                </Text>
              </Pressable>
            </Link>
          )}
          <MonthPicker month={currentMonth} onChangeMonth={setMonth} />
          <Dashboard summary={summary} />

          {summary && summary.totalAmount === 0 && yearlyTotal === 0 && (
            <View className="mx-4 mb-4 items-center rounded-xl bg-white p-6 shadow-sm">
              <Pressable
                onPress={() => router.push("/add")}
                className="rounded-lg bg-red-400 px-6 py-3"
              >
                <Text className="text-base font-bold text-white">最初の支出を記録する</Text>
              </Pressable>
            </View>
          )}

          {yearlyTotal > 0 && (
            <View className="mx-4 mb-4 rounded-xl bg-white p-4 shadow-sm">
              <Text className="mb-3 text-base font-medium text-gray-500">
                過去12ヶ月の支出
              </Text>
              <Text className="mb-3 text-2xl font-bold">
                ¥{yearlyTotal.toLocaleString()}
              </Text>
              {yearlyEntries.map(([cat, amount]) => (
                <View key={cat} className="mb-2 flex-row items-center">
                  <Text className="w-24 text-base">
                    {CATEGORY_EMOJI[cat]} {CATEGORY_LABELS[cat]}
                  </Text>
                  <View className="mx-3 h-5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <View
                      style={{
                        width: `${Math.round((amount / yearlyTotal) * 100)}%`,
                        backgroundColor: CATEGORY_COLORS[cat],
                      }}
                      className="h-full rounded-full"
                    />
                  </View>
                  <Text className="w-20 text-right text-sm text-gray-600">
                    ¥{amount.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View className="h-20" />
        </ScrollView>
      </Animated.View>
      <Pressable
        onPress={() => router.push("/add")}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-red-400 shadow-lg"
        style={{ elevation: 5 }}
      >
        <Text className="text-2xl font-bold text-white">＋</Text>
      </Pressable>
    </View>
  );
}
