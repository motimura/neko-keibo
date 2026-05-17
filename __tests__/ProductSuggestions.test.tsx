import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProductSuggestions from '../components/ProductSuggestions';
import { item } from '../utils/productCatalog';

const TEST_CATALOG = [
  item('food', 'ロイヤルカナン', 'インドア', '2kg', 3800),
  item('food', 'ロイヤルカナン', '満腹感サポート', '2kg', 3500),
  item('litter', 'ユニ・チャーム', 'デオトイレ', '2L', 980),
];

describe('ProductSuggestions', () => {
  it('category=null では何もレンダリングしない', () => {
    const { toJSON } = render(
      <ProductSuggestions query="ロイ" category={null} onSelect={() => {}} catalog={TEST_CATALOG} />
    );
    expect(toJSON()).toBeNull();
  });

  it('空クエリでは何もレンダリングしない', () => {
    const { toJSON } = render(
      <ProductSuggestions query="" category="food" onSelect={() => {}} catalog={TEST_CATALOG} />
    );
    expect(toJSON()).toBeNull();
  });

  it('該当ありなら候補を表示する', () => {
    const { getByText } = render(
      <ProductSuggestions query="ロイ" category="food" onSelect={() => {}} catalog={TEST_CATALOG} />
    );
    expect(getByText('ロイヤルカナン インドア 2kg')).toBeTruthy();
    expect(getByText('¥3,800')).toBeTruthy();
  });

  it('該当なしなら "見つかりません" メッセージを表示する', () => {
    const { getByText } = render(
      <ProductSuggestions query="存在しない商品xyz" category="food" onSelect={() => {}} catalog={TEST_CATALOG} />
    );
    expect(getByText('該当する商品が見つかりません')).toBeTruthy();
  });

  it('タップで onSelect が正しい引数で呼ばれる', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <ProductSuggestions query="ロイ" category="food" onSelect={onSelect} catalog={TEST_CATALOG} />
    );
    fireEvent.press(getByText('ロイヤルカナン インドア 2kg'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].displayName).toBe('ロイヤルカナン インドア 2kg');
    expect(onSelect.mock.calls[0][0].amount).toBe(3800);
  });

  it('カテゴリで絞り込む（food で litter は表示しない）', () => {
    const { queryByText } = render(
      <ProductSuggestions query="デオ" category="food" onSelect={() => {}} catalog={TEST_CATALOG} />
    );
    expect(queryByText(/デオトイレ/)).toBeNull();
  });
});

import ExpenseForm from '../components/ExpenseForm';

describe('ExpenseForm × ProductSuggestions 統合', () => {
  it('food カテゴリで品名を入力するとサジェストが表示される', () => {
    const { getByPlaceholderText, getAllByText } = render(
      <ExpenseForm onSubmit={async () => {}} />
    );
    const input = getByPlaceholderText(/ロイヤルカナン/);
    fireEvent.changeText(input, 'ロイ');
    expect(getAllByText(/ロイヤルカナン/).length).toBeGreaterThan(0);
  });

  it('編集モードではサジェストが表示されない（カタログにヒットする品名でもUI出さず）', () => {
    const editTarget = {
      id: 'x', category: 'food' as const, amount: 3800,
      itemName: 'ロイヤルカナン インドア',
      expenseDate: '2026-05-17', memo: '', inventoryId: null,
      reminderDays: null, notificationId: null,
      createdAt: '2026-05-17T00:00:00Z', updatedAt: '2026-05-17T00:00:00Z',
    };
    const { queryByText } = render(
      <ExpenseForm onSubmit={async () => {}} editTarget={editTarget} />
    );
    expect(queryByText('ロイヤルカナン インドア 2kg')).toBeNull();
  });
});
