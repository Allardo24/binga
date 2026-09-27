import { describe, it, expect } from "vitest";
import { placeItem, lineProgress } from "./card";
describe("kaart indelen", () => {
  it("verwisselt bestaande woorden zonder duplicaten", () => {
    expect(placeItem(["a", "b", "", ""], 0, "b")).toEqual(["b", "a", "", ""]);
  });
  it("verplaatst een woord naar een leeg vakje", () => {
    expect(placeItem(["a", "", "", ""], 2, "a")).toEqual(["", "", "a", ""]);
  });
  it("herkent een bijna complete diagonaal", () => {
    const card = Array.from({ length: 16 }, (_, i) => String(i));
    expect(lineProgress(card, ["0", "5", "10"])).toBe(3);
  });
});
