import { useState, useCallback } from "react";
import { View, Text, Pressable, Alert, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { useExpenseStore } from "../stores/useExpenseStore";
import { exportToJSON, exportToCSV, getDataCounts, clearAllData } from "../utils/export";
import { pickJSONFile, pickCSVFile, importFromJSON, importFromCSV, type ImportMode } from "../utils/import";
import { rescheduleAllReminders } from "../utils/notifications";

export default function SettingsScreen() {
  const db = useExpenseStore((s) => s.db);
  const [counts, setCounts] = useState({ expenses: 0, inventory: 0, notifications: 0 });
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!db) return;
      getDataCounts(db).then(setCounts).catch(() => {});
    }, [db])
  );

  const withBusy = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const handleExportJSON = () =>
    withBusy(async () => {
      if (!db) return;
      await exportToJSON(db);
    });

  const handleExportCSV = () =>
    withBusy(async () => {
      if (!db) return;
      await exportToCSV(db);
    });

  const handleImportJSON = () => {
    Alert.alert("インポートモード", "既存データをどうしますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "上書き（全削除後にインポート）",
        style: "destructive",
        onPress: () => doImportJSON("overwrite"),
      },
      {
        text: "マージ（重複スキップ）",
        onPress: () => doImportJSON("merge"),
      },
    ]);
  };

  const doImportJSON = (mode: ImportMode) =>
    withBusy(async () => {
      if (!db) return;
      const content = await pickJSONFile();
      if (!content) return;
      try {
        const summary = await importFromJSON(db, content, mode);
        await rescheduleAllReminders(db).catch(() => {});
        const counts = await getDataCounts(db);
        setCounts(counts);
        Alert.alert(
          "インポート完了",
          `支出: ${summary.expenses}件\n在庫: ${summary.inventory}件\n通知: ${summary.notifications}件`
        );
      } catch (e) {
        Alert.alert("インポートエラー", (e as Error).message);
      }
    });

  const handleImportCSV = () =>
    withBusy(async () => {
      if (!db) return;
      const content = await pickCSVFile();
      if (!content) return;
      try {
        const summary = await importFromCSV(db, content);
        const counts = await getDataCounts(db);
        setCounts(counts);
        Alert.alert("インポート完了", `支出: ${summary.expenses}件をインポートしました`);
      } catch (e) {
        Alert.alert("インポートエラー", (e as Error).message);
      }
    });

  const handleClearAll = () => {
    Alert.alert("全データを削除", "本当にすべてのデータを削除しますか？\nこの操作は取り消せません。", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除する",
        style: "destructive",
        onPress: () => {
          Alert.alert("最終確認", "本当に削除してよろしいですか？", [
            { text: "キャンセル", style: "cancel" },
            {
              text: "完全に削除する",
              style: "destructive",
              onPress: async () => {
                if (!db) return;
                await clearAllData(db);
                setCounts({ expenses: 0, inventory: 0, notifications: 0 });
                Alert.alert("完了", "全データを削除しました");
              },
            },
          ]);
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      {busy && (
        <View className="mb-4 flex-row items-center justify-center gap-2 rounded-lg bg-blue-50 py-3">
          <ActivityIndicator size="small" />
          <Text className="text-sm text-blue-600">処理中...</Text>
        </View>
      )}

      <Text className="mb-2 text-xs font-medium uppercase text-gray-400">データ管理</Text>
      <View className="mb-6 rounded-xl bg-white">
        <SettingsButton
          label="JSONでバックアップ"
          description="全データをJSONファイルに保存"
          icon="📤"
          onPress={handleExportJSON}
        />
        <Divider />
        <SettingsButton
          label="CSVでエクスポート"
          description="支出データのみCSV形式で出力"
          icon="📊"
          onPress={handleExportCSV}
        />
        <Divider />
        <SettingsButton
          label="バックアップから復元"
          description="JSONファイルからデータを復元"
          icon="📥"
          onPress={handleImportJSON}
        />
        <Divider />
        <SettingsButton
          label="CSVからインポート"
          description="CSVファイルから支出をインポート"
          icon="📄"
          onPress={handleImportCSV}
        />
      </View>

      <Text className="mb-2 text-xs font-medium uppercase text-gray-400">データ削除</Text>
      <View className="mb-6 rounded-xl bg-white">
        <SettingsButton
          label="全データを削除"
          description="すべてのデータを完全に削除します"
          icon="🗑️"
          onPress={handleClearAll}
          destructive
        />
      </View>

      <Text className="mb-2 text-xs font-medium uppercase text-gray-400">アプリ情報</Text>
      <View className="mb-6 rounded-xl bg-white p-4">
        <Text className="mb-1 text-lg font-bold">猫計簿</Text>
        <Text className="mb-4 text-sm text-gray-500">Version 2.0.0</Text>
        <View className="gap-1">
          <Text className="text-sm text-gray-600">支出: {counts.expenses}件</Text>
          <Text className="text-sm text-gray-600">在庫: {counts.inventory}件</Text>
          <Text className="text-sm text-gray-600">通知: {counts.notifications}件</Text>
        </View>
        <Text className="mt-4 text-xs text-gray-400">
          猫にかかる費用を記録・管理するアプリです。{"\n"}
          データは端末内に保存されます。
        </Text>
      </View>
    </ScrollView>
  );
}

function SettingsButton({
  label,
  description,
  icon,
  onPress,
  destructive,
}: {
  label: string;
  description: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center px-4 py-3">
      <Text className="mr-3 text-lg">{icon}</Text>
      <View className="flex-1">
        <Text className={`text-base font-medium ${destructive ? "text-red-500" : ""}`}>{label}</Text>
        <Text className="text-xs text-gray-400">{description}</Text>
      </View>
      <Text className="text-gray-300">›</Text>
    </Pressable>
  );
}

function Divider() {
  return <View className="ml-12 border-b border-gray-100" />;
}
