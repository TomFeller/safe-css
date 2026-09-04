import { afterEach, describe, expect, it } from "vitest";
import {
  findNearestVariableDefinition,
  resolveTokenValue,
  type VariableLookup,
} from "../src/tokens/tokenValue";

let container: HTMLElement | null = null;

afterEach(() => {
  container?.remove();
  container = null;
});

function mount(build: (root: HTMLElement) => void): HTMLElement {
  container = document.createElement("div");
  build(container);
  document.body.appendChild(container);
  return container;
}

describe("findNearestVariableDefinition", () => {
  it("finds a definition on the element itself first", () => {
    const root = mount((el) => {
      el.style.setProperty("--fw-space-card", "16px");
    });
    expect(findNearestVariableDefinition(root, "--fw-space-card")).toEqual({
      owner: root,
      rawValue: "16px",
    });
  });

  it("walks up through parents that don't define it, respecting nested overrides", () => {
    const root = mount((el) => {
      el.style.setProperty("--fw-color-border", "#111");
      const child = document.createElement("div");
      child.style.setProperty("--fw-color-border", "#222");
      const grandchild = document.createElement("div");
      child.appendChild(grandchild);
      el.appendChild(child);
    });

    const grandchild = root.firstElementChild!.firstElementChild as HTMLElement;
    const child = root.firstElementChild as HTMLElement;

    // Nearest ancestor wins - this is what makes nested ThemeProviders "just work".
    expect(findNearestVariableDefinition(grandchild, "--fw-color-border")).toEqual({
      owner: child,
      rawValue: "#222",
    });
  });

  it("returns null when no ancestor defines the variable", () => {
    const root = mount(() => {});
    expect(findNearestVariableDefinition(root, "--fw-space-card")).toBeNull();
  });
});

describe("resolveTokenValue", () => {
  it("returns a value with no var() references unchanged", () => {
    const lookup: VariableLookup = () => null;
    expect(resolveTokenValue("16px", lookup)).toBe("16px");
  });

  it("substitutes a single var(--fw-...) reference", () => {
    const lookup: VariableLookup = (name) => (name === "--fw-color-border" ? "#333" : null);
    expect(resolveTokenValue("1px solid var(--fw-color-border)", lookup)).toBe("1px solid #333");
  });

  it("resolves transitively through multiple levels", () => {
    const values: Record<string, string> = {
      "--fw-border-subtle": "1px solid var(--fw-color-border)",
      "--fw-color-border": "var(--fw-color-neutral)",
      "--fw-color-neutral": "#444",
    };
    const lookup: VariableLookup = (name) => values[name] ?? null;
    expect(resolveTokenValue(values["--fw-border-subtle"]!, lookup)).toBe("1px solid #444");
  });

  it("falls back to the authored var() fallback when the variable is undefined", () => {
    const lookup: VariableLookup = () => null;
    expect(resolveTokenValue("var(--fw-color-missing, #eee)", lookup)).toBe("#eee");
  });

  it("leaves an undefined variable with no fallback as literal text", () => {
    const lookup: VariableLookup = () => null;
    expect(resolveTokenValue("var(--fw-color-missing)", lookup)).toBe("var(--fw-color-missing)");
  });

  it("is cycle-safe: a self-reference is left as literal text instead of recursing forever", () => {
    const lookup: VariableLookup = (name) => (name === "--fw-color-a" ? "var(--fw-color-a)" : null);
    expect(resolveTokenValue("var(--fw-color-a)", lookup)).toBe("var(--fw-color-a)");
  });

  it("is cycle-safe across a multi-node cycle (A -> B -> A)", () => {
    const values: Record<string, string> = {
      "--fw-color-a": "var(--fw-color-b)",
      "--fw-color-b": "var(--fw-color-a)",
    };
    const lookup: VariableLookup = (name) => values[name] ?? null;
    expect(resolveTokenValue("var(--fw-color-a)", lookup)).toBe("var(--fw-color-a)");
  });
});
