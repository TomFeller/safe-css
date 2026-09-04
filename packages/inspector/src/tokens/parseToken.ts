import type { TokenIdentity } from "../types";

/** `"space.card"` -> `{ token: "space.card", category: "space", name: "card" }`. */
export function parseTokenIdentity(token: string): TokenIdentity {
  const separator = token.indexOf(".");
  if (separator === -1) return { token, category: "", name: token };
  return { token, category: token.slice(0, separator), name: token.slice(separator + 1) };
}
