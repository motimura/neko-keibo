import type { CatalogItem, CatalogCategory } from '../types/catalog';
import { normalizeQuery } from './catalogSearch';

export function item(
  category: CatalogCategory,
  brand: string,
  productName: string,
  size: string,
  amount: number,
  options: Pick<CatalogItem, 'suggestionLabel' | 'inputName'> = {},
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
    ...options,
  };
}

function templateItem(brand: string, size: string, amount: number): CatalogItem {
  return item('food', brand, '詳細入力', size, amount, {
    suggestionLabel: `${brand} ${size}（詳細を追記）`,
    inputName: `${brand}  ${size}`,
  });
}

export const CATALOG: CatalogItem[] = [
  // ロイヤルカナン
  templateItem('ロイヤルカナン', '400g', 1200),
  templateItem('ロイヤルカナン', '500g', 1600),
  templateItem('ロイヤルカナン', '1.5kg', 3800),
  templateItem('ロイヤルカナン', '2kg', 4000),
  templateItem('ロイヤルカナン', '3.5kg', 7800),
  templateItem('ロイヤルカナン', '4kg', 6500),
  templateItem('ロイヤルカナン', '10kg', 13500),
  item('food', 'ロイヤルカナン', 'インドア', '2kg', 3800),
  item('food', 'ロイヤルカナン', '満腹感サポート', '2kg', 3500),
  // アーテミス
  item('food', 'アーテミス', 'フレッシュミックス', '2kg', 4200),
  // ブリスミックス
  item('food', 'ブリスミックス', 'キャット チキン', '1kg', 2800),
  // ジウィ
  item('food', 'ジウィ', 'エアドライ キャット ラム', '400g', 4500),
  // キアオラ
  item('food', 'キアオラ', 'キャット カンガルー', '400g', 3800),
  // ニュートロ シュプレモ
  templateItem('ニュートロ', '400g', 1300),
  templateItem('ニュートロ', '500g', 1500),
  templateItem('ニュートロ', '1kg', 2600),
  templateItem('ニュートロ', '2kg', 3300),
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
  // ナウフレッシュ
  item('food', 'ナウフレッシュ', 'アダルトキャット', '1.81kg', 4800),
  // ファーストメイト
  item('food', 'ファーストメイト', 'オリジナル ウィズ チキン', '2.27kg', 6200),
  // アカナ
  item('food', 'アカナ', 'ワイルドプレイリーキャット', '1.8kg', 5500),
  // オリジン
  item('food', 'オリジン', 'キャット&キトゥン', '1.8kg', 6800),
  // ハッピードッグ
  item('food', 'ハッピードッグ', 'スプリーム キャット', '1.5kg', 3200),
  // ハッピーキャット
  item('food', 'ハッピーキャット', 'ミンカス アダルト', '1.5kg', 2800),
  // ベッツソリューション
  item('food', 'ベッツソリューション', 'ハイポアレルゲン 馬肉', '400g', 1800),
  // ビオリオーブ
  item('food', 'ビオリオーブ', 'スターターキャット', '1.6kg', 3200),
  // プロフェッショナル・バランス
  item('food', 'プロフェッショナル・バランス', '7歳から シニアサポート', '1.4kg', 1800),
  // シーバ
  templateItem('シーバ', '85g', 280),
  templateItem('シーバ', '88g', 280),
  templateItem('シーバ', '200g', 480),
  templateItem('シーバ', '12g×20本', 780),
  item('food', 'シーバ', 'デュオ 香りのまぐろ味', '200g', 480),
  // モンプチ
  templateItem('モンプチ', '35g', 120),
  templateItem('モンプチ', '85g', 180),
  templateItem('モンプチ', '144g', 680),
  templateItem('モンプチ', '240g', 580),
  item('food', 'モンプチ', 'バッグ ささみ&チキン', '240g', 580),
  // カルカン
  templateItem('カルカン', '70g', 100),
  templateItem('カルカン', '800g', 980),
  templateItem('カルカン', '1.6kg', 1480),
  item('food', 'カルカン', 'パウチ かつお', '70g', 100),
  // ピュリナワン
  templateItem('ピュリナワン', '500g', 680),
  templateItem('ピュリナワン', '800g', 980),
  templateItem('ピュリナワン', '1.6kg', 1980),
  templateItem('ピュリナワン', '2kg', 2100),
  templateItem('ピュリナワン', '2.2kg', 2380),
  templateItem('ピュリナワン', '3.4kg', 3280),
  item('food', 'ピュリナワン', '室内飼い 美味な味わい', '2kg', 1980),
  // アイムス
  item('food', 'アイムス', '成猫用 まぐろ味', '1.5kg', 1480),
  // ユニ・チャーム
  item('litter', 'ユニ・チャーム', 'デオトイレ シート 詳細入力', '枚数未入力', 980, {
    suggestionLabel: 'デオトイレ シート（枚数を追記）',
    inputName: 'デオトイレ シート ',
  }),
  item('litter', 'ユニ・チャーム', 'デオトイレ 飛び散らない消臭サンド', '4L', 1680),
  item('litter', 'ユニ・チャーム', 'デオサンド 複数ねこ用 紙砂', '10L', 1080),
  // 花王
  item('litter', '花王', 'ニャンとも清潔トイレ 脱臭シート', '12枚', 980),
  item('litter', '花王', 'ニャンとも清潔トイレ チップ 詳細入力', '4.4L', 1580, {
    suggestionLabel: 'ニャンとも チップ（粒サイズを追記）',
    inputName: 'ニャンとも清潔トイレ チップ 4.4L',
  }),
  item('litter', '花王', 'ニャンとも清潔トイレ 脱臭・抗菌マット', '6枚', 980),
  // アイリスオーヤマ
  item('litter', 'アイリスオーヤマ', '脱臭サンド 紙製', '7L', 780),
  item('litter', 'アイリスオーヤマ', 'ペットシーツ レギュラー', '160枚', 1580),
  item('litter', 'アイリスオーヤマ', 'ペットシーツ ワイド', '80枚', 1480),
  item('litter', 'アイリスオーヤマ', 'ウッディフレッシュ', '7L', 780),
  // ライオン商事
  item('litter', 'ライオン商事', 'ニオイをとる砂', '5L', 980),
  item('litter', 'ライオン商事', 'シュシュット おしっこ汚れ専用', '200ml', 580),
  item('litter', 'ライオン商事', 'ペットキレイ 除菌できるふきとりフォーム', '250ml', 680),
  // ペティオ
  item('litter', 'ペティオ', 'ペットシーツ ワイド', '54枚', 1280),
  item('litter', 'ペティオ', '猫用おしりふき', '60枚', 480),
  item('litter', 'ペティオ', '猫用ウェットティッシュ', '70枚', 480),
  item('litter', 'ペティオ', 'necoco 汚れとりウェットシート', '30枚', 420),
  // マルカン
  item('litter', 'マルカン', 'ペットシーツ薄型 レギュラー', '200枚', 1480),
  item('litter', 'マルカン', 'ペットシーツ厚型 ワイド', '80枚', 1380),
  item('litter', 'マルカン', '毎日消臭シート レギュラー', '30枚', 780),
  item('litter', 'マルカン', '爪とぎボード', '1個', 580),
  // ドギーマン
  item('litter', 'ドギーマン', 'お部屋の消臭スプレー 猫用', '270ml', 580),
  item('litter', 'ドギーマン', '猫用ウェットティッシュ', '100枚', 580),
  item('litter', 'ドギーマン', '流せるウェットティッシュ', '70枚', 480),
  item('litter', 'ドギーマン', 'ハヤシ じゃれ猫 猫のお遊び草', '2本', 420),
  // 猫壱
  item('litter', '猫壱', '猫用ペーパーバスマット', '3枚', 680),
  item('litter', '猫壱', 'チャージアップ爪とぎ', '1個', 980),
  item('litter', '猫壱', 'バリバリボウル 交換用つめとぎ', '2個', 1280),
  item('litter', '猫壱', 'バリバリベッド 交換用つめとぎ', '2個', 1180),
  // リッチェル
  item('litter', 'リッチェル', 'ペットシーツ 厚型 ワイド', '40枚', 1280),
  item('litter', 'リッチェル', 'コロル 爪とぎボード', '1個', 880),
  item('litter', 'リッチェル', 'ペット用ウォーターディッシュ 交換フィルター', '3個', 780),
  item('litter', 'リッチェル', 'コロル ネコトイレ用スコップ', '1個', 380),
  // ジェックス
  item('litter', 'ジェックス', 'ピュアクリスタル 交換用フィルター', '3個', 980),
  item('litter', 'ジェックス', 'ピュアクリスタル 交換用カートリッジ', '2個', 1280),
  item('litter', 'ジェックス', 'ピュアクリスタル 軟水化フィルター', '4個', 1180),
  item('litter', 'ジェックス', 'ピュアクリスタル 活性炭フィルター', '3個', 980),
];
