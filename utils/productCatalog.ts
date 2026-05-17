import type { CatalogItem, CatalogCategory } from '../types/catalog';
import { normalizeQuery } from './catalogSearch';

export function item(
  category: CatalogCategory,
  brand: string,
  productName: string,
  size: string,
  amount: number,
): CatalogItem {
  const displayName = `${brand} ${productName} ${size}`;
  const id = `${brand}-${productName}-${size}`.replace(/\s+/g, '_');
  return {
    id,
    category,
    brand,
    productName,
    size,
    amount,
    displayName,
    searchKey: normalizeQuery(displayName),
  };
}

export const CATALOG: CatalogItem[] = [
  // ロイヤルカナン
  item('food', 'ロイヤルカナン', 'インドア', '2kg', 3800),
  item('food', 'ロイヤルカナン', 'インドア', '4kg', 6500),
  item('food', 'ロイヤルカナン', '満腹感サポート', '2kg', 3500),
  // アーテミス
  item('food', 'アーテミス', 'フレッシュミックス', '2kg', 4200),
  // ブリスミックス
  item('food', 'ブリスミックス', 'キャット チキン', '1kg', 2800),
  // ジウィ
  item('food', 'ジウィ', 'エアドライ キャット ラム', '400g', 4500),
  item('food', 'ジウィ', 'エアドライ キャット マッカロー&ラム', '400g', 4800),
  // キアオラ
  item('food', 'キアオラ', 'キャット カンガルー', '400g', 3800),
  // ニュートロ シュプレモ
  item('food', 'ニュートロ シュプレモ', 'アダルト 成猫用', '2kg', 3200),
  // ニュートロ ナチュラルチョイス
  item('food', 'ニュートロ ナチュラルチョイス', 'アダルト チキン', '2kg', 3000),
  // ニュートロ ワイルドレシピ
  item('food', 'ニュートロ ワイルドレシピ', 'アダルト チキン', '2kg', 3400),
  // クプレラ
  item('food', 'クプレラ', 'ベニソン&スイートポテト キャット', '1kg', 3200),
  // フォルツァ10
  item('food', 'フォルツァ10', 'アクティブライン アダルト', '1.5kg', 3800),
  // ソリッドゴールド
  item('food', 'ソリッドゴールド', 'インディゴムーン', '1.8kg', 4500),
  // アニモンダ
  item('food', 'アニモンダ', 'インテグラ プロテクト 腎臓ケア', '1.2kg', 3500),
  // セレクトバランス
  item('food', 'セレクトバランス', 'アダルト チキン', '2.4kg', 3200),
  // アボダーム
  item('food', 'アボダーム', 'キャット オリジナル', '1.6kg', 2800),
  // ホリスティック・レセピー
  item('food', 'ホリスティック・レセピー', 'インドアキャット', '2kg', 2500),
  // iti
  item('food', 'iti', 'キャット ベニソン ディナー', '200g', 2800),
  // シシア
  item('food', 'シシア', 'ツナ&エビ', '85g', 350),
  item('food', 'シシア', 'ツナ&チキン', '85g', 350),
];
