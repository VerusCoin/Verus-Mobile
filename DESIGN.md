# Verus Mobile design contract

This is the mandatory visual contract for new or intentionally redesigned Verus
Mobile UI. It turns approved, shipped screens into repeatable agent guidance.
It is deliberately smaller than a complete design system: judgment lives here,
while exact mechanics stay in shared components, theme tokens, and canonical
source files.

## Scope

Apply this contract when a task creates a user-visible surface or intentionally
redesigns an existing one. Apply it only to the touched surface.

Untouched legacy UI is neither a design precedent nor an automatic migration
target. Maintenance that preserves an old screen's appearance may keep its
existing visual language until that screen is explicitly redesigned.

Before proposing or writing frontend code, the agent must:

1. Read this file in full.
2. Inspect the closest canonical exemplar below in both source and rendered UI.
3. State a small task design contract: scope, exemplar, shared primitives,
   required states, and any deliberate deviation.
4. Reuse the exemplar's component or shared primitive. If reuse is impossible,
   reproduce its measurements and behavior exactly before adding variation.

Do not average several existing screens into a new style. If a canonical
exemplar conflicts with a general rule below, preserve the exemplar for that
pattern. Change the canonical pattern first, with explicit design approval, and
then let later work inherit the revision.

## Authority

Resolve visual decisions in this order:

1. Explicit instructions for the current task.
2. The pattern-specific canonical exemplar and shared primitives named here.
3. The core rules in this file.
4. Existing redesigned UI that clearly belongs to the same pattern.

Legacy screens are behavioral references only unless this file names them as a
visual exemplar. External design systems and generated suggestions may provide
methods, never Verus Mobile's visual direction.

## Core rules

- Keep pages flat. Do not introduce generic cards to group ordinary content.
  Prefer whitespace, alignment, and hairline dividers. Filled rows are allowed
  only when the canonical selection or state pattern uses them; they are not a
  license for card-based page composition. The bordered GenericRequest card
  and compact card are an owner-approved exception (2026-10-28), limited to
  request reviews as specified in [Request-review hierarchy](#request-review-hierarchy).
- Do not mark items with colored or thick left/start-edge accent bars in any
  state. Use a soft fill with a full outline or a change inside the item.
  A 1 px neutral divider and timeline connectors are structure.
- Do not use eyebrow headings, small uppercase pre-titles, or redundant labels
  above the real title.
- Use as few words as the task safely permits. Prefer a direct title, concise
  labels, and one short explanation only when it prevents ambiguity.
- Say each fact once. A result, error, or status screen states its outcome in
  the title only. Do not repeat it in a description, section label, count
  line, or notice title.
- Do not add decorative icons. Icons are allowed only when the canonical
  component already uses them or when they perform a necessary navigation,
  status, copy, or domain-recognition job.
- Give each screen one primary action. Do not duplicate that decision in a
  footer, floating rail, and inline action at the same time.
- Use semantic roles from `src/theme/onboarding` and typography roles from that
  theme plus `TYPOGRAPHY.md`. Do not recreate approved font metrics or raw theme
  colors locally.
- Treat light and dark mode as one deliverable. State, hierarchy, legibility,
  and interaction must survive both.
- On iOS every text field takes its keyboard appearance from the in-app theme
  through `src/utils/applyThemedKeyboard.js`. Do not set `keyboardAppearance`
  per field. Android keyboards keep their own or the system setting.
- On iOS the app windows take their appearance from the in-app theme
  (`src/theme/app/AppThemeProvider.js`), so native controls such as switches
  match it. Before this, an off switch on the light theme with a dark phone was
  almost invisible. Do not give a native control colours only to fix contrast.
- Respect safe areas and keyboard changes. Bottom actions stay in normal flow
  through `src/components/SafeBottomActionStack.js`. The footer has no divider
  line above its buttons (owner, 2026-10-26).
- Go back with the arrow button: `OnboardingBackButton`, a 24-point
  `arrow-left` in a 44-point target. `createRedesignedHeaderOptions` puts it in
  every redesigned stack header. Never show the iOS "‹ Back" chevron and title
  (owner, 2026-10-24); `corepack pnpm check:design` fails on `headerBackTitle`.
- Wrap a form with bottom actions in `src/components/KeyboardAvoidingForm.js`
  so the actions stay above the keyboard on both platforms. Android pans the
  window (`adjustPan`), so a plain `KeyboardAvoidingView` there does nothing.
  While the keyboard shows, drop the bottom inset as the onboarding steps do.
- Use `src/components/AppSwitch.js` for switches. Its Android thumb and track
  use the app theme; iOS keeps its native appearance.
- On iOS 26 `src/utils/applyNativeSwitchSize.js` draws every switch at 51 x
  22.7 points, scaled from the native 63 x 28, so it keeps its earlier width.
  The owner found the native size too large (2026-10-21). Give a switch slot a
  minimum width, not a fixed 51 or 52 points.
- Use monospace only for raw technical identifiers such as addresses, hashes,
  transaction IDs, and public keys.
- Show a status as the tinted status badge: a pill with a semantic background
  and colored text, as `src/components/StatusBadge.js` draws it. Do not put a
  colored dot beside status text. Badge text uses the tone's badge text token
  at 4.5:1 contrast or more.
- A second button under a primary action uses `AppButton` with
  `variant="secondary"` (the filled tint), 10 points below the primary, as in
  `src/containers/Services/AddressBook/AddressBookEditSheet.js`. This includes
  back-out actions such as "Cancel" and "Not now". Use `variant="text"` only
  for a third, low-emphasis footer action. It uses the semantic `link` color.
  Use `TextAction` for content actions, inline links, compact context actions,
  and MAX chips. It uses `link` in both themes.

## Text actions

Owner approval, 2026-11-02: option B of the text-action audit.

- `TextAction` draws actions tied to content. Use it for Undo, View details,
  inline Try again, Use Face ID, Scan QR code, and Add or Review in a row.
- Default type is `labelMd`. `size="small"` uses `caption` in a header band
  or context slot. An optional Lucide icon is 20 points, with stroke 2 and
  an 8-point gap.
- Keep a 44-point target. A compact 32-point slot extends its target into the
  padding. `variant="chip"` uses `labelDense`, a 1-point outline, 10-point
  corners, and 3/10-point padding inside a 48 x 48-point target. Use it for MAX.
- Text and icons use `link`. Pressed opacity is 0.72. Disabled text and icons
  use `disabledText`. Add no underline or background.
- The VerusID Link pill keeps its `surface` fill and 36-point visible height.
  Use `labelMd`, `link`, and hit slop to 44 points.
- Use the button role for an in-app action. Use the link role when an action
  opens another app or a web page. Explorer actions keep `SignedOutActionRow`
  with `ExternalLink`, as in `TransactionResult`; they stay above the footer.
- Login's Other options keeps white text over video. A reachable legacy
  action on a fixed white surface uses `themeMode="light"` until that screen
  adopts theme surfaces. Change only its button in this migration.
- Secondary buttons use the shared fill. Do not override Cancel to
  `surfaceMuted`. Lock wallet and Use current values are secondary buttons.
  Lock wallet keeps its 19-point `lock-outline` icon before the label, in the
  label color, with a 10-point gap. Owner decision, 2026-11-02; no other
  secondary button takes an icon.

## Input fields

Owner approval, 2026-10-30: the compact neutral input study, revision 2.
Owner approval, 2026-11-03: the outline-only field, D2 dark / L2 light.

- `AppTextInput` is the shared text-field shell: 48-point single-line height,
  12-point corners, and the semantic `input*` colors. Focus changes the color
  of one 1-point border. It adds no glow, shadow, second ring, or fill change.
- Values use `inputValue` (16/22). iOS single-line editable fields deliberately
  omit `lineHeight` so `UITextField` uses the font's native vertical metrics;
  the forced paragraph height shifted editing text down. Keep 16-point type,
  labels, errors, password eyes, search controls, units, and existing keyboard
  and validation behavior. Multiline fields retain 22-point line spacing.
- The field has no fill and takes the surface behind it. The idle border uses
  the cool grey-blue `inputBorder`. Focus changes that one border to
  `inputFocusBorder`: near black in light mode, near white in dark mode.
  The caret uses `link`. Keep the one-border treatment.
- Personalize wallet keeps its 56-point avatar and 28-point icon. Center the
  circle beside the 48-point input; the field label and errors do not set the
  circle's center.
- A multiline field starts at 48 points. Center its first line through the
  shared padding. Grow it with its native content height. Keep uncontrolled
  memo entry uncontrolled; a height update must not replace its text.
- Use `AppAddressInput` for destination and identifier entry. Its empty action
  is Paste; a value changes it to Clear. Keep a QR action where scanning is
  supported. Actions have 44-point slots and 48-point hit areas.
- The full value always remains in the native input and caller state. While
  idle, technical identifiers keep their last six characters and as much of
  the start as fits, with a middle ellipsis only when needed. Names use normal
  type. Focus restores the full editable value in one horizontal line.
  Confirm keeps the full recipient, without an ellipsis.
- Send and Address Book are the canonical consumers. Address Book's scanner
  uses `BarcodeReader` inside its existing editor sheet, with Back returning
  to the unchanged draft. This is the deliberate compact scanner composition
  for that nested editor; other scanners keep their existing headers.
- Legacy Paper fields and large, unboxed amount entry keep their separate
  patterns until a task explicitly migrates them.

## Voice

Copy never says "we", "our", or "us". The wallet is software; no company stands
behind it. Prefer impersonal wording: "The best price is selected" and "Fees
are shown before you confirm". Use "The wallet" only when the software acts.

## Button sizes

On a window of 667 points or less, primary, destructive, secondary and tonal
buttons are 44 points high (a tonal button is the secondary action on a dark surface, so it
follows the same rule); the wizard footer's top padding is 8 points. Normal
windows retain the 56-point default and 16-point wizard footer top padding.
Bottom spacing stays the same. `AppButton` and `GradientButton` resolve this rule
centrally through `useButtonHeight`, including explicit action heights. Text
buttons keep their size.

## Slide to confirm

Use `src/components/SlideToConfirm.js` when money or keys leave the wallet and
the user cannot undo it. The six places are Send/Convert Confirm, invoice
payment, gift card funding, high-risk app encryption approval, external VerusID
update approval, and VerusID registration and management. Keep selection,
review, decryption, retry, and unknown-status actions as normal buttons.
The slide stays locked until its handler's promise settles. Cancelled gestures
never commit. Each handler must return its operation or set a synchronous guard.
A short slide shows its action-specific hint in the label slot for three seconds
and announces it for screen readers. A new slide clears the hint. A completed
slide shows no hint. The footer does not move.

## Imagery

The owner chose one picture system on 2026-10-24 (option A of the imagery
review). Each kind of picture has one job:

- **Line glyph.** Every still picture is a Lucide glyph with a 1.8 stroke in a
  theme color. An icon-led step uses `src/components/StepGlyph.js`: 72 points
  in `textPrimary`, 24 points above the large title. An empty or failed list
  uses `src/components/EmptyState.js`: 64 points in `textSubtle`, then a
  `titleSheet` title, an optional line and one action. The glyph names the
  service with its Services tile icon (`Gift`, `BookUser`) or the VerusID `@`
  (`AtSign`). A failed list shows `CircleAlert` and only says what failed.
- **Live status symbol.** An operation that waits for the user or a device,
  such as the NFC tap (`NfcTapSymbol`), shows a symbol on a disc. It moves only
  when the real state changes.
- **The app's own objects.** Progress or a celebration of a real event uses
  real components: the wallet icon, coin logos and the gift card material
  (wallet setup, claiming funds, the ready card). Draw a wallet icon only with
  `WalletAvatar`, or with `WalletAvatarEmoji` when it has no circle. Both move
  the emoji down on iOS, where a plain emoji text sits high in its circle, and
  give it an opaque color, because Android fades a plain emoji text.

The blurred wave video stays on the landing and login screens as brand
atmosphere. Do not add raster illustrations, 3D renders, stock animations or a
`MaterialCommunityIcons` glyph at picture size. The grey 3D empty-state renders
were removed for this rule, because a shaded raster cannot follow the theme.

## Canonical pattern map

| Need | Source of truth | Required starting point |
| --- | --- | --- |
| Theme, spacing, shapes, typography | `src/theme/onboarding/tokens.js`, `TYPOGRAPHY.md` | Consume the existing semantic roles. |
| Link color | `src/theme/onboarding/tokens.js` | Use `link`: light `#3165D4`, dark `#7EA2F2`. Keep text contrast at 4.5:1 or more on its surface. |
| Text action or link | `src/components/TextAction.js`, `src/styles/components/textAction.styles.js` | Use `link`; use `small` for context slots and `chip` for MAX. |
| Footer text action | `src/components/AppButton.js` | Use `variant="text"` for the third footer action. Keep over-video Login text white. |
| Signed-out onboarding step | `src/styles/components/signedOutFlow.styles.js`, `src/containers/Onboard/CreateProfile/CreateProfile.js` | Reuse the signed-out flow styles and compact-device rules. |
| Full-screen stepped task | `src/components/ProgressHeader.js`, `src/containers/SendWizard/components/SendWizardHeader.js`, [Stepped tasks](#stepped-tasks) below | Reuse the shared header title treatment and safe-action composition. |
| Selection BottomSheet | `src/containers/DeepLink/components/VerusIdIdentityPickerSheet/IdentityPickerSheet.js` as opened by `src/containers/DeepLink/AuthenticationRequestInfo/AuthenticationRequestInfo.js` | Reuse the component or match its choose, selected, provisioning, and link modes exactly. |
| Informational BottomSheet | `src/containers/DeepLink/components/RequestReview/DeepLinkRequesterSheet.js` and `src/containers/DeepLink/components/RequestReview/DeepLinkRequestSheetScaffold.js` | Reuse the scaffold, section rows, scroll cue, and Done action. |
| BottomSheet shell | `src/components/BottomSheetModal.js`, `src/styles/components/signedOutSheet.styles.js` | Do not construct a new modal shell. |
| Acknowledgement BottomSheet | `src/components/AcknowledgeSheet.js`, matching the seed warning sheet in `src/containers/CreateWallet/Forms/CreateSeed/Forms/SeedIntro.js` | Use it for a warning that the user must confirm. Pass `dismissLabel` when the user may back out. Do not use a native `Alert` for it. |
| GenericRequest request card | `src/containers/DeepLink/components/RequestReview/RequestCard.js`, `src/containers/DeepLink/components/RequestReview/RequestCardCompact.js`, `src/styles/components/requestCard.styles.js` | Use the full card on reviews and claim-password entry. Use the compact card on later identity-update steps. Keep `RequestTitle` for other result and form titles. |
| GenericRequest requester sheet | `src/containers/DeepLink/components/RequestReview/DeepLinkRequesterSheet.js`, `src/containers/DeepLink/components/RequestReview/DeepLinkRequestSheetScaffold.js` | One requester tap opens the merged VerusID and request information, with Verified and copy actions. |
| GenericRequest review | `src/containers/DeepLink/components/RequestReview`, `src/containers/DeepLink/AuthenticationRequestInfo/AuthenticationRequestInfo.js`, `src/containers/DeepLink/AppEncryptionRequestInfo/AppEncryptionRequestInfo.js` | Reuse the request-review primitives and hierarchy. |
| Multi-step identity update | `src/containers/DeepLink/IdentityUpdateRequestInfo/IdentityUpdateRequestInfo.js`, `src/styles/deeplink/identityUpdateRequestInfo.styles.js` | Preserve the dedicated review, content, high-risk, and confirm/pay sequence. |
| Services home | `src/containers/Services/SignedInServicesHome.js` and [Services home](#services-home) below | Use the two-column tile grid. Do not add artwork or descriptions to used services. |
| Service list or manager | `src/components/ServiceManagerHeader.js`, `src/containers/Services/AddressBook/AddressBook.js`, `src/containers/Services/ServiceComponents/GiftCardService/GiftCardServiceOverview/GiftCardServiceOverview.js` | Reuse the shared header and established list rhythm. |
| Gift card detail | [Gift card detail](#gift-card-detail) below, with `src/containers/Services/ServiceComponents/GiftCardService/GiftCardFixedCard.js` | Use the fixed card. Say each fact once. |
| VerusID list and page | [VerusID page](#verusid-page) below, with `src/containers/Services/ServiceComponents/VerusIdService/VerusIdCard.js` | Use the light card. Funds come last; a fund opens its asset screen. |
| App alert | `src/components/Alert.js` through `createAlert`, with the `AcknowledgeSheet` measurements, and [App alerts](#app-alerts) below | Prefer the screen itself. Never use a Paper `Dialog` or a native `Alert.alert` in redesigned UI. |
| Empty or failed list | `src/components/EmptyState.js` and [Imagery](#imagery) | Use it for every list without items or with a load error. Do not draw a local picture, title and button. |
| Icon-led step | `src/components/StepGlyph.js`, as `src/containers/Onboard/CreateProfile/Forms/UseBiometrics.js` uses it | Lead the step with `StepGlyph`. Do not size or color a step icon locally. |
| Status label | `src/components/StatusBadge.js` | Reuse the tinted badge with a `success`, `warning`, `danger`, or `neutral` tone. On the gift card material, pass `variant="card"`. Badge text uses the tone's badge text token at 4.5:1 contrast or more. |
| Transaction result | `src/components/TransactionResult.js`, as `src/containers/SendWizard/SendWizardSuccess.js` uses it, and [Transaction result](#transaction-result) below | Use it for every screen after the wallet sends transactions. It has no section label and no count line. |
| Sheet action rows | `src/components/SignedOutActionRow.js`, `GiftCardOptionRow` in `src/containers/Services/ServiceComponents/GiftCardService/GiftCardOptionsSheet.js`, `src/styles/components/signedOutSheet.styles.js` | Use the unfilled 62-point rows with the dimmed icon, semibold label, and chevron. Do not draw filled option rows. |
| Compact form BottomSheet | `src/containers/Services/AddressBook/AddressBookEditSheet.js` | Reuse its title, input, keyboard, and bottom-action layout. |
| Settings | `src/containers/Settings/components/SettingsScaffold.js` | Compose with `SettingsScreen`, `SettingsTitle`, `SettingsSection`, and `SettingsRow`. |
| Ambiguous vertical overflow | `SettingsScreen` in `src/containers/Settings/components/SettingsScaffold.js`; `DeepLinkRequestSheetScaffold` for request sheets | Show the existing bottom fade and centered chevron only while more content remains below. |
| Search, copy, loading | `src/components/AppSearchField.js`, `src/components/AppSearchLauncher.js`, `src/components/CopyAction.js`, `src/components/SkeletonLoader.js` | Never hand-roll an equivalent local control. |
| QR scanner | `src/components/BarcodeReader/BarcodeReader.js`, `src/components/BarcodeReader/ScannerScreen.js`, [Camera scanner](#camera-scanner) below | Reuse the camera window. Do not draw a full-screen camera or a local permission page. |

## BottomSheets

### Selection

The VerusID selector opened from GenericRequest authentication is the canonical
selection sheet. The authority is the running component, not every old
BottomSheet and not a similarly named stylesheet.

Its contract includes:

- `BottomSheetModal` as a floating surface with the shared scrim, animation,
  safe-area gap, 12-point edge margins, and 24-point radius.
- A 76% chooser maximum height and dynamically sized nested link mode.
- Shared sheet body spacing from `createSignedOutSheetStyles(theme)`.
- Existing identity rows at 56 points high, 18-point radius, 16-point
  horizontal padding, and 4-point vertical spacing.
- A 16-point semibold identity label. The selected state uses the semantic
  success background and checkmark; the unselected state uses `surfaceMuted`.
- Shared action rows at a 62-point minimum height.
- The existing request, provisioning, retry, linking, search, manual fallback,
  keyboard, reduced-motion, and in-sheet back-navigation behavior.

The functional icons and chevrons already present in this exact component are
part of the current canonical pattern. Do not add more decoration, but do not
silently remove these while copying the pattern. A future approved redesign of
the canonical component may change the rule for later sheets.

Do not use `src/styles/deeplink/identityPickerSheet.styles.js` as visual
precedent. It is a stale, unused style file rather than the running selector.

Owner wording, 2026-10-30: address selectors use "Choose an address" with no
instructional subtitle. This includes Send, Convert, Receive, invoice payment,
and the asset-screen selector. Related search, empty-state, and accessibility
copy uses "address". Lists do not show a count of sources (owner, 2026-11-12).
A source is a subwallet, which can expose more than one address. Gift cards and
NFC cards keep their names. The internal Card/subwallet model and all selection behavior stay the same.

Every address chooser names a source as Receive does: its type ("Transparent",
"Private") with a transparent card's short R-address or a private card's short
z-address as a monospace subtitle. A VerusID row shows its name only, with no
i-address (owner, 2026-11-12). A VerusID row title keeps one line with a tail
ellipsis; its accessibility label keeps the full name. Group titles name the network only
when choices span two or more networks. A single-network chooser shows no group
title (owner, 2026-11-12).

Simple transfer and Receive choices reuse `src/components/SelectionSheet.js`,
`SelectionRow`, and `SelectionGroup`. They retain the canonical 76% shell and
56-point minimum row height, 18-point radius, 16-point horizontal inset, and
4-point vertical spacing. Rows may grow to preserve balances, networks, routes,
or complete addresses. Titles use `theme.typography.titleSheet`. Use
`useSheetDismissal` to apply a choice or navigate after `onClosed`; keep the
caller's selected content separate from visibility until closing completes.
The saved-address chooser may use 90% of the available height while the
Android keyboard is open, with its management action scrolling after results.
Android uses native modal resizing; iOS retains keyboard avoidance. This keeps
a complete address choice readable on compact screens. Normal states remain at
76%. Nested identity linking and the searchable Coin Card picker retain their
specialized composition and behavior.

Multi-select `SelectionRow`s use the checkbox role (owner-approved V2,
2026-11-04). Each choosable row shows the `CheckOption` glyph:
`checkbox-blank-outline` or `checkbox-marked` from MaterialCommunityIcons,
24 points in `link`. In dark mode only, the unchecked outline uses
`textPrimary`; the checked box stays in `link`. Center it in the right indicator slot, 24 points wide
with a 10-point left gap. Both states keep `surfaceMuted`, without an outline
or success fill. Busy-disabled rows keep their current box, dimmed with the
text. The row exposes its checked state; the glyph stays hidden from
accessibility. Single-choice rows keep their success fill and check.

The Send/Convert network sheet ("Choose a network") groups its rows with
`SelectionGroup`. "Same network" holds the asset's own network and is always
first; "Other networks" holds the rest in route order. Row titles are the plain
network name and subtitles read "Receive as <ticker>". Do not add a "Default"
badge or repeat "network" in a row. The owner approved this on 2026-10-18.
The ticker is the asset's name on that network (owner, 2026-11-03): an
Ethereum asset on Verus reads "Receive as vETH" or "Receive as DAI.vETH".
Send asks for the network when the asset is picked, as Convert does for its
target (owner, 2026-11-13). The picked row in Select asset shows a small
spinner in place of its fiat value while the routes load, and the other rows
ignore taps. The sheet opens only when two or more networks remain; it has no
preselected row. Otherwise Amount opens on the same network. Amount reuses
those routes and keeps Change network for a later change.

### Information

Use `DeepLinkRequesterSheet` for read-only request information. Its
`DeepLinkRequestSheetScaffold` wrapper reuses `src/components/InfoSheet.js`; use
`InfoSheet` and `InfoSheetSection` directly for other informational sheets.
The information scaffold provides the 78% maximum height, 20-point sheet title,
sectioned label/value rows,
overflow cue, and a 56-point quiet Done action (44 points on small windows).
Keep the title literal and the
content concise. Do not add an illustration, hero icon, or eyebrow.

Prose topics use `InfoSheetTopic` (I1): `titleRow` in `textPrimary`, then
`bodySm` in `textSecondary` after 4 points, with 20 points between topics.
Use no dividers, borders, or fill. Keep label/value rows for data only.

Both information and selection sheets use `src/components/SheetScrollView.js`
for measured overflow cues. Below a 128-point scroll viewport, use the native
scroll indicator instead of a fade that would obscure the visible content.

### Confirmation

Use `AcknowledgeSheet` before an action that cannot be undone, such as sharing
a gift card key. It shows a 21/27 title, one short message in the 16/24 body
role, and one primary `AppButton` at the shared button height. When the user may back out, pass
`dismissLabel` (for example "Not now"). The sheet then shows an `AppButton`
with `variant="secondary"` 10 points under the primary action. Do not rely on
an outside tap as the only visible way out: users do not reliably know they can
tap outside a sheet. A warning that the user must accept, such as the seed warning, keeps the
single button.

For a deletion that the wallet cannot restore, pass `destructive` to
`AcknowledgeSheet`. Use the destructive button rule in App alerts below.

### App alerts

The owner chose the sheet look on 2026-10-22 (gap 4, option A).
`createAlert` keeps its API and opens `src/components/Alert.js`: the
acknowledgement sheet, embedded in the root portal. Open native sheets step
aside while it shows, and a sheet that was closing stays closed.

Use an alert only when the screen cannot show the outcome: a failure after the
user left the context, or a confirmation before an action that cannot be undone.
Otherwise show it where it happens:

- A field error uses `AppTextInput` `errorText`. A wrong wallet password reads
  "Incorrect password." everywhere. It uses `PasswordCheck` `errorMessage`;
  the sheet stays open.
- A setting that does not save uses the `SettingsRow` `error` line ("Not saved.
  Try again."), and the control keeps its old value.
- A request that cannot continue disables its action and says why.
- Success needs nothing when the screen already shows it: a row value, a closed
  screen, the `CopyAction` check.

Buttons: the action is the primary button and names the action ("Delete wallet",
"Change and sign out", "Turn on"). The way out is "Not now" with
`style: 'cancel'`. A one-button alert uses "Close". Outside tap and Android back
run the way out unless the alert sets `cancelable: false`.

Owner request, 2026-11-04: use `AppButton variant="destructive"` for an action
that deletes data the wallet cannot restore. In `createAlert`, set the action's
`style` to `'destructive'`. Keep the primary button's size, shape and label
style. Disabled uses the primary button's disabled colors. Both themes use
`destructive` (`#D1242F`), `destructivePressed` (`#B01E28`) and `onDestructive`
(`#FFFFFF`). Remove asset and Unlink VerusID keep `primary`; both can be undone.
The Delete wallet screen and Submit revocation use `destructive`.
Never fill a button with `danger`: white text on it is 4.03:1.

Copy: a specific title, never "Error". At most two short sentences. No raw
error, RPC or library text; log it instead.

Settings pickers: a list choice uses `SelectionSheet`. A one-value edit uses
`src/containers/Settings/components/SettingsFieldSheet.js`, the
`AddressBookEditSheet` layout with its error under the field.

### Wallet unlock

For a signed-in password sheet, the title names the action. The body says only
why the password is needed, or is left out. The primary button names the action.
Show no wallet row when the user is already inside that wallet.

For NFC backup, the wallet password must be typed in the current flow before
it can encrypt a card (owner, 2026-11-04). Settings disables biometrics for
this action only. Pass a session flag to the backup screen, never the password.
Request unlocks can use biometrics, but Write to NFC card then asks for the
typed password in `PasswordCheck`, with biometrics off. A password typed during
new-wallet setup counts in that session. The result says that the card keeps
this password if the wallet password changes later. NFC import labels its
field Password, since either a wallet password or a separate backup password
can open a card.

`src/containers/Login/components/UnlockWalletSheet.js` unlocks a wallet on the
login screen and for requests (`WalletUnlockCoordinator`).

- A wallet with Face ID or Touch ID opens on "Unlocking your wallet"
  (`WalletUnlockLoadingContent`). The loader stays while the biometric prompt
  runs and the wallet opens. The password form never shows behind the prompt
  (owner, 2026-10-25).
- The password form shows only when biometrics fail, are cancelled or are not
  available. The field then takes focus.
- "Use Face ID" on the form switches the sheet back to the loader. When the
  phone has no biometrics, the form and keyboard stay and the error shows under
  the field.
- When the user cancels the prompt after "Use Face ID", the line under the
  field reads "Face ID was cancelled." (the phone's biometry name). Other
  failures keep "Biometric unlock is unavailable. Enter your password to
  continue." A cancel of the automatic prompt shows no line (owner,
  2026-10-25).
- The row shows the phone's own biometry icon and name through
  `BiometricAffordanceIcon`, the icon on the wallet card: `ScanFace` for Face
  ID, `FingerprintPattern` for Touch ID and fingerprint. Never a fixed
  fingerprint.

### Shared behavior

- Do not wrap `BottomSheetModal` in another Paper `Portal`.
- Use `onClosed` for cleanup or navigation that must wait for the closing
  animation. Do not clear visible content during `onClose`.
- A simple sheet closes through outside tap or system back. Add explicit close
  chrome only when the task is blocking, destructive, or nested.
- Owner exception, 2026-11-05: the display currency sheet ("Currencies") shows
  `HeaderCloseButton` on the right of its title (`SelectionSheet showClose`).
  It fills most of the screen and has a search field, so the dimmed area left
  to tap is small, and iOS has no system Back. Other simple sheets keep no X.
- Keep a loading or verification sheet's height stable while its internal state
  changes.

## Stepped tasks

Use the shared `ProgressHeader` for new full-screen stepped work. Onboarding and
Gift Card already share it; new flows must not invent dots, numbered circles,
an eyebrow such as "Step 2 of 4", or a different progress bar.

Owner approval, 2026-10-30: both `ProgressHeader` and `SendWizardHeader`
consume `src/styles/components/progressHeader.styles.js`. The header is 63
points high before its top safe-area inset: 4 top, 44 action row, 4 progress
gap, 3 progress track, and 8 bottom. The owner removed the divider below the
progress track on 2026-10-30. Back and Close retain their
44-point targets. The controls use a 24-point inset with their existing
8-point offsets; the progress track uses a 16-point inset. Preserve each
header's progress calculation, focus ownership, reduced-motion behavior,
optional actions, and close guards. This applies to every consumer of those
two headers. Other navigation bars keep their current layout.

For signed-out setup, use `createSignedOutFlowStyles(theme)` directly: its
normal and compact padding, title metrics, width limit, keyboard clearance, and
footer spacing are one unit.

Stepped tasks show a short step title in the header bar, centered
between back and close, in `theme.typography.titleSheet`. Do not show a large
step title below the header. The owner approved this pattern for Send/Convert
on 2026-10-17, and for wallet setup, wallet import and the gift card fund flow
on 2026-10-23.

- Keep a header title to about 18 characters, so that it fits on one line at
  360dp. The setup titles live in `src/containers/Onboard/setupStepTitles.js`
  ("Personalize wallet", "Create password", "Back up wallet", "Recovery phrase",
  "Verify phrase", "Import phrase", "Review phrase", "Import wallet").
- A screen led by an icon with one choice keeps its large title, and the header
  shows no title: biometrics ("Use Face ID"), the shielded address, NFC import
  and the Z recovery secret intro (owner, 2026-10-23). Each one leads with
  `StepGlyph` in the signed-out step layout
  ([Imagery](#imagery)).
- Form steps start 24 points under the header on every window: signed-out steps
  add `afterHeaderTitle` from `createSignedOutFlowStyles(theme)`. Icon-led
  screens keep the normal 54-point and compact 20-point step top.
- One icon action that belongs to the step, such as the password info button,
  goes in the right slot of `ProgressHeader` (`rightAction`).
- A task that the user can leave in one tap passes `onClose` to
  `ProgressHeader`. The right slot then shows `HeaderCloseButton`, the mirror
  of the back arrow.
- Say each thing once. A context line keeps only what the title does not say
  ("Write down words 1–8 of 24"). A field placeholder does not repeat its label.

The recovery phrase check ("Verify phrase", `SeedWords`) uses word chips. The
owner approved it on 2026-10-23 (option A of the mockup).

- Ask 3 words, one from each third of the phrase. Each word shows 4 chips in a
  2 x 2 grid: the right word and 3 other words from the same third, in random
  places. A blind guess passes 1 time in 64.
- Do not show right or wrong for one tap. The check judges after the user picks
  all 3 words and taps the button. A result per tap lets anyone pass without a
  written phrase.
- A wrong answer shows "Does not match." under each wrong word and locks the
  chips. "Show words again" returns to words 1–8. Each visit to the check asks
  new words with new chips.
- A picked chip has a blue border, not the green selection with a check mark:
  green reads as a correct answer before the check runs.

For a signed-in task wizard:

- Match the `ProgressHeader` title treatment. Send/Convert uses
  `SendWizardHeader` for back, close, the title, and progress below that row.
- 20-point horizontal content inset, 24-point top inset, and 28-point bottom
  inset. Send/Convert retains its existing 16-point horizontal inset and uses
  the 24-point top inset on normal and compact devices. Confirm alone uses a
  16-point top inset on compact windows.
- No eyebrow. Keep helper copy only when it adds information.
- One primary bottom action through `SafeBottomActionStack`; back navigation
  stays in the header.
- Stable loading, error, review, processing, and result states within the same
  flow structure.

Send/Convert shows a context band directly under the header on Recipient.
Select asset can also show its source identity. Amount uses the compact context
row described below instead of this band. The owner approved it on 2026-10-17 (option C of the review mockup).
It reminds the user what moves and where, in one line, without a second title.

- `WizardContextBand` draws it through the `context` slot of `SendWizardHeader`,
  on the shared band in `src/components/HeaderContextBand.js`.
  `getWizardContextSummary` in `wizardUtils.js` decides what it shows.
- Full-bleed `surfaceMuted` band, 32-point minimum height, 16-point inset. Asset
  names use `labelSm`, connector words and the chain name use `caption`. Logos are
  `AssetCoinLogo` at 16 points. Badges use an 8-point mark and a 1-point ring
  in the band color.
- Left: the source asset and, for a conversion, an arrow and the target asset.
  Right: "on" and the chain, only for a conversion to another chain.
- A Send or Convert from the VerusID page starts on Select asset with only that
  VerusID's assets. There the band reads "From <VerusID name>", with the name in
  normal type.
- On Recipient, Send shows the source asset alone. A Send to another chain adds
  an arrow and the chain. Amount owns its network context separately.
- Drop `[ERC20]` from asset names. The logo badge says it. Hide the target's badge
  when the chain is named on the right.
- When the line is too long, the chain name shortens first, then the asset names.
- No band on Confirm or Success. They already show the whole route.

Owner approval, 2026-10-30: Send/Convert Amount uses `AmountInput` with
`AmountKeypad`. The native field remains editable for selection, paste,
hardware keyboards, and accessibility, with `showSoftInputOnFocus={false}`.
The keypad edits decimal text through `editAmountInput`; it does not parse,
round, or calculate funds. Keep the existing precision, quote, network, MAX,
and fee-reserve rules in `SendWizardAmount`.

- The 44-point context slot shows Change network only when an alternative is
  available. It shows source network to destination network for a cross-chain
  route. A same-chain conversion shows no To line because the receive block
  names the target. A simple Send omits the default network name. On normal
  windows the slot keeps its height in every case.
- Put the amount and its current unit on one line. Keep 40-to-20-point amount
  sizing. A long amount can put its unit below it. The entry starts 48 points
  below the context on normal windows, or 8 points on compact windows.
- Keep a 44-point fiat-mode action and a 48-point Available / MAX row. MAX uses
  `TextAction variant="chip"` in `link`. Missing
  fiat rates show no action or empty slot. Private pending funds retain their caption.
- Owner approval, 2026-11-13 (R7 option A, "tight top"): on windows of 667
  points or less, `AmountInput compact` draws the amount at 32/40 (80% of
  `amountInput`, same 20-point floor) and the unit in `titleRow`. An empty
  context slot takes no height and the entry starts 8 points down. A shown
  context (the network route or Change network) is a 20-point line with the
  entry directly below it. The fiat-mode slot is 36 points and the Available /
  MAX row 44. Hit slop keeps the fiat-mode and MAX targets at 44 points or
  more (MAX 48). The tappable context line (Change network on Send) keeps a
  20-point touch band on these windows only, because the top area is the
  scroll view's edge and a taller line would hide Available / MAX on a Send to
  Ethereum (owner, 2026-11-13). Do not
  shrink the receive estimate or the keypad. An amount error may still make the
  top area scroll on the smallest phones.
- Place one Continue action above `AmountKeypad` through `WizardFooter` and
  `SafeBottomActionStack`. The keypad owns the bottom safe area. Keys are 48
  points with 8-point gaps on normal windows. Compact iOS uses 44-point visible
  keys centered in 48-point tap areas, with 4-point visible gaps. Compact Android keeps 48-point
  keys and 4-point gaps. Use the existing window-height cutoff of 667.
- Keep the keypad's space while a sheet covers it, but hide its controls.
  Sheet selection and closure restore the native amount field without opening
  the operating-system keypad. Recipient and other text-entry screens retain
  their native keyboards.
- `WizardUI.ErrorMessage` uses 13/18 `caption`, a 16-point icon, and 6/10-point
  padding. Amount's insufficient-balance text is "The amount exceeds this
  address's spendable balance." Keep validation and recovery actions intact.

Send/Convert Amount pins the received asset above Continue. Owner approval,
2026-11-13: option B replaces the earlier A2 receive line.

- Keep `AmountEstimate` and `WizardFooter` outside the ScrollView. The flat
  asset row has a top hairline, a 32-point `AssetCoinLogo`, the currency name in
  `titleRow` above "You receive" in `caption`, and the right-aligned estimate.
  Keep the estimate at 17-point bold. It never shrinks or truncates. The name
  gives way with a single-line middle ellipsis on both platforms, preserving
  its ending. Accessibility retains the full name.
- Group estimated amounts with thousands separators in display only. Under
  the estimate, show money only when there is a finite positive price for
  the received currency in the user's display currency: the ledger's, or the
  ledger's price source for a target outside the wallet (`useReceivedPrice`;
  owner, 2026-11-13). A target outside the coin directory gets the same
  on-chain price from its currency id and system id: any basket or reserve
  currency with a native or anchor route has a money value. Do not derive a
  money price from the paid asset or from `usePriceImpact`'s small-trade crypto
  ratio.
- Empty conversions show the asset row with "—", no money and no impact row.
  Loading uses one `SkeletonLoader` shaped like the final block. Pre-conversions
  show "Price set at launch", with no money or impact row. Keep the fiat/crypto
  toggle under the input and the existing compact keypad layout.
- Below the asset, a pressable `FlatRow` reads "Price impact", with a
  `StatusBadge` and chevron. Keep the existing doorway rule: impact at least
  0.1%, more than one basket, or an Ethereum export. Show it only with a receive
  estimate. The badge is percent only, neutral below 1%, warning from 1%, and
  danger from 5%. Unknown or below 0.1% reads "Details" in neutral.
- "Price and route" uses `BottomSheetModal` directly with the shared
  information-sheet styles in `src/styles/components/infoSheet.styles.js` and
  `titleSheetCompact` (18/24). The shell keeps its 24-point radius and 78% maximum height.
  The owner chose variation A on 2026-10-19.
  Owner-approved compact revision, 2026-10-30: 16-point side padding,
  12-point top padding, a 28-point title block with a 6-point gap, 16-point
  bottom padding, and 12 points above Done.
- When there is a choice, basket rows come directly under the title, best
  first. There is no explanatory sentence and no Price or Route section title.
  Reuse `SelectionRow` with `compact` and `dense`: 44-point visible rows,
  a 4-point gap, and 48-point effective tap areas. This is an owner-approved
  deviation from the canonical 56-point minimum. Titles use `titleRowDense`
  (14/18), estimates use `captionDense` (12/16), and badge labels use
  `labelDense` (12/16). Show the basket name, estimated receive
  amount or "Estimate unavailable.", a success "Best price" pill only on the
  best basket, and the selected green check or unselected chevron.
- Follow the baskets with single-line, non-tappable fact rows: Market price,
  Your price, and Price impact. Labels sit left and values right, with hairline
  dividers. Their 32-point height and 13/18 `caption` text are an owner-approved
  deviation from stacked information rows. Emphasized values use `labelSm`. Hide absent data. With one basket, omit the basket list
  and show "Route" after the price facts only when the route has a `via`.
  Preserve the full route name, including "Bridge.vETH". An Ethereum export
  adds Network fee last, with a skeleton while loading or "Fee unavailable."
- Only the basket list scrolls, in one shrinking `SheetScrollView`. It keeps
  the established measured bottom fade and centered chevron while more content
  remains below; short viewports use the established native indicator. Fitting
  lists show no cue. Facts, suggestion, and Done stay fixed below the list.
- From 1% impact, show a verified smaller-amount suggestion when its measured
  impact is lower. Warning levels aim to halve the current impact; danger
  levels keep the 3% target. The unfilled suggestion action is 52 points high,
  an owner-approved deviation from 62. Show the measured percent. Choices apply
  after closing through `useSheetDismissal`; Android then refocuses Amount.
- Done uses `AppButton variant="secondary"` without a local height. It follows
  the shared small-device rule: 44 points on windows of 667 points or less,
  56 points on larger windows.

Send/Convert Confirm and Sent follow these rules (owner feedback, 2026-10-19):

- The Sent step has no header: no progress bar, no close button, no divider. Done
  leaves. Sent shows the pay and receive amounts and the transaction ID. It shows no
  "To" row and no "Arrives" row; the user saw both on Confirm.
- Confirm shows the recipient once, in full, in the "To" row. The pay and receive nodes
  carry only the amounts ("You pay", "You receive"). Confirm has no "More details" row.
- Send/Convert Confirm adds "From" only for a VerusID or Private source card. Under a
  recipient's VerusID name, show the prepared transaction's resolved address
  in the existing small monospace address style, in full. Never resolve a name
  again for display.
- Confirm does not show the "centrally controlled currency" notice (owner decision).
- Confirm shows its warnings and errors above "Slide to send" ("Slide to convert"
  for a conversion), outside the scroll area (`above` slot of `WizardFooter`).
  The fact list scrolls and shows the
  bottom fade (`FadedScrollView`) while rows remain below.
- A send to the card's own address shows one light notice above the slide: "This is
  your own address. Only the network fee leaves your wallet." It does not block
  (owner, 2026-10-26).
- Fees are paid on top of the amount. Exports never block because fees reach
  the amount. A conversion or an export whose fees in the paid currency exceed
  its prepared amount shows one non-blocking light notice above the slide: "The
  fees are higher than the amount." (owner, 2026-11-13). Keep balance and
  preflight blocks. VRPC exports show separate Bridge fee and Network fee rows
  from the validated preflight that is signed.
- Owner approval, 2026-11-13 (T1 of the Confirm total mockups): an export's
  Total is not a list row. `ConfirmTotal` pins it directly above the slide on
  every window size, after the notices, in one group under a hairline, as
  Amount pins its receive block. Total adds the prepared amount and all fees by
  currency ID, listing each paid currency once (owner, 2026-11-03). On a normal
  payment it is a quiet row at list-row size. Only with the notice above does
  it become the largest number on the screen: a `titleRow` label and the node
  amount size, with the money value before it. Several paid currencies keep
  the row text. Preparing shows its skeleton in the same place.
- When the wallet takes the fees from the amount, the pay node shows it (owner,
  2026-11-13, option B of the reduced-amount mockups): the entered amount struck
  through in `caption` `textSecondary` above the sent amount, and "Lowered for
  fees" in `caption` semibold `warningText` under the label. Sent keeps the same
  node. There is no separate "Reduced from …" sentence. Invoices show it too.
  The wallet's lowered amounts stay as upstream computes them.
- An Ethereum-to-Verus bridge transfer splits its one ETH fee into Bridge fee
  (the contract's fee in the transfer's value) and Network fee (the gas
  maximum), from the prepared transfer. Network fee › opens the "Network fee"
  `InfoSheet`: a `caption` "Most it can cost" over the `MoneyValue`, then
  `bodySm` `textSecondary` text with no topic headings or dividers: the
  estimate plus 25 % and only used gas is charged; when the amount was
  lowered, a second paragraph on the ETH kept back (owner, 2026-11-13).
- "Your addresses" (Send to self) keeps each row on one line: the address
  shows its first and last six characters, under the VerusID name when there
  is one; screen readers get the full address (owner, 2026-11-13).
- Bridge fee, Network fee, Total and the Fees row of a send or same-chain
  conversion (owner, 2026-11-13) show the money value before the coin value
  ("≈ €6,98  12.15552225 VRSC"), in regular `textSecondary`, only when the
  ledger holds a price for every currency in that row. A positive value under
  one cent reads "< €0,01", never a zero.
- The receive node's money uses the received currency's own price
  (`useReceivedPrice`): the ledger's, or the ledger's price source for a
  target that is not a wallet asset yet, also outside the coin directory.
  Amount uses the same hook.
- On windows of 667 points or less, Confirm uses compact nodes (owner,
  2026-11-13): 32-point logos, 17/24 amounts, 44-point nodes, a 24-point
  connector that keeps the unit price, a 16-point top inset and 16 points above
  the rows.
- Confirm uses the approved B · Launch slide: 44/56-point primary height,
  white inset thumb, and a 90% release threshold. A short slide shows its hint
  in the label slot for three seconds. Accessibility activation sends once.
  Fee retry keeps the normal "Try again" button.
- After "Status unknown", Confirm shows only Close: the back arrow goes, and
  Android Back and the iOS swipe close the whole wizard, as Close does (owner,
  2026-10-26). A step back would lead to a Confirm that stays locked.
- While the wallet prepares the transaction, Confirm draws the review as it will look
  (`ConfirmPreparing`). What the user chose is real. The receive amount, price, fees and
  timing are skeletons. The button reads "Preparing…" and stays disabled. There is no
  separate loading screen and no loading text.
- The connector between the pay and receive nodes shows the unit price only. The route
  is behind the Price impact row, which opens "Price and route" with the price facts
  and the route (owner, 2026-10-22, so that Send and invoice Confirm match). The row
  shows "Details" when the impact is unknown and the route has a basket.
- A long receive label ("RSRG…LLck receives") wraps to a second line; it never runs
  into the amount.
- A currency name keeps its full form where it names the currency. A Bridge is
  "Bridge.vETH", never "Bridge".
- The unit chip under the amount shows only when the paid asset has a fiat price.

Network fee choice (owner approved variation A on 2026-10-20): plain ETH,
ERC-20 and BTC sends use a two-line "Network fee" `FlatRow` with the fee,
speed and optional fee-currency fiat value. It opens the canonical `SelectionSheet`
with Slow, Normal, Fast and Custom fee. The nested custom form uses `AppTextInput`,
an in-sheet Back action, a fee summary and one "Use this fee" action, with the
Address Book keyboard layout. Custom fees above twice Fast's effective gas price
or sat/vB rate show a warning without blocking "Use this fee".
Fee changes keep the review visible and skeleton
its fee and arrival time until preflight completes. Bridge, conversion and Verus
sends keep "Fees ›" and "Fee breakdown", except an Ethereum-to-Verus bridge,
which shows Bridge fee and Network fee ›.

### Send/Convert Amount, Recipient, Confirm and Sent

The owner approved these on 2026-10-18 (round 2 of the HTML mockups: Amount
option C "say it in money", Recipient option A, Confirm and Sent option B).
They stay flat: hairline rows, no cards, no capital-letter labels.

- **Amount, conversions and Ethereum exports.** Follow the option B pinned
  receive block and "Price and route" sheet rules above. They replace the earlier
  A2 receive line. Market price, suggestion and Via stay in Price and route. The
  system still picks the basket with the most output. Name a basket by what it holds
  (for example "VRSC-KMD-GOLD").
- **Price impact** is how far this conversion's price is below the market price.
  The market price is the output per unit of a small sample trade (worth about
  one display-currency unit) on the same route, fetched once per route. Levels:
  under 0.1% adds no chip by itself; 0.1% to 1% uses neutral, 1% to 5%
  warning, and 5% and up danger. For zero or negative impact (the user's price
  is equal to or better than market), Price impact reads "None", with no percent
  or money. The same rule applies to invoice pay mode (owner, 2026-10-27).
  This case adds no chip. A chip shown for another reason reads "Details".
  For positive impact, the chip says the percent. The sheet shows the money
  and percent in Price impact, with danger text from 5%, primary text from 1%,
  and secondary text below 1%. For 0 < impact < 0.1%, Price impact shows
  "<0.1%" in both send and invoice modes (owner, 2026-11-13). From 1% impact, a verified
  "Use <N> <SRC> instead | Price impact x.x%" action appears in the sheet while a warning
  or danger suggestion exists. Show the measured impact, never the one the
  suggestion formula aimed for. Say the money in what
  the user receives: the display currency when the ledger holds a
  price for the asset the user pays with ("$204.44"), otherwise the
  received asset ("0.0681 ETH"). Never use a minus sign and never count
  the loss in the asset the user pays when there is no price.
- **Recipient.** The address field is followed by flat 62-point rows ("Saved
  addresses | N ›", "Send to self | N ›") with hairlines. No cards, no icons and
  no helper line under the field. A send from the private card to a private
  address adds "Memo | Optional ›" as the first row (see Private card sends).
  Check typed VerusIDs after a short debounce. Continue stays off while checking
  and when not found. A network failure shows no typing error and leaves the
  explicit check on Continue available. An unsupported Ethereum address gets
  a specific inline error; Ethereum routes keep accepting it.
- **Confirm.** A pay node ("You pay", or "You send" for a plain send), a vertical
  connector with the price, and a receive node ("<recipient> receives")
  for conversions. Nodes use a 40-point logo, a 14-point label and a bold 20-point
  amount (compact nodes on small windows, see above); fiat captions appear only
  when a price is known. Then a flat
  list: "To" (full address in monospace) unless a short name is already in the
  receive node, "Destination network" for cross-chain, "Price impact ›" (the money
  when 1% or more, then the percent badge; it opens "Price and route"), "Fees ›", "Arrives", and "More
  details ›", which opens the "Transaction details" `InfoSheet` (To, Destination
  network, Route when a basket is used, From, Balance after). Fees and addresses wrap and never truncate. The footer stays
  Slide to send, or Slide to convert for a conversion.
- **Sent.** The header has no title and no back. The small animated check sits
  beside the 28/36 title. Then the same nodes ("You paid", "<recipient>
  receives"), flat rows ("To" when needed, "Destination" for a bridge,
  "Arrives", "Transaction ID" with `CopyAction`), one caption, and Done.

### Private card sends

The owner approved this on 2026-10-22 (memo option A of the private-send
mockup, sync option 1, and the Confirm notice). It restores what the old send
screen did for the private (z) card.

- Recipient accepts a private address (`zs…`) and "name@:private" only when
  the private card sends; another card shows "Only the Private card can send to
  a private address." A scanned private address offers only the private card.
- The memo is a "Memo" row, first in the Recipient rows, shown only for a
  private send to a private address. It opens the compact form sheet of Request
  amount's Note (`MemoSheet` on `ReceiveRequestSheet`): one multiline
  `AppTextInput`, the line "Only the recipient can read it.", and Done. Near the
  512-byte limit the line counts what is left; over it, an error keeps the sheet
  open. Confirm shows the memo once, as a "Memo" row under "To". A scanned
  request's note becomes the memo when it can travel in one.
- While the private card syncs, its coin card shows a `StatusBadge`
  (`variant="card"`) "Syncing x%" in place of the fiat line, Send is off, and
  "Choose an address" shows the card dimmed with "Syncing x%" and no chevron.
- Amount uses the private card's confirmed balance, as its preflight does.
  Funds that still confirm add one caption under Available: "<amount> <ticker>
  can be sent in about 10 minutes."
- From the private card to a transparent address, Confirm shows one notice
  above the slide: "This address is transparent. The amount and the recipient will
  be public on the blockchain."

### Pre-conversions

The owner chose variation A (inside Convert) with variation C's wallet screens
on 2026-10-23 (pre-conversion mockups). A pre-conversion sends funds to a
currency before its start block. Everyone gets the price that the launch sets.
All launch types use these screens.

- Convert to lists a pre-launch currency in its own "Pre-launch" section, after
  Popular conversions. The row adds one caption: "Launches in 6 days". The
  countdown is coarse (minutes, hours, days, "about N months", "about N
  years"). It reads "Pre-launch" while the block height is unknown.
- A pre-conversion goes to the source card's own address. Recipient is skipped,
  and the progress bar counts one step less. A failed launch refunds the same
  address: the daemon refunds a transfer to its destination.
- Amount pins "You receive" with the target logo and "Price set at launch". It
  shows no estimate, no chip and no "Price and route".
- Confirm shows "You pay", the connector "Price set at launch", and "You
  receive" with the ticker in the place of the amount. Rows: To (the address,
  with "Refunds also go here." under it), Destination network for a PBaaS chain
  launch, "Needed to launch" when the currency sets a minimum, Fees, and
  "Arrives" ("At launch, 25 Oct 2028"). "Needed to launch" shows the minimum
  only, because the wallet cannot read the total so far. There is no Price
  impact row. One notice shows above the slide: "This can’t be cancelled. If
  <currency> does not launch, the <paid asset> comes back minus fees."
- Sent reads "Pre-conversion sent" with the same nodes, an "Arrives" row and the
  Transaction ID, and no caption. The "Arrives" row is a deliberate exception
  to the Sent rule: the arrival at launch is the new fact.
- After a pre-conversion the wallet adds the currency, as after a conversion.
  Its Home row shows "<amount> <ticker> pre-converted" and a neutral
  `StatusBadge` "Launches in …" in the place of the fiat value. Hidden
  balances blur the pre-converted line.
- The asset screen of a pre-launch currency shows the asset line without cards
  and without the card picker. Then a neutral "Pre-launch" badge and flat rows:
  "You pre-converted" (only for two or more pre-conversions), "Launches" ("In
  about 2 years, 25 Oct 2028"), "Needed to launch" and "Details ›". Then one
  history row per pre-conversion: "Pre-conversion" with a warning badge,
  "Pending" or "Waiting for launch". It opens the Transaction sheet ("You
  pre-converted").
- "Details" opens the "Launch details" `InfoSheet`: Currency ID (copy), Launch
  block, Holds (each reserve with its weight), Supply at launch, and Maximum
  when there is one. A reserve that is not a wallet asset takes the daemon's
  name.
- The bottom action is "Pre-convert" (primary), or "Pre-convert more"
  (secondary) after a pre-conversion. It opens Convert at Amount with the
  currency chosen and the chain's own coin as the source when it is funded.
- The wallet reads pre-conversions from the blockchain
  (`src/utils/preconversion/`): reserve transfers with `preconvert` from the
  wallet's addresses to a pre-launch currency, with a wallet address as the
  destination. They show on every device and after a restore.

When a repeated stepped layout cannot use the existing composition, extract or
extend a shared primitive instead of making another local near-copy.

The gift card fund flow
(`src/containers/Services/ServiceComponents/GiftCardService/GiftCardFund/GiftCardFund.js`)
uses `ProgressHeader` with the step title: "Create gift card", "Build the
gift", "Review" and "Another wallet". Processing and the result keep their
centered title, so their header has none. After the first step, the card name
shows in a `HeaderContextBand` under the header (owner chose option A on
2026-10-23): a 16-point `gift-outline` icon in `textSecondary` and the name in
`labelSm`, with the 20-point gift card inset.

Owner-approved 2026-11-02, option B (Amount first): "Build the gift" reuses
`AmountInput`, its opt-in tappable unit, `AmountKeypad`, and `WizardFooter`.
The wallet's main coin (including its Testnet override) starts empty; if it
cannot fund the card, use the first compatible currency. Keep the Send amount
sizing, 48-point Available / MAX row, fee reserve, compact rules, and keypad
safe area. Available shows no ticker. The card-name band replaces Send's
network context. Amount starts 48 points below it, or 8 on compact windows.

The unit opens "Choose a currency", a single-choice `SelectionSheet`. A new
choice replaces the main currency and clears its amount. A currency already
in the gift swaps with the main amount. Other currencies with positive amounts
come first in 48-point hairline rows, then selected VerusIDs. Currency rows show
the exact amount and ticker; VerusID names keep one line with a tail ellipsis.
Each row has a 44-point remove action. A currency tap swaps it into the input
and puts the previous amount in that row; an empty previous amount disappears.
A VerusID tap reopens its picker. Amount, Available and extras scroll together
in `FadedScrollView`; the action and keypad stay fixed.

"Add currency or VerusID" uses `TextAction` in a 48-point row, with the
Lucide Plus icon and `link` in both themes. It opens the unfilled `GiftCardOptionsSheet` rows
"Another currency" and "VerusID". When only one kind remains, name it in the
add action and open that picker directly. Hide the action when neither remains.
Adding a currency lists only currencies outside the gift, makes the choice the
empty main amount, and moves the previous positive amount to the first extra.
"Choose VerusIDs" follows the multi-select `SelectionRow` rule above.
Its bottom action counts only VerusIDs new to the gift: "Add 1 VerusID" or
"Add 2 VerusIDs". It reads
"Done" when the draft adds nothing or removes a VerusID.
Only that action applies the draft. Outside tap and Back discard it.

On this step only, `ProgressHeader` shows a 44-point "More options" action
(`dots-horizontal`). Its one sheet row, "Fund from another wallet", keeps the
detail sheet's `ArrowDownToLine` icon and the existing external-funding flow.
The sole primary action is "Review gift card". It is enabled for any positive
amount or selected VerusID, including an empty main amount. No compatible
currency keeps the existing empty line and offers only available VerusIDs;
there is no amount keypad. Create and existing-card funding share this step.
Header Back and Android Back use the same step order and keep the contents.
Another wallet returns to Build when opened there; direct entry leaves the flow.
Review returns to Build. Build returns to the name step only for an unsaved new
card. After saving, Build leaves the flow and keeps the saved card. For an existing
card, Build leaves the flow. The name step also leaves. Processing and busy state block Back.
Result Back leaves the flow. Open sheets keep their own Back action. iOS swipe
is off while Back stays in the flow, a sheet is open, or an operation is busy.
Busy state disables editing and actions.

## Lists, forms, and settings

Address Book and Gift Cards establish the service-manager pattern:
`ServiceManagerHeader`, a direct page title, optional functional add action,
filters only when they help, and a clear list or empty state. Do not wrap the
whole list or sections in generic page cards.

Gift Cards opens on its list; there is no intro screen (owner, 2026-10-24).
Without cards, `EmptyState` shows the `Gift` glyph, "No gift cards yet" in
`titleSheet`, one line ("Share funds or a VerusID as a link, QR code, or NFC
card.") and "Create gift card". The first create, from that button or +, opens
`AcknowledgeSheet` "Treat gift cards as secrets" with "I understand" and "Not
now". It shows once per wallet; the share confirmation repeats the warning when
the risk starts.

The gift card list rows follow option C of the list mockup (owner,
2026-10-26):

- A card that is not claimed is a 68-point row: the 24-point `gift-outline`
  icon in `textSecondary` with no tile, 14 points from the text, then the name,
  the contents line in 13/18 `textSecondary`, the `StatusBadge` and the
  chevron. A Not funded row shows only the name, because its badge already says
  that the card is empty.
- Claimed cards follow the other cards under one "Claimed" title in `labelSm`
  and `textSecondary`. A claimed row is one 52-point line: `gift-open-outline`
  in `textSubtle`, the name in `textSecondary`, the chevron, and no badge.
- The Claimed filter shows the claimed rows without the title, because the
  selected filter already says it. Dividers start at the text, 38 points in.

Asset list rows take the wallet (Home) row sizes: the "Receive assets" list,
Select asset in Send and Convert, and Convert to (owner, 2026-10-24).

- A 38-point `AssetCoinLogo`, 16 points from the text, with 12 points of
  vertical padding. A row with two lines is 68 points high.
- The name in `titleRow`. On its right, the fiat value in 16/20 semibold, or
  "N/A" in 13/18 `textSubtle`. Asset lists show "N/A" whenever the price is
  unknown, including a zero balance. A known price with a known zero balance
  shows the zero fiat value.
- The second line 2 points under the name in `bodySm` and `textSecondary`: the
  amount, or "Launches in …" in Convert to.
- Convert to groups its rows under titles in capital letters ("POPULAR
  CONVERSIONS", "PRE-LAUNCH", "MORE CONVERSIONS"): `labelCaps` (11/14 semibold)
  in `textSecondary` with 0.6 tracking. The owner kept the capitals and asked
  for much smaller titles on 2026-11-13.
- These three lists, and Manage assets, show `AppSearchField` only when the
  whole list has 7 or more items (`APP_SEARCH_MIN_ITEMS`; owner, 2026-10-24).
  Up to 6 rows fit on the smallest phones without scrolling. Count the list
  before the search, so the field does not disappear while the user types.
  Without the field, the first row or group title starts 24 points under the
  header. The Add asset list keeps its field: it searches the whole catalogue
  and takes a pasted identifier.
- The same rule applies to these sheets and screens (owner, 2026-10-24):
  "Choose an address" (its All / Addresses / VerusIDs chips and its chain chips
  hide with the field), Link VerusID (the list of VerusIDs found for the wallet
  address; the field stays hidden while the lookup runs; "Enter VerusID
  manually" shows only when the lookup fails or the network has no identity
  index, as in the revoke and recover picker (owner, 2026-10-26)), Saved
  addresses in Send (the recipient step passes in the count of addresses that
  fit the send, so the field does not pop in when the sheet finishes loading),
  "Choose a currency" and "Choose VerusIDs" in Build the gift, the Address book
  screen (its search and network filter) and Pay with for burn invoices. The
  identity picker for revoke and recover already uses 7. The display currency
  sheet always has 33 items and always shows its field.
- When the controls hide, because the count drops below 7, the screen clears the
  search text and sets each filter back to its default (All). The controls then
  return in their default state. While they are hidden, the list uses an empty
  query and the default filter.
- Without the field, the content keeps no space for it: no fixed chrome height,
  no reserved field height and no padding. A sheet sizes its list from the
  chrome that shows. The list starts where the sheet's own title-to-list gap puts
  it. A sheet that filled 76% of the screen for the field (Saved addresses)
  fits its content instead.
- "Choose an address", "Choose a currency" and "Choose VerusIDs" show no count line
  under the title, because the rows already show how many there are (owner,
  2026-10-25). A row shows its network only when the list has more than one
  network, and never when the network repeats the row's own name (a native
  coin such as VRSCTEST, "Verus Testnet"). A gift currency row shows its amount
  without the ticker, because the row title names it. A card row without the
  network line has one line and is 60 points high (72 with it). Gift currency
  and VerusID choices use the canonical `SelectionRow` at 56 points minimum;
  their title and value styles stay on the shared theme roles.
- Below 7 items the address sheet grows past 76% when it must, up to 16 points
  under the top safe area, so every row shows without scrolling on an iPhone
  SE. With 7 or more items it keeps 76% and the list scrolls. Gift content
  pickers keep the canonical 76% `SelectionSheet` shell and scroll when needed.

Use `AddressBookEditSheet` for compact add/edit forms. Preserve its shared sheet
title, 20-point form inset, `AppTextInput`, keyboard-aware height, and
`SafeBottomActionStack` arrangement.

Manage assets removes an asset through the asset itself (owner chose option A
of the mockup on 2026-10-21):

- A tap on an asset row, outside its switch, opens `AssetDetailsSheet`: the
  Review asset header, then Balance, Network and Currency ID (or Contract
  address) as `ReviewRow`s, then one sheet action row, "Remove from wallet",
  drawn like "Remove from this device" in the gift card options sheet. The
  wallet's main coin (VRSC, or the Testnet override) has no sheet and is never
  removed.
- The sheet is an `InfoSheet` with the logo header in its `header` slot (owner,
  2026-10-23): the header stays at the top, the rows and "Remove from wallet"
  scroll, and Done stays fixed at the bottom on every window size.
- "Remove from wallet" opens `AcknowledgeSheet` ("Remove <name>?", "Remove",
  "Not now"). The message says that the balance stays on the blockchain; it
  hides the amount while balances are hidden. While the asset is removed, its
  row reads "Removing…".
- Removal works at any balance, because spam currencies can have one. A
  removed or ignored Verus currency stays out of "New assets found" until the
  user adds it again. Review asset for a found currency offers "Ignore" as the
  secondary action.
- The wallet never adds a found currency by itself, built-in ones included,
  because spam currencies can arrive too. Only the starting coins are on by
  default (VRSC, BTC and ETH; VRSCTEST and gETH on testnet). Every other Verus
  currency on the wallet's addresses waits under "New assets found" (owner,
  2026-10-26). A conversion or pre-conversion the user makes still adds its
  target, and a scanned request still asks "Add <name>?".
- Below 7 assets, the search field and the All / On Home / Hidden tabs are
  hidden, and "Your assets" starts 24 points under the header. The count
  includes "New assets found" and ignores the selected tab and the search text
  (owner, 2026-10-24). While the controls are hidden, the list shows every
  asset and the empty text never says "No matching assets" or "No hidden
  assets". When the controls hide, the search text clears and the tab goes
  back to All, so they return in their default state.

Settings work must compose `SettingsScaffold` rather than recreate its page,
section, row, divider, scrolling, safe-area, and footer behavior. Prefer plain
rows and dividers. Omit row icons unless they are necessary or already part of
the selected canonical setting pattern.

Recovery secrets (`src/containers/DisplaySeed`) show QR codes again (owner
request, 2026-10-22):

- A revealed recovery secret, and a revealed private or spending key under
  Advanced private keys, has a QR action left of its `CopyAction`. It matches
  CopyAction: a 44-point target with the Lucide `QrCode` icon at 18 points in
  `textSubtle`. Values of 1,000 characters or more get no QR action.
- The action opens `RecoverySecretQrSheet` on the acknowledgement sheet
  measurements: the title ("Primary recovery secret", "VRSCTEST private key"),
  the QR on Receive's white surface (216 points; 184 on windows of 667 points
  or less), the line "Anyone who scans this code can control the associated
  funds.", and Done.
- The sheet closes, and its value clears, whenever the screen hides the
  secrets: background, losing focus, or screen capture.
- The unlock's own Face ID or Touch ID sheet does not lock the screen, so
  "View recovery secrets" asks once. Leaving the app, another system sheet
  (such as Control Center) or screen capture still locks it.
- The screen title shows once, in the navigation header (or the signed-out
  header). The secret cards follow the warning notice without a section label.

## Asset screen balances

The owner revised the pending-balance rule on 2026-10-26. It applies
to `SignedInAssetHeader` and the asset screen's "Choose an address" sheet
(`CoinCardPickerSheet`).

Owner approval, 2026-11-03: Final (E-r4, variant 5) replaces the carousel
with a card stack and a persistent transactions sheet. It applies to the asset
screen only. Other `SignedInActionBar` users keep their existing layout.

- Hide the native header. Under the top safe area, draw one 48-point top row
  (44 on windows of 667 points or less), then a 4-point gap (2 compact).
  Use 20-point side margins, the 44-point back arrow, a 24-point logo and the
  coin's display name in `titleRow`. Keep the iOS edge swipe. The total is
  16-point bold with tabular figures and no ticker; its fiat is 12-point
  medium in `textSecondary`. Both blur when balances are hidden and form one
  accessibility element. Bridged origin sits under the name, with its existing
  44-point target and information sheet. Pre-launch assets keep this row and
  `PrelaunchAssetPanel`, without cards or a picker. Remove the Layers button.
- The selected card is at the bottom/front of the pile. Other cards, nearest
  the front first: Main, pins in pin order, one last-used
  card, then confirmed balance from high to low (ties keep card order).
  Main is `MAIN_WALLET` when present, else the first Transparent card in the
  coin's original card order, else none. Verus/PBaaS Transparent cards use
  dynamic `SUBWALLET_vrpc.<address>.<system>` IDs. Omit the front from those
  strips. Main always shows, is never pinned or last used, and has no pin toggle.
  Count every shape, including "N more": the cap is 6, or 4 compact. Up to
  the cap, show every card. Above it, show the front, cap minus 2 strips, and
  a neutral "N more" strip. That strip shows the hidden cards' total and fiat
  and opens `CoinCardPickerSheet`. Selecting any card makes it the front card
  through `setCoinSubWallet` with the explicit-choice flag.
- Owner-approved order, 2026-11-03: Private starts pinned when present. Pin
  limits are 3 on normal windows and 1 on compact windows (cap minus 3).
  The user can unpin Private. Missing pins use that default; an explicit empty
  list stays empty. Last used is the last selected card outside Main and the
  pins. Selecting Main or a pin keeps it. Pinning it frees the slot. Unpinning
  the front makes it last used; unpinning another card leaves last used alone.
  The pure stack rule derives last used from a front outside Main and the
  visible pins. Pending saves and larger saved pin lists cannot exceed the cap.
- Save ordered pin IDs, last-used ID and selected ID per account and coin in
  `generalWalletSettings.cardStackPreferencesByAccount[accountHash][coinId]`.
  IDs are subwallet IDs, including `SUBWALLET_vrpc.<address>.<system>`.
  One observer of `setCoinSubWallet` records all active-card changes. Leaving,
  signing out and restarting keep these choices. Home's existing opening rule
  first restores a saved selected ID that still exists, then uses its previous
  funded/default rule. Ignore stale IDs and saved Main IDs in pins or last used.
  Prune stale and Main pins on the next pin edit.
  Above the layout's limit, the stack uses the first live pins in pin order;
  the picker retains all live pins. Its limit note stays through unpins until
  the count falls below the limit.
- Strips expose 52 points (48 compact), with 24-point corners (22 compact)
  and 20-point padding. Show the VerusID name, preserving its final @ with a
  middle ellipsis, or the card type. Titles use `titleRow`; amounts are
  15-point bold tabular; fiat is 12-point medium at 86% white. On a strip the
  sync badge sits 10 points left of the amount on one line; on the front card
  it takes the fiat line under the amount. Keep the existing connection-error
  copy. Pressed strips
  get a 12% dark overlay. Selection moves cards with a 400 ms transform;
  Reduce Motion uses a short fade.
- The front card is 140 points high (126 compact). Its quiet 12-point line
  shows the address in monospace, truncated 8...8, or "VerusID". Its top-right
  `CopyAction` keeps a 44-point target and copies the existing identifier.
  The amount is 32-point bold tabular (28 compact), and fiat uses `labelSm`
  at 86% white. One card uses 74 points (70 compact) and omits its amount and
  fiat because the top row shows the total. Show "<ticker> network" at the
  right of the quiet line only when the card's network differs from the coin's
  own system. VRSC on VRSC shows no network line.
- Materials are flat two-stop SVG gradients, top left to bottom right, in both
  themes. Transparent and other address types use #2B5CC2/#2350A6; Private uses
  #2C3544/#1C2330. VerusIDs use Jewel, in this hue order (mid, then deep):
  Grape #7843A0/#693491 and #642E8B/#58207D; Rust #9A3E21/#8A3010 and
  #842A09/#722000; Teal #066567/#045758 and #015253/#024446; Plum
  #98366F/#882661 and #82215B/#74104F; Olive #5C6002/#4E5000 and
  #4A4C00/#3D4000; Ochre #7C5401/#6A4600 and #644200/#543700; Forest
  #006A3C/#005932 and #00552F/#014627. Use one upward shadow per card and
  Android elevation. No outlines, grain, foil, glass, streaks, glows, text
  shadows, 3D neighbors, rail or dots.
- Save an integer color slot per identity i-address and account. Slot is
  hue * 2 + tone. Start at FNV-1a-32(i-address) modulo 7, walk forward to the
  first least-used saved hue, and alternate its mid/deep tone. Seed a missing
  map in i-address order. Keep old assignments after unlinking. Load/save slots
  before publishing cards in the coin saga, using
  `generalWalletSettings.identityColorSlotsByAccount[accountHash]`. Coin,
  balance order, cap and theme cannot change an identity's color. Looks may
  repeat above 14 identities. A storage-write failure keeps the session map
  and retries on the next card rebuild. It does not block wallet access.
- Picker rows start with the same material in a 28 x 19-point swatch with
  5-point corners. Dark swatches have a 1-point rgba(255,255,255,.2) border.
  The picker groups live pins under "PINNED" in pin order and the rest under
  "OTHERS" in its frozen balance order. Hide empty groups. Without a
  visible PINNED group, show no group titles. Search and type
  chips filter both groups. Titles use Convert to's `labelCaps` (11/14 semibold),
  `textSecondary` and 0.6 tracking, per the 2026-11-13 owner request. Every row
  except Main has a separate 44-point Lucide Pin button: outline in `textSecondary`, filled in `link` when pinned. Pin edits
  move rows immediately and save. At the limit, tapping an off pin shows one
  inline warning below PINNED: "You can pin 3 cards. Unpin a card first."
  Compact reads "You can pin 1 card. Unpin a card first." Clear it on unpin or
  reopen. If saved pins exceed the limit, keep the note through unpins until
  the count falls below the limit.
  Keep the existing rows, current fill, swatches and current-row scrolling.
  No pin marks show on stack cards. `check:card-colors`, also run by
  `check:design`, checks white and 86% white at 4.5:1 or more on every material.
- Receive, Send and Convert reuse `SignedInActionBar` at 48 points, including
  compact windows, with 20-point side margins. The gap above is 14 points
  (10 compact); the gap below is 16 (10 compact). Keep all enable rules.

The top row stays fixed. Transactions live in a sheet: it peeks under the
actions and opens by a drag or a tap on its header. When it is open, the stack
folds into a bar that names the selected card.

- `DraggableSheet` is non-modal and uses Gesture Handler and Reanimated only.
  One progress value drives the sheet, stack fold, selected bar and chevron.
  It ends above the tab bar, which owns the bottom safe area. The sheet uses
  `sheet`, 28-point top corners, an upward shadow and a 52-point header with
  a handle and the `titleRow` title "Transactions".
- At peek, a vertical drag anywhere moves the sheet and history cannot scroll
  or pull to refresh. Open history scrolls and can refresh at the top. Only
  the open header drags down to close, so refresh and closing stay separate.
  A 6-point vertical activation threshold keeps row taps; horizontal movement
  fails the pan. A flick from 500 points/second selects the far snap point.
  Slow drags settle to the nearer point. Ignore zero-pointer iOS pan resets.
- The open selected bar is 48 points high, 6 points below the top row's gap
  (4 compact), with 14 points to the sheet (12 compact). Show its name and
  amount in `titleRowCompact`, without fiat, then a down chevron. Tap it to
  show all cards. Strips tuck and fade; the sheet covers the actions.
- Android Back closes an open sheet before leaving. The header is an accessible
  button with Open and Close actions and the appropriate hint. Open state hides
  the normal stack and actions from accessibility; the selected bar and fixed
  top row stay reachable. Reset to peek on screen focus and card changes.
  Keep Overview's rows, details sheet, empty/error/loading states and channel
  refresh behavior.

- Every card and the asset total show the card's total, the number Home adds
  up: confirmed funds plus funds that still confirm. Read it with
  `getLedgerTotal`; do not show the confirmed balance on these screens.
- Do not show a separate pending amount under a card's amount or in "Choose a
  card". The total already includes it; readers added the second amount again.
- While the private card syncs, keep "Syncing x%" in place of its fiat line.
- Send keeps its own rule: the private card sends only confirmed funds (see
  Private card sends).
- Home opens the card the user chose. Without an explicit choice, it opens a
  funded card. If no card holds funds, it keeps the existing default.

## Bridged asset line

The owner chose variation C of the "mapped to" mockup on 2026-10-23. It
applies to `SignedInAssetHeader` only.

- A Verus currency whose original lives on Ethereum shows one line under the
  display name: "Bridged from Ethereum ›", or "Bridged from Sepolia ›" on testnet. It
  uses `caption` in `textSecondary` with a 14-point `textSubtle` chevron. The
  text truncates and the chevron stays; the target is 44 points high.
- `getBridgedOrigin` in `src/utils/assets/bridgedOrigin.js` decides it from
  data: the currency is the Ethereum gateway (vETH, mapped to ETH), or its
  system is that gateway (DAI.vETH, vUSDC.vETH, tBTC.vETH and the other bridged
  tokens). VRSC and Bridge.vETH also carry `mapped_to`, but their original
  lives on Verus, so they show nothing. ETH, ERC-20 and other asset screens show
  nothing; there is no "Also on Verus" line. The line hides until the mapping
  resolves.
- Home, its rows and the card picker do not change.
- A tap opens `BridgedOriginSheet`, an `InfoSheet` titled as the line without
  the chevron. Rows, each only when its data exists: Original (the token name),
  Contract address with `CopyAction` for an ERC-20 original, and the "View in
  explorer" action row to the token on Etherscan or Sepolia Etherscan. vETH
  shows only Original. Rows do not repeat the network or the title.

## Transaction history row

The owner approved this row on 2026-10-19 (option A of the history mockup, task
TX-1.HISTORY-NEUTRAL in `UI_REDESIGN_PLAN.md`). It applies to the transaction list
on the Coin Overview, drawn by `FocusedTransactionRow` in
`src/containers/Coin/Overview/Overview.js`.

- Mark: a 32-point circle in `surfaceMuted` with a 16-point `textSecondary` arrow,
  down for incoming and up for outgoing. Every row uses the same gray. The mark
  has no color and no pending clock.
- Color: green stays on the amount of an incoming row. Nothing else in the row is
  colored.
- Pending: the `StatusBadge` with the warning tone and the label "Pending" takes
  the place of the date line.
- Title: the counterparty address. A receipt names the address of the card it
  arrived on: "My transparent address", "My private address", "My VerusID", or
  "My address" for other cards. Do not label a row as a conversion; the owner
  removed those labels on 2026-10-19.
- Keep the chevron, the amount, ticker and fiat value column, and the skeleton rows.
- Hidden balances also blur all transaction amounts and fiat values in history
  rows and the Transaction sheet, including fees; accessibility says "Balance hidden".
  The hidden/shown choice is per phone and survives account changes and app restarts.

## Transaction details

Confirm, Sent and transaction-detail fact rows with `copyValue` copy the exact
value on long press or the accessibility Copy action. Use `useCopyFeedback`
and `CopyFeedback` for the light haptic and stable 1.4-second check/"Copied"
feedback; `CopyAction` shares the hook and keeps its visible control.

A tap on a history row opens `TransactionDetailsSheet` in
`src/containers/Coin/Overview/TransactionDetailsSheet.js`. It replaced the legacy
`TxDetailsModal` on 2026-10-21 (gap 1 of the redesign gap audit) and follows the
Sent step. The owner approved it on 2026-10-21.

- `InfoSheet` with the literal title "Transaction", the date and time as the
  subtitle, and a `StatusBadge` on the title line (`headerAccessory`): success
  "Confirmed" or warning "Pending".
- Then the Sent step's `TransferNode`: the asset logo, a label ("You sent", "You
  received", "Interest", or the history row's fee label), and the amount with the
  fiat value when the ledger holds a price. The amount has no sign and no color,
  because the label gives the direction.
- Then `InfoSheetRow`s under a hairline, each only when its data exists: To (one
  address per line; `CopyAction` only for a single address), Network fee,
  Message, and Transaction ID (one line with a middle ellipsis). `copy` on the row
  adds `CopyAction`. Identifiers use 12/17 monospace, the Sent step's ID size, so a
  full R-address fits on one line on an iPhone SE.
- "View in explorer" is a sheet action row. It shows only when the coin has an
  explorer.
- Done closes the sheet, as in every information sheet.

## Transaction result

`src/components/TransactionResult.js` draws every screen after the wallet
sends one or more transactions. It is the Send flow's Sent step, extracted on
2026-10-23 after the claim result said "submitted" four times ("Claim
submitted", "The claim transaction was submitted.", "SUBMITTED TRANSACTIONS",
"1 transaction submitted.").

- No header. The animated check sits beside the 28/36 title only when every
  transaction was sent (`success`). A failure or a partial result shows the
  title alone. A `description` under the title is only for a fact the title
  does not state ("1 of 2 transactions was submitted. ...").
- Then the optional amount (`TransferNode` rows, or the claim's large amount),
  the optional fact rows (`FlatRow`, such as Destination), and the
  transactions. One transaction is a "Transaction ID" row with `CopyAction`.
  With two or more (`itemized`), each transaction is a block: its group (the
  chain, only when they differ), what it moved ("alice@ and funds"), then its
  "Transaction ID" row. An explorer link adds "View in explorer" as a sheet
  action row under the row.
- The caption says what happens next ("Sharing unlocks after it confirms."). A
  `warning` line asks the user to do something. The actions sit in the safe
  footer; the first is primary.
- Gift card funding results offer Share only when
  `getGiftCardCapabilities(card).canShare` is true.
- The component has no prop for a section label or a count line, because the
  title and the rows already say both.

Users: Send, Convert, pre-conversions and invoice payments
(`SendWizardSuccess`), gift card funding (`GiftCardFund`) and the card claim
(`SpendableKeyRequestInfo`).

## Services home

The user approved this pattern on 2026-10-15 (SV-1 in `UI_REDESIGN_PLAN.md`).
The Services tab root shows each service as a tile in a two-column grid. This is
an approved exception to "Keep pages flat". It applies to the Services root
only and does not permit cards on other pages.

- Title: `headlineMd` "Services" with the existing header spacing (20-point
  inset, 12-point top, 16-point bottom).
- Grid: 20-point screen inset, two equal columns, and a 12-point gap in both
  directions.
- Tile: `surfaceMuted` fill, 18-point radius, 16-point padding, and a minimum
  height of 140 points. No border and no shadow.
- Icon: one 24-point line icon at the top left, in `primary` (light) and
  `textPrimary` (dark). It identifies the service.
- Text at the bottom of the tile: the name in `titleRow`, then one line in the
  13/18 caption size and `textSecondary`.
- That line shows a count for a service in use ("3 cards", "4 saved"). For a
  service not in use, it says what the service does in two or three words
  ("Save addresses").
- Do not show artwork, long descriptions, status counts, pending counts,
  badges, or dots on a tile.
- A new service adds one tile: an icon, a name, a count rule, and a purpose
  line. It needs no new artwork.

## Claim a gift from an NFC card

Owner-approved 2026-11-04: G1–G8, G6b and C1 in the gift NFC claim mockup.
Without a wallet for the request's network, lead with the Gift `StepGlyph` and
This card holds followed by the discovered amount. Use `SkeletonLoader` while
reading. A protected key, failed scan or several assets uses This card holds
a gift. The preview uses the existing root-chain discovery with no wallet.
The preview scans the root chain, then every known chain. If another chain
fails, keep the root chain result. Only a complete scan with no claim and no
unspent output uses "No funds found on this card" (owner-approved
2026-11-10), with or without a wallet on the phone. One named currency stays
in the title. Several currencies, VerusIDs or an unnamed currency use a count
title, such as "This card holds 2 currencies" or "1 currency and 1 VerusID".
Below it, list each one with the claim review's flat rows: name left, amount
right, hairline dividers, and the title margin below the list.
Below the no-wallet title, show the option C step list right after the title
margin: Plus "Create a wallet on this phone", ShieldCheck "Back it up to this
card or with its Secret Recovery Phrase", Wallet "Claim the gift into the new
wallet". A backup-only request keeps its one body line. Reuse Personalize wallet, Create password, biometrics and `WalletSetup`.
Keep the wallet name empty. Create on the request's network with the primary
phrase also used for the shielded seed. Resume at Back up wallet.

The backup step uses `ProgressHeader`, the wallet summary and plain
`SettingsRow`s: 62-point minimum, `titleRow`, full-width dividers and no icons.
Keep the Settings backup layout and icons. State the overwrite once: Writing
the backup replaces the gift on this card. The gift stays on this phone until
you claim it. A newly created wallet offers Use the Secret Recovery Phrase
instead. Reuse the onboarding phrase pages and check, then skip the backup
detail without writing the card. Backup written offers Continue to claim.

When this phone has a wallet on the request's network, option C (Add-on,
owner-approved 2026-11-09) replaces C1's two choices. Keep the gift title and
its loading skeleton. Show one unchecked row: "Also back up my wallet to this
card". Reuse the V2 `SelectionCheckbox` at the start, the `SelectionRow`
56-point minimum height and 18-point radius, and `surfaceMuted`. Checked uses
`successBackground`, with no outline. This start-aligned box and checked fill
are exceptions to the standard multi-select row. Busy disables the row and
buttons. The row exposes its checkbox role, label and checked state.

Place the plain-text steps 40 points below the row (32 on compact windows).
When the box adds a step, the other steps move in 200 ms to make room, then
the new step fades in (180 ms). Its text never covers another step. A removed step leaves at once and the others move up. Do not
add an exit animation: on Android it left the window blank when the request
container replaced this screen. Steps shown at mount do not animate, and the
system reduced-motion setting turns the motion off.
Each step has a 32-point `surfaceMuted` circle, an 18-point Lucide glyph with
1.8 stroke, and `bodyMd` text. Join circles with a 1.5-point `border` line.
Signed out starts with LockOpen and "Unlock your wallet on this phone".
Signed in on the other network starts with LockOpen and "Switch to your
testnet wallet" or "Switch to your mainnet wallet". A matching active wallet
omits this step. Checked adds Nfc and "Write the backup. It replaces the gift
on the card." The final Wallet step reads "Claim the gift into that wallet"
after unlock or switch, or "Claim the gift into <wallet name>" otherwise.

The safe footer shows "Claim gift" unchecked, "Back up and claim" checked,
then Cancel. Keep the existing claim and backup paths. Store the checkbox in
request passthrough separately from `walletBackupChoice`, which resumes backup
after unlock. A cancelled unlock clears only that resume flag. On the backup
options step in this gift-choice path, header Back and Android Back return to
the choice with the box checked. Close and Cancel keep their existing exit.
A new scan starts unchecked and shows the choice. No-wallet and Settings
backup Back behavior stays unchanged.

Unsigned backup and claim screens use plain action titles; signed requests
keep their requester card. Keep the saved-request overwrite guard and claim
engine. A backup-only request without a wallet uses the same onboarding and
setup, with copy about creating and backing up a wallet.

## Gift card detail

The user approved this pattern on 2026-10-15 (SV-1 in `UI_REDESIGN_PLAN.md`).
The detail screen shows one fixed card and says each fact once.

- Header: back on the left, then refresh and the ⋯ options button on the right.
  There is no screen title, because the card shows the name.
- Card: `GiftCardFixedCard.js`, with the earlier flip card's material, at the
  full content width. Its outline, amount and unit match the payment slip
  (owner, 2026-10-22): `src/utils/ticketOutline.js` draws 20-point corners and
  two round notches at half height, the amount is 44 points (38 on narrow or
  short windows) and the unit 20 points. The card does not flip. It has
  no swipe hint, no "VERUS GIFT CARD" label, and no issued date.
- On the card: the card name (17-point semibold) and the status badge on the
  top row. The first content item is large at the bottom ("25 VRSC"), and the
  other items follow on one line ("+ sam@"). An empty card shows "No contents
  yet". A claimed card shows "Empty". A pending amount is dimmed.
- Status: one badge on the card. Ready uses the success pair, Pending uses the
  warning pair, and Not funded, Shared, and Claimed use the neutral pair. The
  card material is dark, so the badge uses the dark-mode success and warning
  pairs in both appearances. Its neutral pair is a light tint of the card
  material, as in the approved mockup.
- Sharing: when sharing is possible, Share, QR code, and NFC sit under the card
  as three equal 76-point tiles (`surfaceMuted`, 18-point radius). These tiles
  are part of this approved pattern only. The first share of an unshared card
  opens the confirmation sheet with "Not now". A shared card shares again
  without the sheet. A card that is not funded shows no tiles; "Share before
  funding" in ⋯ opens the same sheet.
- Gift card QR keeps the full spendable-secret warning above Save to photos on
  compact windows, in the fixed action stack even after a save error. As on
  Receive, its QR is 184 points on windows up to 667
  points, or 160 up to 640, with tighter vertical spacing. Normal windows keep
  the 232-point QR.
- Shared on Android: Android does not report when the system share sheet is
  closed without a send. Opening the sheet therefore marks the card Shared,
  because the link may have left through Copy. Keep this (user decision,
  2026-10-15). On iOS a dismissed sheet leaves the card unshared.
- Facts: label/value rows with hairline dividers under the card, only for facts
  the card does not show: Shared, Claimed by, Claimed, Claim protection, and
  Created. Copyable values use `CopyAction`.
- Pending: one "Funding transaction" row with the transaction ID in monospace
  and `CopyAction`, and one line: "Sharing unlocks after it confirms."
- Actions: a bottom primary action appears only when the card is not funded
  ("Add contents", with "Fund from another wallet" as a secondary button). Less
  frequent actions stay in ⋯, drawn with the sheet action rows.
- Warnings appear in the share confirmation, not as permanent notice boxes.
- Wording: use "Claimed", not "Redeemed" or "Claim completed". Use "Shared" as
  the status after the link leaves the wallet.

## VerusID page

The owner approved "D revised" on 2026-10-22 (round 3 of the VerusID mockups).
It replaces the old fold-out details. The tab icon stays the VerusID @ mark; the
page itself shows no mark.

- List: one filled row per linked VerusID: `surfaceMuted`, 18-point radius,
  76-point minimum height, no border, no shadow. The name uses `titleRow`, with
  the first part in `textPrimary` and the parent and network in `textSecondary`.
  Under it, the asset count in `caption` ("2 assets", "No assets"). A
  `StatusBadge` shows only for Locked (warning) or Revoked (danger); Active is
  silent. A chevron ends the row. The title has no count pill.
- No linked VerusID: `EmptyState` with `AtSign`, "No VerusID yet", the create
  or link explanation, and "Add VerusID". The action opens the same options
  sheet as the header +, with New VerusID and Link VerusID. The list header's ⓘ ("About VerusID") opens the
  explainer; the empty state has no second link to it.
- About VerusID is an `InfoSheet` titled "VerusID" with no subtitle (owner
  approved option E, 2026-11-16). First three facts: "Get paid by name",
  "Sign in without passwords" and "Keep your data yours". Each has a 36-point
  mark (`primaryBackground`, 11-point radius, 18-point Lucide glyph in `link`),
  a `titleRowCompact` title and a `caption` body in `textSecondary`. Then the
  fold-out topics "Connected apps", "What others can see", "If you lose your
  phone" and "Yours for good". The text speaks to what the user gets and names
  no specific VerusID. The marks are an approved exception to the
  information-sheet rule against icons, for this sheet only.
- Header: the arrow back button, and ⋯ on the right. After the card scrolls
  away, the header shows the first part of the name. ⋯ opens three action rows:
  "Transfer VerusID", "Modify VerusID", and
  "Unlink VerusID" (danger). Unlink opens the existing confirmation. This menu
  revision is owner approved 2026-11-04.
- Card (`VerusIdCard.js`), at the content width: `surfaceMuted`, 24-point
  radius, no border, no shadow, no mark. The name in `headlineMd`
  (`headlineCompact` on windows of 667 points or less), in the two list colors,
  with `CopyAction` at the right of its first line; it copies the name. Under it
  the network, with the status badge on the same line. The card shows no
  i-address; Details has it (owner, 2026-10-22). This filled card is an approved
  exception to flat pages, for this page only.
- Under the card: Receive, Send and Convert as the asset screen's small icon
  buttons (`SignedInActionButtons` in `SignedInActionBar.js`), 12 points below
  the card, with no primary. Receive opens Receive on the VerusID's own network
  with its card. Send and Convert open the wizard on the asset when the VerusID
  holds one asset, and Select asset with only its assets when it holds several.
  Send and Convert are off when the VerusID is locked, revoked or empty; Convert
  is also off when conversions are disabled. Receive is off when it is revoked.
- Control: a `titleRow` section title, then the gift card fact rows. "Spend and
  sign" reads "Only you", "You and others", "Other addresses", "Locked" or
  "Revoked", with "N of M signatures" or the unlock time below. "Revoke and
  recover" reads "This VerusID" or the authority's name; different authorities
  get separate Revoke and Recover rows.
- Then two flat 62-point rows, as on Recipient: "Content | N entries ›" and
  "Details ›". Content without entries reads "None" and does not open.
- Content is an information sheet with one `InfoSheetRow` per decoded value:
  text, a link, an image size, a field count or a byte count. All encrypted
  values of one key form one row, "N values", with a neutral "Encrypted" badge.
  The wallet never decrypts them.
- Details is an information sheet: i-address (with `CopyAction`), Parent,
  Primary address(es), Private address and Last change (block). "View in explorer" shows only where the network has
  a VerusID explorer, so never on testnet.
- Funds come last: a `titleRow` title, then one Manage assets row per asset
  whose VerusID card holds a balance (40-point logo, `titleRow` name, `bodySm`
  amount, chevron). A tap opens that asset screen with the VerusID card
  selected; Back returns to the VerusID page. Skeleton rows show while balances
  load. "This VerusID holds no funds." shows when there are none. Hidden
  balances read "Balance hidden".

### VerusID management and Link

Owner approved 2026-11-04: TS1–TS5/TS8, TU10–TU12, Link option A (LK2),
and Modify option B (MB1–MB4). The canonical sources are
`IdentityManagement/IdentityManagementScreens.js`, `ManagementComponents.js`,
and `IdentityLinking/LinkIdentities.js` under `VerusIdService`.

- Transfer is one flat form, then review. Modify first chooses sections with
  multi-select `SelectionRow`s, following the checkbox rule above. Show only
  chosen sections, in Spend and sign, Revoke and recover, Private address order,
  then review. Restore loaded values
  when a section is deselected. Keep one fields state, one diff and one engine
  preparation. Progress is `(index + 1) / (max(chosen sections, 1) + 2)`, so the choose step
  starts at one third (MB1).
- Use `ProgressHeader` with the step title. Its existing right slot holds one
  44-point info action: Lucide `Info`, 23 points, stroke 2.2, `textSubtle`.
  The choose step has no info action. Transfer has no progress track. Long
  upstream explanations live in `InfoSheet`; About this transfer uses 86%.
- Reuse the outline fields and normal-flow safe footer. Review uses
  `SlideToConfirm`. Consent gates its handler as well as its disabled state. Modify
  before/after pairs use the approved soft-fill review panel. Results use
  `TransactionResult`; Retry unlink is primary and never sends again.
- Link is a full page with the multi-select `SelectionRow` rule above,
  search from 7 items, skeleton loading, a counted Link action,
  failed rows first and still selected,
  and the existing manual-link fallback after discovery failure. The page header
  info action keeps the upstream linking explanation and wallet addresses in an
  `InfoSheet`. Do not invent
  a filtered-out count. Keep network choice when several networks are available.
  An already-linked row has no box or subtitle. Show `Linked` with `quietValue`
  at full opacity and dim only its name to 0.6. The row is read-only. Keep the
  checkbox role, checked and disabled states, and `<name>. Already linked` label.
  Management and Link hide the tab bar while active.

### New VerusID registration

Owner approved 2026-11-04: V3 name field, two-payment registration screen, and
namespace sheet. Canonical source: `IdentityRegistration/RegistrationDesign.js`
and `identityRegistration.styles.js`. This applies to registration only.

Owner-approved 2026-11-13: R15 meter cards and R13 Add VerusID empty state.
Name shows one Price card, plus Network fees for a two-currency namespace.
These cards are an approved exception to flat pages. Use `surfaceRaised` in
dark mode and `surfaceMuted` in light mode, without borders. Cards use 18-point
corners, 18/20-point padding and a 12-point gap. At the existing 667-point
window cutoff, use 16-point corners, 12/16-point padding and an 8-point gap.
Amounts use `titleSheet`, or `registrationAmountCompact` (17/22). Fiat appears
only with a display-currency price. Use a rounded 8-point balance meter (6
compact), then You have. Short balances use danger text and semibold weight.
Do not add badges, icons or shortage instructions to these cards. Hidden
balances also hide the meter fill and its accessible balance. Referral-only
funding shows the affordable referral quote and the next-step note.
Retain the last display quote while checking another name in the same funding
context. Continue still requires a fresh name result. Before a quote arrives,
use `SkeletonLoader` with the same card shapes and expected currency count.
The keyboard footer keeps compact amount rows without a referral price line.

- Reuse `AppTextInput` with the namespace in `endAccessory`: one 48-point
  outline, 12-point radius, and a 1-point divider between the editable name and
  the growing namespace segment. The divider uses the outline's current color.
  Focus wraps both. Taken uses a danger outline
  and the status badge. No fill. V3 replaces the earlier filled R/NS fields.
- Use the shared continuous `ProgressHeader` track for Name, Referral when
  allowed, and Check details. Its right action keeps the 44-point Info and Close
  targets. Referral uses single-choice `SelectionRow`s: success fill and check,
  no outline. Check details opens "Choose an address" from Pay from. Its rows
  show balances as Send does, without "confirmed". The content keeps the signed-in
  20/24/28-point insets. Use `SlideToConfirm` and `SafeBottomActionStack`.
  The first slide commits. A separate second slide registers after one confirmation.
  Preserve all upstream recovery paths.
- Root registrations on VRSC and VRSCTEST show "Verus Coin Foundation@" only
  when the namespace allows referrals. Select it by default when its quoted
  price is affordable. Keep "Someone else" and "No referral". Namespace changes
  reset the default; Back and Continue keep an explicit choice. The row prices
  and Check details split explain the discount and referral payment.
- The namespace segment opens `SelectionSheet`. Use `AppSearchField` from
  seven items, success fill/check for selection and no unselected chevron.
  Hide unavailable namespaces and list the chain's own namespace first, then A–Z.
  Search can explain a permanently unavailable match. A partial check failure
  keeps one muted context line and Try again. Owner-approved V1 keeps the
  canonical rows and uses `quietValue`: bodySm/textSecondary for the price,
  caption/textSubtle for its fiat line. Token prices show only the number;
  zero reads Free. The root keeps its ticker. Use exact SDK prices and engine
  quotes. Fiat uses the display currency and existing cached ledger exchange
  rates. Hide it when the exchange rate is unavailable; do not fall back to USD.
- Explanations use `InfoSheetTopic` in `InfoSheet`; transaction details use `InfoSheetSection`.
  Saved/pending jobs use the VerusID tab's filled-row rhythm and Continue pill.
  Results reuse `TransactionResult` and the existing `VerusIdCard`.

## Home value chart

Home starts with a closed 48-point value strip (44 on compact windows). Its
44-point range label and down chevron open the chart. A strip tap also opens it;
a horizontal scrub does not. Open keeps the 124-point chart (108 compact) and
range row, with an up-chevron toggle at its end. The phone remembers open or
closed across accounts and restarts, without an opening animation on load.
Height changes take 240 ms with the V2 ease-out curve. Redraw the line without
scaling it; Reduce Motion is instant. During a closed-strip scrub, the date
replaces the hero pill and the eye and plus fade out. Keep the existing chart
tokens, loading skeletons, hidden balances, and day-one behavior.

## Home notification card

The owner chose card A on 2026-10-22 (gap 5 mockups). On 2026-11-04, the owner
chose look A of the notice-size mockups: the same layout, scaled down.
A VerusID request
(`NotificationWidget.js`) shows one card under the Home balance.

- `surfaceMuted` fill, 16-point corners, no border. Padding is 12 points at the
  top and bottom and 14 on the left. Right padding is 0 with a close target,
  or 14 without it. The name is semibold and the rest regular in `bodySm`
  (14/20): "<name>@ is ready" or "<name>@ could not be created".
- A second body line uses `caption` (13/18), `textSecondary`, and a 14-point
  right inset. Registration cards show the name alone in semibold `bodySm`,
  then the status in `caption` and `textSecondary`, 2 points below it.
- One small secondary `AppButton` (`compact`, 32 points, 10-point corners) on the page
  color, because the secondary tint disappears on the gray card. The label is
  `labelSm` (13/18 semibold), with 12-point side margins. It sits 10 points below
  the text. The label is the request's action ("Link VerusID", "Use") or "Try again".
  Only notice buttons opt out of the small-window height rule. They stay 32
  points on iPhone SE. `getButtonHitSlop` adds 8 points above and below for a
  48-point touch target. Other action buttons keep the shared 44-point rule.
- A close icon (18 points, `textSubtle`) in a 44-point target removes the card.
  Center it on the first 20-point line. Its target is flush with the right
  edge, so the glyph sits 13 points from it. No "×" letter and no filled circle.
- Cards have an 8-point gap. Each container has 4-point top and 6-point bottom
  padding. After a Home notice, the notification container uses 2-point top
  padding, so the gap stays 8 points.

### Ready card celebration

The owner chose celebration C on 2026-10-22 and removed its border after seeing
it in the app ("looks very AI"). A ready VerusID uses `VerusIdReadyCard.js`; a
failed request keeps the gray card.

- The ready card keeps the card A layout on its own soft blue-to-green tint
  (light `#DEE8FC` to `#E2F1E7`, dark `#21509A` to `#1C4E66`). It is card
  material like the gift card, not a theme token. No border, no traced outline.
  The close icon uses `textSecondary`, because `textSubtle` is too faint on the
  tint.
- It uses the smaller look A sizes: 16-point corners, 12/0/12/14 padding,
  14/20 name and rest, an 18-point close icon in its 44-point target, and the
  32-point button with a 13/18 label. Confetti uses the measured card size.
- The first time the card shows, it celebrates once (2.2 s): the tint blooms,
  the name rises into place, "is ready" fades up, and 12 confetti pieces fall
  behind the text. With Reduce Motion, the tint only fades in.
- The stored notification keeps `celebrated: true`, so a relaunch, a tab switch,
  or a later visit shows the still card.

### Home notice card

`src/containers/Home/HomeWidgets/HomeNotice.js` shows at most one card under
the Home balance, above the notification cards. The owner approved the
connection card on 2026-10-26 (issue 4 of the first E2E night run) and the
welcome card the same day (option D of the empty-Home mockups).

- It uses the smaller look A and its shared styles: `surfaceMuted`, 16-point
  corners, 12-point top and bottom padding, and 14/20 `bodySm` text with the
  first sentence in semibold. The left inset is 14 points. The right inset is
  14 without a close target, or 0 with one. Actions keep the 32-point button,
  including on iPhone SE. Found-assets and sync cards have the 18-point close
  icon in a 44-point target; the others go away by themselves when their state
  ends.
- The first state that applies wins:
  1. Offline: "**No internet connection.** Balances may be out of date." No
     button; Home refreshes by itself when the connection returns.
  2. A balance update failed for an asset on Home (not the private card, not a
     service): "**Could not connect.** Balances may be out of date." with
     "Try again".
  3. The wallet found Verus currencies on its addresses that are not in the
     wallet ("New assets found" in Manage assets), with or without funds on
     Home: "**2 assets found.** Add them to your wallet." ("1 asset found.
     Add it to your wallet.", owner, 2026-10-26: the tab is "Wallet") with
     "Review", which opens Manage assets. Review or the close
     icon marks these currencies as reviewed for this wallet, so the card does
     not come back for them, also when the user adds nothing (owner,
     2026-10-26). They stay under "New assets found". A currency found later
     shows the card again, counting only the new one.
  4. A Private card is syncing: "**Your Private card is syncing.** Balances may
     be incomplete." Show it for a known percent below 99. Unknown (-1) shows
     no card. Read `selectPrivateWalletInfo` and `getPrivateSyncPercent` for
     the signed-in account's active coins that have a private card. With more
     than one syncing coin, use the lowest percent, rounded down.
     There is no button. A row sits 10 points below the text, with a 14-point
     right inset. Its progress bar is 4 points high with 2-point corners:
     `borderStrong` track, `primary` fill. The percent uses tabular `caption`
     (13/18) in `textSecondary`, 10 points after the bar. The bar exposes the
     progressbar role and its 0–100 value. The card has no live announcements
     for percent changes. Close hides it until the wallet opens again. Keep
     this dismissal in memory only.
  5. The wallet is empty: every transparent and VerusID card of every asset,
     hidden ones too, is known to hold 0, pending funds included, and nothing
     was found or pre-converted: "**Your wallet is empty.** Receive coins to
     start." with "Receive", which opens the Receive list. A private card that
     has not synced does not block it.
- On the asset screen the total reads "—" while a transparent or VerusID card
  has no balance. A failed history with nothing saved uses `EmptyState`
  ("Unable to load transactions", "Try again").

## Secure task screen

`SecureLoading.js` covers tasks that must not be interrupted: Lock wallet, Clear
cache, keychain encryption, Delete wallet, and Reset password. The card claim
uses its `SecureLoadingView` while it broadcasts ("Claiming funds"). The owner chose
variation A on 2026-10-22; the claim's own picture is below.

- It follows the request loading screen (`GenericRequestLoading.js`): theme
  background, the `loading_7bars` loader, the task as a short title (24/31
  semibold, "Signing out", "Clearing cache", "Deleting wallet data"), and "Keep
  the app open." in 15/22 `textSecondary`. No header and no swipe back.
- After 15 seconds the line reads "This is taking longer than usual. Keep the
  app open." A failed task shows its error as the title without the loader.

### Claiming funds

The card claim replaces the loader with its own picture
(`ClaimingFundsView.js`, next to `SpendableKeyRequestInfo.js`). The owner chose
animation A on 2026-10-23.

- A 248 x 96 picture in the loader's place, with the same 26-point gap to the
  title: a small gift card on the left (92 x 58, the gift card material,
  `getTicketOutline` with 12-point corners and 6-point notches, an iOS shadow
  only) and the active wallet's icon on the right (`WalletAvatar`, 56 points).
  A wallet without an icon shows the `wallet-outline` glyph on a
  `surfaceMuted` disc.
- Every 1.8 s a coin slides out from under the card and arcs into the icon,
  which lifts a little as it takes it. The coin is the claimed currency's
  `AssetCoinLogo` at 28 points (the chain's own coin when the card holds
  several; the chain's coin when the currency has no logo). The card never
  empties, so nothing looks finished before the broadcast returns.
- When the broadcast returns, the line fades, the card dims to half, and the
  wallet setup check (24 points, a 3-point ring in the page color, a white
  check in light and a page-color check in dark) springs onto the icon. A coin
  in its last 0.5 s of flight lands first; an earlier one fades on its way.
  After 1.1 s the screen fades out and the result fades in. A failure shows
  its error at once, with no success motion.
- Reduce Motion: no coin, no lift and no spring. Three 5-point `primary` dots
  between the card and the icon fade in turn, and the check fades in.
  Reanimated skips an animation when the system asks for less motion, so these
  animations set `ReduceMotion.Never` and the screen decides what moves.
- `SecureLoadingView` takes `illustration`, `contentStyle` and `statusStyle`.
  With an illustration the line keeps room for two lines, so the slow message
  does not move the picture. Other tasks keep the 7-bar loader. No gradient
  borders, glow or traced outlines.

## Wallet setup screen

Creating or importing a wallet shows `WalletSetupOverlay.js`
(`src/components/WalletSetup/`). The owner chose variation E on 2026-10-22,
after two mockup rounds; it combines the wallet icon in a progress ring with
the coins that fly onto Home.

- The wallet icon (96 points) sits in a 128-point ring, over "Setting up
  <name>" ("Restoring <name>" for an import) in 24/31 semibold. Below are one
  48-point slot per starting coin (VRSC, BTC and ETH; VRSCTEST and GETH on
  testnet) and one 15/22 line that names the current step.
- Only real steps move it: a coin shows when its key is made, and the ring
  grows when a step ends (`createProfileFromSeed` reports them through
  `onStep` and waits until the screen has shown each one). The gaps between
  reveals (0.4 s before the first coin, 0.36 s between coins, 0.22 s between
  steps) only make each step visible.
- The end: a green check settles on the icon, the title reads "<name> is
  ready", and after 1.1 s the coins fly onto their rows on Home
  (`WalletSetupLogoSlot.js` lends the row logos as targets) while the rest of
  the screen fades. The slots follow Home's row order, so the coins fly
  straight down. No button and no pop-up.
- The coins leave only when two measurements of Home's rows, 150 ms apart,
  agree. During the flight the screen measures the rows again every 100 ms,
  and a coin bends toward its row if the row moved. The row logo fades in
  under the landed coin (150 ms), then the coin fades out.
- A Face ID or Touch ID sheet during setup does not show the app's privacy
  cover: the setup screen stays behind the sheet. The cover still shows when
  the app goes to the background.
- A failure stays on the screen: "<name> was not created", one line, and
  "Choose another name" or "Try again" with "Back".
- With Reduce Motion the screen only fades. When a saved request opens next,
  or Home has no rows to land on, the coins fade instead of flying.

## Receive and payment request

The owner approved variation A ("Calm address") for Receive and variation C's
paper slip for Request ready on 2026-10-20 (RX-2 in `UI_REDESIGN_PLAN.md`).

- The "Receive assets" list shows its title in the header bar, centered in
  `titleSheet` between the arrow back button and an empty right side, as Send's
  Select asset does (owner, 2026-10-24). There is no large title under the
  header.
- Receive has the arrow back button, a close button on the right, and no title
  or options icon. Close (`HeaderCloseButton`: the Send wizard's 22-point
  `close` icon in a 44-point target) leaves Receive in one tap: it also closes
  the "Receive assets" list when Receive opened from it (owner, 2026-10-26). A
  40-point asset logo sits beside `headlineMd`. Under the name, show only the
  selected card type and its network. With several cards, that line opens
  "Choose an address" and has a 44-point touch target.
- Center the QR and address group in the remaining space; scroll when needed.
  The QR tile stays white in both themes, with 16-point padding, a 20-point
  radius, and a 216-point QR (184 on small screens; on windows of 640 points
  or less, a 160-point QR, 12-point padding and tighter spacing so the address
  field sits above the footer). Keep the existing filled address field, middle
  ellipsis, identifier type, and `CopyAction`. Do not group addresses into
  four-character blocks. VerusID names keep normal type. On Android the address
  text is not selectable, because a selectable Android text view ignores the
  middle ellipsis; `CopyAction` is the copy path.
- Show no supported-chain claim or repeated card/address metadata. The safe
  footer has Share address, then Request amount as a secondary action.
- "Choose an address" titles each card by type ("Transparent", "Private") or by
  its VerusID name, with a transparent card's short address as a monospace
  subtitle, so the chooser matches the context line.
- Request has one input step, then Request ready. Use `ProgressHeader` at 0.5
  and 1, the Send 40/48 amount field (it shrinks to 20 points to keep the
  amount and its unit on one line) and conversion chip, and `FlatRow` for
  Note and Conversions. These rows show only on conversion-eligible cards.
  The two compact form sheets follow `AddressBookEditSheet`; choices apply
  after dismissal. The note stays out of the modern invoice QR. Both steps
  have the Receive close button on the right of the header: Close leaves
  Receive in one tap, and Done on Request ready still returns to the address
  (owner, 2026-10-26).
- Owner-approved 2026-11-13, Conversions option A: when conversions are on,
  always show Max slippage with equal 0.5%, 1%, 2%, Custom segments. Default
  is 0.5%. Segments are at least 44 points high; selected uses `primaryBackground`
  with a full `link` outline and an accessible selected state. Custom reveals
  one `AppTextInput` with a percent suffix and inline validation. Below it,
  `caption` explains: "You accept up to this much less than the market price
  when a payment converts." The Request row reads "Allowed, max <value>%" or
  "Not allowed". Ignore the old Settings gate. Keep invoice encoding unchanged.
- Request ready uses `PaymentRequestSlip` at the full content width. The fixed
  `#F6F3EC` paper, light text colors, notched SVG outline (`ticketOutline`,
  shared with the gift card), dotted perforation,
  and `StatusBadge variant="paper"` are an approved material exception to flat
  pages. Use the VerusPay wordmark and conversion badge for modern invoices;
  other cards show the asset name and logo. The amount sizes itself to the slip
  width and the unit shrinks with it, so the number is never smaller than its
  ticker. On compact windows the note shows up to two lines with a tail
  ellipsis; the shared message keeps the full note. The result step shows no
  bottom scroll fade: the cut card edge
  already shows that more is below, and a page-colored fade smears the paper
  in dark mode. The QR
  is 200 points (160 on compact windows), with a 14-point quiet zone. Under it,
  show the address in one monospace line with middle ellipsis, or the human
  VerusID name in normal type. Use an iOS shadow; no Android rectangle elevation.
- The result footer has Share for modern invoices, or Save QR to camera roll
  for other cards, then secondary Done. Back returns to the input with values
  kept. The result scrolls. Generation, share, save, and interruption behavior
  retain the existing operation guards and invoice contracts.

## Scanned payments and VerusPay invoices

The owner approved this on 2026-10-21 (mockup rounds on the Scan tab and
invoices). Every payment ends on the same Send Confirm, with Slide to send or
Slide to convert,
and the same Sent screen. Each path skips the steps that the QR code already
answers. The Scan tab (`src/containers/VerusPay/VerusPay.js`) opens Send with a
`scan` request; the recipient is fixed, so Recipient is skipped.

- A request with an amount opens Confirm when one card can pay. Back opens
  Amount with the amount filled in. A request note shows as a Note row.
- A request without an amount opens Amount. An address alone opens Select asset
  with only the assets whose network takes that kind of address. An R-address
  or i-address fits Verus assets only.
- The context band shows "to <short address>" on Amount and "To <address>" on
  Select asset, because Recipient is skipped.
- A request that names another network warns above the slide. An asset
  that is not in the wallet opens `AcknowledgeSheet` ("Add <name>?", "Not now");
  the payment then continues. A request for the other network type (mainnet or
  testnet) is never added. Codes the wallet cannot pay show "Can’t use this QR
  code" with "Scan again". There are no system alerts on this path.

A VerusPay invoice opens `InvoicePayFlow`
(`src/containers/DeepLink/InvoiceInfo/`): Pay with, Confirm and Sent, inside the
invoice screen so a generic request continues after the payment.

Every request link opens on the request loading screen
(`GenericRequestLoading.js`), with Cancel. An invoice link reads "Opening
invoice" with the steps Read invoice, Select network, Verify signer (signed
invoices only) and Prepare payment. Identity update links read "Opening
request" with the GenericRequest steps. v1 login links show the screen without
steps and keep their own screens and alerts (owner decision, 2026-10-21).

- Pay with shows the payer's side of the payment slip (`InvoiceSlip`): the
  VerusPay mark, the amount, and a stub. The owner chose the slip (option 2 of
  the Von Restorff variations) so that the request is the one thing that stands
  out. This extends the slip's material exception to the payer's side.
- Pay with starts with `RequestCard`: requester, then "wants you to pay",
  with no responder row. A signed invoice's slip has no requester stub or
  perforation: the card names the requester once (owner, 2026-10-28).
  An unsigned invoice keeps the paper "Unsigned" badge and its "To" stub
  with the full address in monospace. Keep the Send wizard's 16-point grid
  and 44-point Back and Close targets.
- Under the slip, every way to pay with its cost: "Pay directly", then "Pay with
  conversion", one row per currency (owner, 2026-10-22). The wallet picks the
  cheapest basket; rows do not say "via". A conversion row shows Send's price
  impact chip (`ImpactChip`) with the same doorway rule and tones as on Amount.
  It reads the percent only (owner, 2026-11-13). The chip opens `PriceRouteSheet`
  in pay mode: every basket with
  its cost, cheapest first (only the best gets "Best price"), then Market price, Your
  price and Price impact; a choice changes the row. A basket that is the requested
  or the paying currency itself counts as "Direct". There is no "Use … instead"
  suggestion. A currency on several cards shows no source count and opens
  "Choose an address" (owner, 2026-11-12). The step is skipped when the invoice
  allows no conversion and one card can pay.
- Confirm adds "Request from" (signed invoices only), "From" (only after a card
  choice), "Expires" and "Invoice details". Its Price impact badge reads the percent only, and
  the money is what the user pays on top of the market price. It always pays through the
  currency-transfer path. Tagged invoices are not supported yet, so the payment
  carries no invoice tag. It refuses a payment that the fee would shrink.
- When this device already paid the invoice, Confirm shows one notice above
  the slide ("You paid this invoice on <date>. Paying again sends a second
  payment.") and an "Earlier payment" row with the short transaction ID. After a
  "Status unknown" payment it reads "This invoice may have been paid on <date>.
  Check your transaction history before you pay again." Paying again stays
  possible (owner, 2026-10-26). The record lives on this device only.
- Sent reads "Payment sent". A request's POST response starts when broadcast
  succeeds; a redirect waits for Done. A paid sign-in shows its delivered
  sign-in fact once on Sent, with no second result sheet. A response failure
  shows one warning on Sent and does not repeat the payment or offer a retry.
  Done closes the invoice or continues its request.
- Errors: "No way to pay this invoice" on Pay with; conversion options that do
  not load show an error with "Try again" while direct payment still works; the
  shortfall shows above a disabled slide; expired, unreadable and wrong-network
  invoices end on a sheet with "Close". Burn invoices keep their old screens.

## Camera scanner

The owner chose variation B ("Camera window") on 2026-10-22, with the torch
button. Every QR scanner uses it: the Scan tab, Send's Recipient step, key and
seed import, VerusID recovery, and the claim password.

- The page stays. The camera is a rounded window (24-point radius, the sheet
  radius) inside the page, with the page inset on both sides (16 points in
  Send, 20 elsewhere). The window is a deliberate exception to flat pages.
- A flow keeps its own header: Send shows "Scan address" in
  `SendWizardHeader` with its progress and context band; other flows use
  `ScannerScreen` (`ProgressHeader` with Back and a short title). Back, and
  Android back, return to the step that opened the camera. There is no Cancel
  button. The Scan tab shows the `headlineMd` "Scan" title with the Services
  title spacing.
- Inside the window: a dimmed camera around a rounded 232-point frame with four
  corner marks. The torch button (44 points, bottom right) shows only on a
  device with a flash. After a read, the corner marks turn green and "Reading
  code…" shows at the bottom of the window. There is no spinner page.
- Problem states show inside the same window in `surfaceMuted`, as the NFC tap
  screen does: one symbol, a `titleSheet` title and one `bodySm` line. "Camera
  access is off" offers "Allow camera" while the system can still ask, and
  "Open Settings" after that. "No camera found" can add one hint and one
  secondary action, such as "Enter address". The system prompt shows over the
  dark window; no in-app permission page shows first.
- Actions sit under the window in `SafeBottomActionStack`, for example "Claim
  from NFC card" on the Scan tab.
- The camera runs only while its screen is focused and the app is active.

## Scroll affordances

When a vertically scrollable surface does not make its overflow apparent from
partially visible content, show the established non-interactive bottom fade with
a centered downward chevron. Derive its visibility from measured content and
viewport size: show it only while more content remains below, and hide it when
the surface is not scrollable or reaches the end.

The shared `SheetScrollCue` puts its chevron on an opaque, full-width bottom
strip, below the fade, so readable text cannot show behind the chevron. Asset
review pages use the same cue as information sheets.

Use the scroll cue already provided by `SettingsScreen` for settings-style
pages and `DeepLinkRequestSheetScaffold` for informational request sheets. Keep
the cue above the scroll content and below any fixed action footer, pass touches
through it, and hide it from accessibility. Do not leave the cue permanently
visible or use it as a button.

## Request-review hierarchy

1. Who is requesting or signing.
2. What the request asks the wallet to do.
3. Which wallet or VerusID will respond.
4. Technical details behind a clear details affordance.
5. One primary action for the next required step.

The request card carries points 1 to 3. The requester sheet carries point 4.

Owner approval, 2026-10-28: every GenericRequest review uses the bordered
request card (Z3). The approved references are the round-5 request mockups.
It replaces the screen title, source card, "View request details" link, and
selected identity row in the footer. This is a limited exception to flat pages.

- `src/containers/DeepLink/components/RequestReview/RequestCard.js` and
  `src/styles/components/requestCard.styles.js` draw one 18-point-radius card
  with a 1-point `borderStrong` border and clipped row edges. The content inset
  is 24 points. The card starts 48 points below the top safe inset.
  On headerless reviews, this 48-point band stays outside the scroll viewport
  so content cannot scroll under the other-wallet text action.
- Requester: `surfaceMuted`, 56-point minimum, 16/12/16/16 padding, 8-point
  gap. The name uses `titleSheet` (20/26 semibold), two tones split at the
  first dot. Names wrap after dots and never truncate. Only a request signature
  verified by the wallet gets the 18-point primary disc and white check.
  The 22-point chevron uses `textSecondary`. One tap opens the requester sheet.
  An unsigned request reads "Unsigned request", with no check, chevron or tap.
- Action: `surface`, 16-point padding, top border, `headlineCompact` (26/32).
- Your row: `successBackground`, top border, 56-point minimum, 12/12/12/16
  padding. Its joining word uses `bodyMd` and `textSecondary`. Its full name
  uses `titleSheet` in two tones. Only a selectable identity gets a 22-point
  chevron-down (`successText`) and opens the existing `IdentityPickerSheet`.
  An empty choice reads "No VerusID chosen" in regular `textSecondary`.
  Omit the row when nothing of yours answers. Do not put it in the footer.
- On windows of 667 points or less, `useOnboardingSmallDeviceLayout`,
  `useButtonHeight` and `getButtonHitSlop` keep rows at 44 points minimum and
  touch targets at 48 points. Keep `headlineCompact` for the action.
- One caption, when relevant, sits 12 points below the card in `bodySm` and
  `textSecondary`. It names what is sent and the actual response host. Content
  starts 24 points below the header group. Per-item consent follows the rule below.
- `src/containers/DeepLink/components/RequestReview/DeepLinkRequesterSheet.js`
  merges VerusID details and request details. Reuse
  `DeepLinkRequestSheetScaffold`, section rows, `CopyAction`, the scroll cue,
  and Done. Its title is the complete two-tone requester name, with a success
  `StatusBadge` "Verified" only for a verified request. Include each fact once:
  VerusID address, authorities/content, network, signature time, response URIs,
  delivery, expiry, request ID, and screen-specific information when present.
- `GenericRequestHome` shows "Open in another wallet" only when the other app
  is installed. Use `TextAction size="small"` in `link`, with no icon,
  underline or background and a 44-point touch target. On headerless reviews,
  align it to the card's right edge, centered in the fixed 48-point band.
  Invoice headers keep Back, centered title and Close, without an accessory or
  spacer. Only Pay with adds the text above the card in a conditional row of
  at most 32 points; its target extends into the top padding. Later wizard
  steps show no action. Keep the existing handoff flow.

Request Back closes an open sheet, returns a later step to its previous step,
and uses Cancel on the first step. Preparing or sending a response blocks
Back. Results use their Done or Close action. `DeepLink` owns one idempotent
exit guard, so dismissal or reset cannot leave a stale request.

Identity Update remains the canonical exception for a risky, multi-stage
GenericRequest. Preserve review, content, high-risk and confirm/pay stages.
The first step uses the full card with the fixed target VerusID. Later steps
use `src/containers/DeepLink/components/RequestReview/RequestCardCompact.js`
(Z3c): a 48-point requester row with `titleRow` (16/22), then "wants to update"
in 14/20 semibold and the fixed VerusID in a `successBackground` chip with an
8-point radius, 1-point border and 16/22 name. The second row wraps. It has no
picker chevron. The payment source stays in the confirm footer.

`RequestTitle` remains for results and other forms that still need a title.
Claim-password entry uses the full request card without a responder row.
Saved requests, legacy LoginRequest screens and completion sheets keep their
own patterns.

Sign data and Share credentials use `DataApprovalList` through
`DataRequestReview` (owner chose option B, 2026-10-28). Preserve source order.
Only the first unapproved item is open, with its full content under its title.
The footer names that item with "Approve <title>". Approved items fold to one
row with a `successText` check and a 44-point Undo action. Undo reopens the
first unapproved item. Waiting items show their number and title. The markers
show progress once; there are no checkboxes or counter line.
When the open item changes, the list scrolls it into view.

Unreadable items are titled "Unreadable data" and show the warning `StatusBadge`
"Check first" while waiting or open. Their footer says "Check unreadable data".
It opens `AcknowledgeSheet` with the exact bytes first in monospace, the
requester's descriptor label only when both names are known, and "Approve only
if you know what they are for." Only "Approve unreadable data" in that sheet
approves the item; "Not now" keeps it unapproved. Long bytes use
`SheetScrollView`; the sheet actions stay visible.

Keep `useDataReviewConsent` keys and context resets. After a context change
clears approvals, show "Approvals cleared. You chose another VerusID." above
the list until the next approval. Show no reset notice when nothing was
approved. Only after every item is approved does the footer show the final
Sign data or Share action. Keep the handler's `reviewComplete` gate as well.
While processing, block Undo, item details, and approval actions. The list
scrolls in `DeepLinkReviewScrollView` above the normal-flow safe footer.

A completion sheet shows the animated green check only when delivery or broadcast
is confirmed. For "No response was sent" and "Browser opened", use
`src/components/NeutralCheckMark.js`.

The card claim result follows the Send flow's Sent step and says each fact once
(owner approved the copy on 2026-10-23):

- `TransactionResult` draws it (2026-10-23): "Claim submitted" with the Sent
  step's animated check, and no subtitle, section label or count line. The
  title and the footer take the Sent step's measures (28/36 title; footer 24
  points from the bottom on small windows, 40 on normal ones), not the
  request screen's `RequestTitle` and 30-point footer.
- One transaction: the claimed amount in the review's amount style, a
  "Transaction ID" row with `CopyAction`, "View in explorer" as a sheet action
  row, and one caption: "The funds show in your wallet after the transaction
  confirms." A VerusID claim shows the VerusID note as the caption instead.
- Several transactions: one block each, with the chain name only when there
  are two or more chains, what it claims ("alice@ and funds"), the
  Transaction ID and the explorer.
- A partial failure reads "Claim not finished" with the real counts ("1 of 2
  transactions was submitted. The other is saved. Retry to submit it."), the
  submitted blocks, then Retry and Close. No red card; the raw error is logged.
- An error screen shows its title once. "Retry when your connection is
  available." shows only for a network error.

Do not expose raw RPC, daemon, or indexer errors. Translate them into short
recovery guidance and keep a safe fallback available.

## Verification and evolution

Every new or intentionally redesigned surface needs rendered evidence, not only
source inspection:

- Compare it with the named exemplar at the same viewport and state.
- Check light and dark mode.
- Check normal and compact/small-device layouts when the flow can reach both.
- Check relevant default, selected, loading, empty, error, keyboard, processing,
  and result states.
- Read every visible string in each state. Name the fact each one states.
  Remove repeats.
- Run `corepack pnpm check:design` and any targeted safe-area or parser checks.

When the same correction repeats in design review, encode the accepted fix in
the narrowest durable layer:

- Visual judgment or scope belongs in this file.
- Repeated spacing, typography, state, or interaction mechanics belong in a
  shared component, style module, or semantic token.
- A mechanical failure that can be detected reliably belongs in a check.

The repeated "submitted" on the claim result (2026-10-23) shows both layers. The
shared layer is `TransactionResult`, which offers no section label or count
line. The check is in `corepack pnpm check:design`: it fails when a section
label ("Submitted transactions") or a count line ("1 transaction submitted.")
repeats a status word of a title in the same source file.

Do not add a rule from one accidental output. Keep the correction only after it
is approved as reusable, then compare the next first attempt against the same
exemplar and states.
