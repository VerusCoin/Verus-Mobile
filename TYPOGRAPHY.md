# Typography Contract

Use the shared roles in `src/theme/onboarding/tokens.js` for new or intentionally
redesigned typography. The theme name is historical; these tokens are also the
current source of truth for touched signed-in flows.

## Shared title roles

- `headlineLg`: major onboarding and flow headlines.
- `headlineMd`: primary screen, wizard, and success titles.
- `headlineCompact`: compact-device headline variant.
- `titleSheet`: prominent sheet titles.
- `titleRowCompact` and `captionCompact`: the two lines in compact selection rows.
- `AppButton`: shared action-label weight and tracking.

GenericRequest reviews use `RequestCard`: `headlineCompact` for the action and
`titleSheet` for names. `RequestCardCompact` uses `titleRow` names on later
identity-update steps. Result and other form titles retain `RequestTitle`,
which applies `headlineLg` and switches to `headlineCompact` on small devices
(window height 667 or less). Do not set a local title size on those screens.

Apply the typography token before local layout and semantic-color overrides:

```js
style={[
  theme.typography.headlineMd,
  styles.titleLayout,
  {color: theme.colors.textPrimary},
]}
```

Do not restate a token's `fontSize`, `lineHeight`, `fontWeight` or `fontFamily`,
and `letterSpacing` in a local title style. Title roles use 600 weight. Reserve
700 weight for deliberate data, amount, count, status, or compact action
emphasis.

Legacy screens can keep their existing typography until they are intentionally
migrated. When a redesigned title is touched, prefer moving it onto the nearest
shared role instead of adding another local combination.

## Shared label roles

- `labelMd`: 14/19 semibold labels.
- `labelCaps`: 11/14 semibold, 0.6 tracking, in `textSecondary` for caps group
  titles in asset lists and pickers. The owner asked for these titles to be
  much smaller on 2026-11-13.
- `labelSm`: 13/18 semibold labels for compact one-line surfaces, such as the
  Send/Convert context band. Pair it with `caption` for the quieter words.
- `TextAction` uses `labelMd` by default. Its small context role uses `caption`
  (13/18 regular). Its chip role uses `labelDense` (12/16 semibold).
  The VerusID Link pill also uses `labelMd`. Do not override these metrics.
  Footer text actions keep the 17-point semibold `AppButton` label.

## Compact Amount and quote details

Owner-approved 2026-10-30: `titleSheetCompact` is 18/24, `titleRowDense` is
14/18, `captionDense` and `labelDense` are 12/16. Price facts and wizard errors
use the existing 13/18 `caption`; emphasized facts use `labelSm`. Normal sheet
and selection roles retain their current values.

`amountInput` is 40/48 bold, with the Amount field's existing 20-point sizing
floor. `amountKey` is 28/34 regular. `amountKeyCompact` is 26/32 regular for the
smaller visible iOS keys. These roles apply to numeric entry, not page titles.

New VerusID meter cards use `titleSheet` for amounts. On windows of 667 points
or less, use `registrationAmountCompact` (17/22 semibold), approved in R15.
