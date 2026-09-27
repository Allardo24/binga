export function placeItem(
  card: string[],
  index: number,
  item: string,
): string[] {
  const next = [...card];
  const previous = next.indexOf(item);
  if (previous >= 0) next[previous] = next[index];
  next[index] = item;
  return next;
}
export function lineProgress(card: string[], calls: string[]): number {
  const lines = [
    ...Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 4 }, (_, c) => r * 4 + c),
    ),
    ...Array.from({ length: 4 }, (_, c) =>
      Array.from({ length: 4 }, (_, r) => r * 4 + c),
    ),
    [0, 5, 10, 15],
    [3, 6, 9, 12],
  ];
  return Math.max(
    ...lines.map(
      (line) => line.filter((i) => card[i] && calls.includes(card[i])).length,
    ),
  );
}
