# safe-css — Developer Test #2

Thanks for helping test safe-css again.

This version of the test is intended for someone who has already completed Test #1 or otherwise used safe-css. This test assumes you already know the basics — primitives, tokens, recipes, the Inspector. You have **not** been briefed on anything added since then. Approach the new capabilities the way you'd approach a library update you hadn't read the changelog for: by looking.

This test covers the pre-release repository/workspace version of safe-css, not the currently published npm packages — the new package versions have not been published yet. Use the provided repository or demo app rather than installing `@safe-css/core` or `@safe-css/inspector` from the registry.

## Important

Please do not ask for explanations about how something is supposed to work unless you are genuinely blocked. If you can't find something, that's useful feedback — don't ask where it is, note that you looked and didn't find it.

You are not being tested — safe-css is.

This test is intentionally shorter than the first one and does not tell you exactly which prop or primitive to reach for at each step. Finding that out is part of what we're testing.

---

# The task

Using an existing safe-css screen (yours from the first test, or the demo app), make the following four changes. Do them in order; each one builds on the last.

**1. Give a button real hover and focus styling.**

Pick a button (or button-shaped recipe) already in your screen, or create a small one. Make it visibly change appearance on mouse hover, and visibly change appearance when focused via keyboard (Tab to it). Use two different tokens for the two states so you can tell them apart.

**2. Add a "selected" look to something else, driven by your own code — not the browser.**

Pick something that should look different when your application considers it "current" or "selected" (a nav item, a tab, a toggle) — something _your code_ decides, via a prop or a bit of state, not something the browser tracks on its own. Wire it up.

**3. Build a normal centered, responsive main content container.**

Something with a maximum width that doesn't stretch edge-to-edge on a wide screen, with sensible padding that adapts on a narrow one. If you already have one from the first test, skip this — otherwise build it now.

**4. Position a small badge on a corner of something, offset differently on each axis.**

Not evenly inset from the corner — pull it in further on one axis than the other, so it's clearly not a single uniform offset.

Once all four work, open the Inspector:

**5.** Select the button from step 1. Find where its hover/focus styling shows up. Pick one of the tokens it uses there and run Impact Analysis on it — with the button not currently hovered. Read what the result tells you.

**6.** Still in the Inspector, select any element that has a plain HTML `id` or a class name your own code (not safe-css) put there. See what the Inspector says about it.

---

# Feedback

Please answer the questions in the accompanying feedback document once you're done. Be specific about anything that took longer than it should have, anything you searched for and never found, and anything that surprised you — pleasantly or not.
