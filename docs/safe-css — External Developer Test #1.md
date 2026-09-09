# safe-css — Developer Test

Thanks for helping test safe-css.

This is an early-stage React styling system. The goal of this test is to see whether the product and its documentation make sense without additional explanation.

Please approach it as if you discovered the library on GitHub.

## Important

Please do not ask for explanations about how safe-css is supposed to work unless you are genuinely blocked.

If something is confusing, that is useful feedback.

You are not being tested — safe-css is.

---

# Step 1 — Read the documentation

Start with:

1. `README.md`
2. `docs/introduction.md`
3. `docs/getting-started.md`
4. `docs/core-concepts.md`
5. `docs/layout.md`

You do not need to read the internal architecture documentation.

---

# Step 2 — Build a small screen

Create a small React screen using safe-css.

The screen should contain:

- a page/header area
- a title and short description
- a horizontal group of actions
- a collection of at least 4 cards
- a status or notification badge positioned on another element
- an area that demonstrates scrolling
- at least one reusable recipe
- at least one layout that adapts when the available width becomes smaller

Do not try to reproduce an existing safe-css demo exactly.

Make normal implementation decisions based on what you understood from the documentation.

The visual design does not need to be beautiful.

The interesting part is how you structure the layout and styling.

---

# Step 3 — Use the Inspector

Once the screen is working:

1. Open the safe-css Inspector.
2. Inspect several elements.
3. Find a Card or another recipe you created.
4. Look at the tokens that affect it.
5. Pick one shared token and run Impact Analysis.
6. Highlight the affected elements.

Try to understand what the Inspector is telling you without looking at its implementation.

---

# Step 4 — Make a change

Choose one semantic token used by several rendered elements.

Before changing it:

1. Run Impact Analysis.
2. Predict what should change.
3. Change the token.
4. Check whether the result matched your expectation.

---

# Step 5 — Feedback

After finishing, answer the feedback questions provided separately.

Please mention anything that:

- confused you
- surprised you
- felt unnecessarily restrictive
- required you to fight the framework
- made you reach for `unsafeCss`
- felt especially useful

Do not try to be polite about problems.

Problems are what this test is looking for.
