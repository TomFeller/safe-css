import { describe, expect, it } from "vitest";
import { buildDependencyTree, extractFwVariableReferences } from "../src/tokens/dependencies";
import type { VariableLookup } from "../src/tokens/tokenValue";

describe("extractFwVariableReferences", () => {
  it("returns an empty array when there are no references", () => {
    expect(extractFwVariableReferences("16px")).toEqual([]);
  });

  it("extracts a single reference", () => {
    expect(extractFwVariableReferences("1px solid var(--fw-color-border)")).toEqual([
      "--fw-color-border",
    ]);
  });

  it("extracts multiple distinct references in first-seen order", () => {
    const value = "var(--fw-space-x) var(--fw-space-y)";
    expect(extractFwVariableReferences(value)).toEqual(["--fw-space-x", "--fw-space-y"]);
  });

  it("de-duplicates repeated references", () => {
    const value = "var(--fw-color-a) solid var(--fw-color-a)";
    expect(extractFwVariableReferences(value)).toEqual(["--fw-color-a"]);
  });

  it("ignores var() references outside the --fw-* namespace", () => {
    expect(extractFwVariableReferences("var(--some-other-var)")).toEqual([]);
  });
});

describe("buildDependencyTree", () => {
  it("returns null for a variable outside the --fw-* namespace", () => {
    const lookup: VariableLookup = () => null;
    expect(buildDependencyTree("--not-fw", lookup)).toBeNull();
  });

  it("builds a leaf node with no children when the value has no references", () => {
    const lookup: VariableLookup = () => "16px";
    const tree = buildDependencyTree("--fw-space-card", lookup);
    expect(tree).toEqual({
      token: "space.card",
      cssVariable: "--fw-space-card",
      cycle: false,
      children: [],
    });
  });

  it("builds a leaf node with no children when the variable is undefined", () => {
    const lookup: VariableLookup = () => null;
    const tree = buildDependencyTree("--fw-space-card", lookup);
    expect(tree).toEqual({
      token: "space.card",
      cssVariable: "--fw-space-card",
      cycle: false,
      children: [],
    });
  });

  it("builds a direct dependency", () => {
    const values: Record<string, string> = {
      "--fw-border-subtle": "1px solid var(--fw-color-border)",
      "--fw-color-border": "#333",
    };
    const lookup: VariableLookup = (name) => values[name] ?? null;
    const tree = buildDependencyTree("--fw-border-subtle", lookup);

    expect(tree?.children).toEqual([
      { token: "colors.border", cssVariable: "--fw-color-border", cycle: false, children: [] },
    ]);
  });

  it("builds a transitive chain", () => {
    const values: Record<string, string> = {
      "--fw-border-subtle": "var(--fw-color-border)",
      "--fw-color-border": "var(--fw-color-neutral)",
      "--fw-color-neutral": "#444",
    };
    const lookup: VariableLookup = (name) => values[name] ?? null;
    const tree = buildDependencyTree("--fw-border-subtle", lookup);

    expect(tree?.children[0]?.cssVariable).toBe("--fw-color-border");
    expect(tree?.children[0]?.children[0]?.cssVariable).toBe("--fw-color-neutral");
    expect(tree?.children[0]?.children[0]?.children).toEqual([]);
  });

  it("builds multiple sibling dependencies", () => {
    const values: Record<string, string> = {
      "--fw-shadow-raised": "0 1px var(--fw-color-a), 0 2px var(--fw-color-b)",
      "--fw-color-a": "#111",
      "--fw-color-b": "#222",
    };
    const lookup: VariableLookup = (name) => values[name] ?? null;
    const tree = buildDependencyTree("--fw-shadow-raised", lookup);

    expect(tree?.children.map((c) => c.cssVariable)).toEqual(["--fw-color-a", "--fw-color-b"]);
  });

  it("marks a cycle and stops recursing instead of hanging", () => {
    const values: Record<string, string> = {
      "--fw-color-a": "var(--fw-color-b)",
      "--fw-color-b": "var(--fw-color-a)",
    };
    const lookup: VariableLookup = (name) => values[name] ?? null;
    const tree = buildDependencyTree("--fw-color-a", lookup);

    expect(tree?.cycle).toBe(false);
    expect(tree?.children[0]?.cssVariable).toBe("--fw-color-b");
    expect(tree?.children[0]?.cycle).toBe(false);
    expect(tree?.children[0]?.children[0]).toEqual({
      token: "colors.a",
      cssVariable: "--fw-color-a",
      cycle: true,
      children: [],
    });
  });
});
