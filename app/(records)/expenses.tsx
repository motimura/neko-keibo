import { useCallback, useRef, useMemo, useState } from "react";
import { View, Text, Pressable, Modal, PanResponder, Animated, Dimensions } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { format, addMonths, subMonths, parse, isSameMonth, isAfter } from "date-fns";
import { useExpenseStore } from "../../stores/useExpenseStore";

const SCREEN_WIDTH = Dimensions.get("window").width;
import type { Expense } from "../../types/expense";
import MonthPicker from "../../components/MonthPicker";
import ExpenseList from "../../components/ExpenseList";
import ExpenseForm from "../../components/ExpenseForm";

export default function ExpensesScreen() {
  const { currentMonth, setMonth, expenses, fetchExpenses, removeExpense, editExpense, ready } =
    useExpenseStore();
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
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
      fetchExpenses();
    }, [ready, currentMonth, fetchExpenses])
  );

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <View className="flex-1">
      <MonthPicker month={currentMonth} onChangeMonth={setMonth} />
      <View className="flex-row items-center justify-between px-4 pb-2">
        <Text className="text-base text-gray-500">{expenses.length}件</Text>
        <Text className="text-base font-bold">合計 ¥{total.toLocaleString()}</Text>
      </View>
      <Animated.View
        style={{ flex: 1, transform: [{ translateX }], opacity }}
        {...panResponder.panHandlers}
      >
        <ExpenseList
          expenses={expenses}
          onDelete={removeExpense}
          onEdit={setEditTarget}
        />
      </Animated.View>
      <Pressable
        onPress={() => router.push("/add")}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-red-400 shadow-lg"
        style={{ elevation: 5 }}
      >
        <Text className="text-2xl font-bold text-white">＋</Text>
      </Pressable>

      <Modal
        visible={editTarget !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditTarget(null)}
      >
        {editTarget && (
          <ExpenseForm
            editTarget={editTarget}
            onSubmit={async (data) => {
              await editExpense(editTarget.id, data);
              setEditTarget(null);
            }}
            onCancelEdit={() => setEditTarget(null)}
          />
        )}
      </Modal>
    </View>
  );
}
