import {
  readPrimitive,
  readRecipe,
  readVariants,
  readTokenList,
  readUnsafeCssCount,
} from "./metadata";
import { collectAncestry } from "./ancestry";
import { parseTokenIdentity } from "../tokens/parseToken";
import { tokenToCssVariable } from "../tokens/tokenVariable";
import {
  findNearestVariableDefinition,
  resolveTokenValue,
  type VariableLookup,
} from "../tokens/tokenValue";
import { buildDependencyTree, extractFwVariableReferences } from "../tokens/dependencies";
import { detectUnsafeCss } from "../unsafe/detectUnsafeCss";
import type { InspectedElement, InspectedToken } from "../types";

/**
 * Every inline-style CSS property on `element` whose value references
 * `cssVariable` - as an exact `var(--fw-...)` reference, not a text
 * substring. Most tokens appear as a property's entire value
 * (`color: var(--fw-color-text)`), but some are embedded inside a compound
 * value (Grid's `minItemWidth` token lives inside `grid-template-columns:
 * repeat(auto-fill, minmax(var(--fw-size-...), 1fr))`), and a property can
 * reference more than one token at once (a `box-shadow` list, say) - so
 * this parses every `var(--fw-...)` reference out of the value (reusing
 * `extractFwVariableReferences`, the same parser dependency-tree building
 * uses) and checks for an exact match among them.
 *
 * Substring matching here previously caused false positives: `--fw-space-card`
 * would match inside `--fw-space-card-lg`'s own reference text, wrongly
 * attributing an unrelated token's property to `space.card`. Reusing the
 * real reference parser instead of ad hoc string matching is what rules
 * that out categorically, not just for this one case.
 *
 * An empty result means "Unknown" in the panel - deliberately never guessed.
 */
function findPropertiesUsingVariable(element: HTMLElement, cssVariable: string): string[] {
  const properties: string[] = [];
  const style = element.style;

  for (let i = 0; i < style.length; i++) {
    const property = style.item(i);
    if (!property) continue;
    if (extractFwVariableReferences(style.getPropertyValue(property)).includes(cssVariable)) {
      properties.push(property);
    }
  }

  return properties;
}

function inspectToken(element: HTMLElement, token: string): InspectedToken {
  const identity = parseTokenIdentity(token);
  const cssVariable = tokenToCssVariable(identity);

  const lookup: VariableLookup = (variable) =>
    findNearestVariableDefinition(element, variable)?.rawValue ?? null;

  const definition = findNearestVariableDefinition(element, cssVariable);
  const rawValue = definition?.rawValue;
  const resolvedValue = rawValue !== undefined ? resolveTokenValue(rawValue, lookup) : undefined;
  const dependencyTree = buildDependencyTree(cssVariable, lookup);

  return {
    ...identity,
    cssVariable,
    properties: findPropertiesUsingVariable(element, cssVariable),
    rawValue,
    resolvedValue,
    dependencies: dependencyTree?.children ?? [],
    owner: definition?.owner,
  };
}

/**
 * The single orchestrator that turns a picked/selected DOM element into the
 * full read-only model the panel renders. Every field here is derived only
 * from `element`'s own `data-fw-*` attributes, its inline `style`, and its
 * DOM ancestors' inline styles - the entire Core communication contract
 * this package is allowed to depend on. See docs/architecture.md#inspector.
 */
export function inspectElement(element: HTMLElement): InspectedElement {
  return {
    element,
    tagName: element.tagName.toLowerCase(),
    primitive: readPrimitive(element),
    recipe: readRecipe(element),
    variants: readVariants(element),
    ancestry: collectAncestry(element),
    tokens: readTokenList(element).map((token) => inspectToken(element, token)),
    unsafeCss: detectUnsafeCss(element, readUnsafeCssCount(element)),
  };
}
