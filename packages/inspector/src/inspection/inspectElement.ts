import {
  readPrimitive,
  readRecipe,
  readVariants,
  readTokenList,
  readClasses,
  readStateTokenList,
  readStateSuppressedList,
  readUnsafeCssCount,
  stateLabel,
} from "./metadata";
import {
  buildTokenUsageLookup,
  resolveTokenUsageProperties,
  type TokenUsageLookup,
} from "./tokenUsages";
import { collectAncestry } from "./ancestry";
import { parseTokenIdentity } from "../tokens/parseToken";
import { tokenToCssVariable } from "../tokens/tokenVariable";
import {
  findNearestVariableDefinition,
  resolveTokenValue,
  type VariableLookup,
} from "../tokens/tokenValue";
import { buildDependencyTree } from "../tokens/dependencies";
import { detectUnsafeCss } from "../unsafe/detectUnsafeCss";
import type {
  ExternalHooksInfo,
  InspectedElement,
  InspectedToken,
  InspectorStateTokenRef,
  InteractionState,
  InteractionStateDeclaration,
  InteractionStateName,
  InteractionStateProperty,
} from "../types";

function inspectToken(
  element: HTMLElement,
  token: string,
  tokenUsageLookup: TokenUsageLookup,
): InspectedToken {
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
    properties: resolveTokenUsageProperties(element, token, cssVariable, tokenUsageLookup),
    rawValue,
    resolvedValue,
    dependencies: dependencyTree?.children ?? [],
    owner: definition?.owner,
  };
}

const STATE_ORDER: readonly InteractionStateName[] = ["hover", "focusVisible", "active"];
const PROPERTY_ORDER: readonly InteractionStateProperty[] = ["background", "color", "border"];

/** Mirrors Core's own `STATE_CSS_SEGMENT` (`primitives/internal/stateBridge.ts`) - duplicated, not imported, per this package's DOM-contract-only boundary (see `inspection/metadata.ts`'s file-level comment). */
const STATE_CSS_SEGMENT: Record<InteractionStateName, string> = {
  hover: "hover",
  focusVisible: "focus-visible",
  active: "active",
};

/** The inline custom property Core always writes for one declared state x property, e.g. `--fw-state-focus-visible-border-value`. */
function stateBridgeValueVarName(
  state: InteractionStateName,
  property: InteractionStateProperty,
): string {
  return `--fw-state-${STATE_CSS_SEGMENT[state]}-${property}-value`;
}

/**
 * Builds the Interaction States model: one entry per state that declares at
 * least one property on this element, each holding every declared property
 * - token-backed (reusing {@link inspectToken}, so it gets the exact same
 * raw/resolved value, dependency tree, owner, and "Analyze impact"
 * machinery as an ordinary token) or a bare literal Core supports without a
 * token (`border: "none"` today).
 *
 * The declared-state set is deliberately derived from BOTH
 * `data-fw-state-tokens` (`stateTokenRefs`, already parsed by the caller)
 * AND the inline `-value` bridge custom properties directly: a literal like
 * `border: "none"` never gets a token entry (there is no token to record -
 * see Core's `applyStateBridge`), so relying on `data-fw-state-tokens`
 * alone would silently miss it. A (state, property) pair already covered by
 * a token ref is never double-counted from its `-value` property.
 */
function buildInteractionStates(
  element: HTMLElement,
  stateTokenRefs: InspectorStateTokenRef[],
  tokenUsageLookup: TokenUsageLookup,
): InteractionState[] {
  const suppressionLookup = new Map<string, string>();
  for (const ref of readStateSuppressedList(element)) {
    suppressionLookup.set(`${ref.state}|${ref.property}`, ref.unsafeCssKey);
  }

  const declarationsByState = new Map<InteractionStateName, InteractionStateDeclaration[]>();
  function pushDeclaration(state: InteractionStateName, declaration: InteractionStateDeclaration) {
    const existing = declarationsByState.get(state);
    if (existing) existing.push(declaration);
    else declarationsByState.set(state, [declaration]);
  }
  function suppressionFor(state: InteractionStateName, property: InteractionStateProperty) {
    const unsafeCssKey = suppressionLookup.get(`${state}|${property}`);
    return unsafeCssKey !== undefined ? { unsafeCssKey } : undefined;
  }

  const covered = new Set<string>();
  for (const ref of stateTokenRefs) {
    covered.add(`${ref.state}|${ref.property}`);
    pushDeclaration(ref.state, {
      property: ref.property,
      token: inspectToken(element, ref.token, tokenUsageLookup),
      suppressedBy: suppressionFor(ref.state, ref.property),
    });
  }

  for (const state of STATE_ORDER) {
    for (const property of PROPERTY_ORDER) {
      if (covered.has(`${state}|${property}`)) continue;

      const raw = element.style.getPropertyValue(stateBridgeValueVarName(state, property)).trim();
      if (!raw || raw.startsWith("var(")) continue;

      pushDeclaration(state, {
        property,
        literal: raw,
        suppressedBy: suppressionFor(state, property),
      });
    }
  }

  return STATE_ORDER.filter((state) => declarationsByState.has(state)).map((state) => ({
    state,
    label: stateLabel(state),
    declarations: declarationsByState.get(state) as InteractionStateDeclaration[],
  }));
}

/**
 * Builds the "External Hooks" model (v0.4 Phase 3): what's on the selected
 * element that safe-css itself didn't put there. `data-fw-classes` is
 * Core's own authoritative list of the classes its primitive generated, so
 * subtracting it from the element's actual `classList` is an exact diff,
 * not a `fw-`-prefix guess - a custom `as` component or a future
 * non-`fw-`-prefixed framework class would defeat prefix-matching, but
 * never this. `id` is read directly from the element - Core never records
 * it as metadata (there is no `data-fw-id`), so this is the one field in
 * this whole model sourced purely from the live DOM rather than a
 * `data-fw-*` attribute.
 */
function buildExternalHooks(element: HTMLElement): ExternalHooksInfo {
  const frameworkClasses = readClasses(element);
  const frameworkSet = new Set(frameworkClasses);
  const externalClasses = Array.from(element.classList).filter((c) => !frameworkSet.has(c));
  return { frameworkClasses, externalClasses, id: element.id || undefined };
}

/**
 * The single orchestrator that turns a picked/selected DOM element into the
 * full read-only model the panel renders. Every field here is derived only
 * from `element`'s own `data-fw-*` attributes, its inline `style`, its DOM
 * ancestors' inline styles, and (for `externalHooks` - v0.4 Phase 3) the
 * selected element's own `classList`/`id` read directly - the entire Core
 * communication contract this package is allowed to depend on. See
 * docs/architecture.md#inspector.
 */
export function inspectElement(element: HTMLElement): InspectedElement {
  const stateTokenRefs = readStateTokenList(element);
  const stateDeclaredTokenIdentities = new Set(stateTokenRefs.map((ref) => ref.token));
  const tokenUsageLookup = buildTokenUsageLookup(element);

  // A token used *only* by an interactive state (no ordinary/resting CSS
  // property references it - see `findPropertiesUsingVariable`'s exclusion
  // of `--fw-state-*` properties above) is excluded from the ordinary
  // Tokens list: it belongs exclusively under `interactionStates`. A token
  // used both ways keeps its non-empty `properties` and stays here too -
  // see `types.ts`'s `InspectedElement.tokens` doc comment.
  const tokens = readTokenList(element)
    .map((token) => inspectToken(element, token, tokenUsageLookup))
    .filter(
      (inspected) =>
        !(stateDeclaredTokenIdentities.has(inspected.token) && inspected.properties.length === 0),
    );

  return {
    element,
    tagName: element.tagName.toLowerCase(),
    primitive: readPrimitive(element),
    recipe: readRecipe(element),
    variants: readVariants(element),
    ancestry: collectAncestry(element),
    tokens,
    interactionStates: buildInteractionStates(element, stateTokenRefs, tokenUsageLookup),
    externalHooks: buildExternalHooks(element),
    unsafeCss: detectUnsafeCss(element, readUnsafeCssCount(element)),
  };
}
