export function normalizeQuery(input: string): string {
  return input.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}
