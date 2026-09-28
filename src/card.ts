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

export function lineProgress(card: string[], calls: string[]): number {
  return Math.max(
    ...lines.map(
      (line) => line.filter((i) => card[i] && calls.includes(card[i])).length,
    ),
  );
}

export function cardHighlights(card: string[], calls: string[]) {
  const hit = new Set(calls);
  const near = new Set<number>();
  const missing = new Set<number>();
  const bingo = new Set<number>();
  for (const line of lines) {
    const marked = line.filter((index) => card[index] && hit.has(card[index]));
    if (marked.length === 4) line.forEach((index) => bingo.add(index));
    if (marked.length === 3) {
      marked.forEach((index) => near.add(index));
      line
        .filter((index) => !marked.includes(index))
        .forEach((index) => missing.add(index));
    }
  }
  return { near, missing, bingo };
}
