import { normalizeQuery } from '../utils/catalogSearch';

describe('normalizeQuery', () => {
  it('全角英数を半角に変換する', () => {
    expect(normalizeQuery('ＡＢＣ１２３')).toBe('abc123');
  });
  it('大文字を小文字に変換する', () => {
    expect(normalizeQuery('ROYAL CANIN')).toBe('royalcanin');
  });
  it('スペース（半角・全角）を除去する', () => {
    expect(normalizeQuery('ロイヤル カナン')).toBe('ロイヤルカナン');
    expect(normalizeQuery('ロイヤル　カナン')).toBe('ロイヤルカナン');
  });
  it('カタカナはそのまま保持する', () => {
    expect(normalizeQuery('ロイヤルカナン')).toBe('ロイヤルカナン');
  });
  it('空文字を渡したら空文字を返す', () => {
    expect(normalizeQuery('')).toBe('');
  });
  it('複合: 全角英数 + 大文字 + スペース', () => {
    expect(normalizeQuery('Royal Ｃａｎｉｎ ２kg')).toBe('royalcanin2kg');
  });
});
