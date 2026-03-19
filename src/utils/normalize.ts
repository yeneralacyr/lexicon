const transliterationTable: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
};

export function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[çğıİöşü]/g, (character) => transliterationTable[character] ?? character)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}
