import { describe, expect, it } from "vitest";
import { parseTokenIdentity } from "../src/tokens/parseToken";

describe("parseTokenIdentity", () => {
  it("splits on the first '.'", () => {
    expect(parseTokenIdentity("space.card")).toEqual({
      token: "space.card",
      category: "space",
      name: "card",
    });
  });

  it("splits only on the first '.', keeping the rest in name", () => {
    expect(parseTokenIdentity("space.card.lg")).toEqual({
      token: "space.card.lg",
      category: "space",
      name: "card.lg",
    });
  });

  it("treats a token with no '.' as having an empty category", () => {
    expect(parseTokenIdentity("malformed")).toEqual({
      token: "malformed",
      category: "",
      name: "malformed",
    });
  });
});
