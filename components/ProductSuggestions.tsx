import { View, Text, Pressable } from 'react-native';
import type { CatalogItem, CatalogCategory } from '../types/catalog';
import { CATALOG } from '../utils/productCatalog';
import { searchCatalog } from '../utils/catalogSearch';

type Props = {
  query: string;
  category: CatalogCategory | null;
  onSelect: (item: CatalogItem) => void;
  catalog?: CatalogItem[];
};

export default function ProductSuggestions({ query, category, onSelect, catalog = CATALOG }: Props) {
  if (category === null) return null;
  if (query.trim().length === 0) return null;

  const results = searchCatalog(query, category, catalog);

  if (results.length === 0) {
    return (
      <View className="mb-4 rounded-lg border border-gray-200 px-3 py-3 bg-gray-50">
        <Text className="text-sm text-gray-500">該当する商品が見つかりません</Text>
      </View>
    );
  }

  return (
    <View className="mb-4 rounded-lg border border-gray-200 bg-white overflow-hidden">
      {results.map((it, idx) => (
        <Pressable
          key={it.id}
          onPress={() => onSelect(it)}
          className={`flex-row items-center justify-between px-3 py-3 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
          android_ripple={{ color: '#f3f4f6' }}
        >
          <Text className="flex-1 text-base text-gray-900" numberOfLines={1}>
            {it.suggestionLabel ?? it.displayName}
          </Text>
          <Text className="ml-3 text-base font-medium text-gray-600">
            ¥{it.amount.toLocaleString('ja-JP')}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
