Paste everything below the line into Cline.

---

You are implementing Phase 1 safety fixes for the Boating app in this repo. Read `.clinerules` first and follow it exactly.

The brief is in `docs/fix-brief/`:
- `FIX_PLAN.md`: background and order.
- `cards/01_…` to `cards/06_…`: the six cards to implement now.
- `TEST_FIXTURES.md`: scenarios and expected labels. Use the "after cards 03–06" column. Ignore the card 07 and Phase 2 columns.

Do the cards in this order: 01, 02, 03, 04, 05, 06. Card 02 is a refactor that must not change any behaviour, and cards 03–06 build on it.

For each card:
1. Read the whole card. Check that the file:line references still match the code (they were written against commit 93078fc). If they don't, find the right place and note it in the commit message.
2. Make only the change the card describes. Respect its "what NOT to change" list.
3. Add the tests the card lists.
4. Run `pnpm install` (first time only), then `pnpm check` and `pnpm test`. All must pass.
5. Commit locally with the message "Card NN: <title>". Do not push.
6. Report: what changed, tests added, test result, and anything you weren't sure of.

Stop after card 06. Do not start card 07. Do not deploy. Do not push.
