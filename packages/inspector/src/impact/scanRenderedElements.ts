import {
  readPrimitive,
  readRecipe,
  readTokenList,
  INSPECTABLE_SELECTOR,
} from "../inspection/metadata";

export interface RenderedElement {
  element: HTMLElement;
  primitive: string;
  recipe?: string;
  tokens: string[];
}

/**
 * Every safe-css element currently rendered in the document - the entire
 * "rendered impact" population Impact Analysis is scoped to (see
 * docs/architecture.md#impact-analysis: this is explicitly a snapshot of
 * the current DOM, never source code, routes, or history). One
 * `querySelectorAll` and one metadata parse per element, done once per
 * analysis run rather than once per dependency token - see
 * `analyzeImpact.ts`.
 *
 * The Inspector's own Shadow DOM host is defensively excluded, though in
 * practice `document.querySelectorAll` can never see inside it anyway (its
 * content lives in a separate shadow tree, and none of it is built with
 * safe-css primitives in the first place - see docs/architecture.md#inspector).
 */
export function scanRenderedElements(root: ParentNode = document): RenderedElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(INSPECTABLE_SELECTOR))
    .filter((element) => !element.closest("[data-safe-css-inspector-host]"))
    .map((element) => ({
      element,
      primitive: readPrimitive(element),
      recipe: readRecipe(element),
      tokens: readTokenList(element),
    }));
}
