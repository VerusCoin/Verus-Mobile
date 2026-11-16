# Wallet UI redesign and consistency plan

This is the maintained checklist for completing the remaining GenericRequest,
Send, Convert, Receive, and VerusID design work. Use it to resume a scoped task
without repeating the entire investigation.

## Current position

- Scoped follow-up: **GR-4.IDU-PARITY-P2** on
  `claude/idu-parity-fixes-1112` from `b7f7e630`: **Ready for verification**.
  Six source-confirmed P2 gaps now show upstream information in the existing
  review components. Static checks pass. Device proof stays open. See the
  scoped checklist and evidence below.

- Scoped follow-up: **ID-3.NIGHT3-B** on `claude/night3-batch-b` from
  `ff2e63e0`: **Done** (device QA passed 2026-11-05, merged into `redesign`).
  Modify review names the VerusID, explains the resulting signing policy and
  marks added/removed values once. Registration checks known source balances
  against the full two-payment quote. Keyboard-open forms pin the price and clip
  scroll content above the footer. The upstream consent rule and transaction
  engines stay unchanged. See the scoped checklist and evidence below.

- Scoped follow-up: **TX-1.HIDDEN-BALANCES** on
  `claude/hidden-balances-tx-persist` from `bd00f503`: **Ready for verification**.
  History and transaction-sheet amounts blur with hidden balances. The phone
  remembers the choice. Static and controlled component/storage checks pass.
  Opus owns review and device QA. See the scoped checklist below.

- Scoped follow-up: **HOME.NOTICE-A** on `claude/home-notice-a` from
  `bc6602db`. Owner chose smaller look A on 2026-11-04. Home and VerusID
  notices use the smaller sizes. Private sync has one session-only notice.
  Static checks, the iOS bundle and native component fixtures pass. Full-wallet,
  Android and screen-reader QA remain open. See the scoped checklist below.

- Scoped follow-up: **ID-3.K2** on `claude/idreg-k2` from `e8f39d04`.
  Name-check errors and their retry action now use the field status row.
  Static and controlled component checks pass. Device QA stays with the orchestrator.

- Scoped follow-up: **ID-3.POLISH-2** on `claude/idreg-polish-fixes` from
  `ccbb4ed4`. Eight owner-approved changes are implemented. Native/device QA
  and the Android PC build remain with the orchestrator.

- Scoped implementation: **ID-3.MANAGEMENT-UI**, phase 2b on
  `claude/idreg-ui-mgmt` from `63289e4b`. Transfer, Modify option B, results,
  Link option A, and sign-out card clearing. Registration belongs to phase 2a.
  No Metro, simulator or device work is authorized in this task.


- Scoped integration: **ID-3.UPSTREAM-SYNC**, phase 1 on `claude/idreg-sync`
  from local `redesign` `6b05ad97`. The owner authorized all upstream
  `identity-registration` features on 2026-11-04. This supersedes the earlier
  registration exclusion for this task. Preserve current redesign UI. Use
  upstream registration, management, and Link screens until phase 2.
  Native and device checks belong to later phases. See the phase-1 evidence below.

- Scoped meeting fixes: **RG-1.8** and wallet logo fallback on
  `claude/meeting-ui-fixes` from `052d0b5c`: **Ready for verification**.
  Static, behavior and bundle checks pass. Existing gift card tests retain two
  baseline mock failures. Next: owner device QA of the affected states.

- Scoped request work: **GR-4.IDENTITY-UPLOAD**, ready for device verification.
  `claude/identity-data-upload` starts at `052d0b5c`. Upload modules come from
  upstream `identity-registration` `0a99f88a`; registration is outside scope.
  Source implementation is `251ed289`. No simulator or emulator was started.
  Next: run the disposable VRSCTEST device matrix below.

- Scoped asset-screen work: **TX-1.ASSET-STACK** on
  `claude/asset-stack-sheet` from `ae8758e4`. The owner approved Final E-r4
  variant 5 with Jewel saved slots on 2026-11-03. Implementation replaces the
  native title/carousel with one top row, capped stack and persistent history
  sheet. Device QA belongs to the owner's testers; this task must not start
  or drive devices. See the scoped checklist below.

- Scoped follow-up: **TX-1.ASSET-STACK-ORDER** (pins, last used, picker
  keyboard and opening scroll) on `claude/asset-stack-order`: **iOS device QA
  passed** on iPhone 17 Pro and iPhone SE, light and dark (2026-11-03).
  Android remains open. See the scoped checklist below.

- Created: 2026-09-10.
- Last updated: 2026-11-12 (GR-4.IDU-PARITY-P2 built, reviewed, iOS + Android device QA; awaiting owner review, not merged).
- Scoped content-card correction: **GR-4.NO-LEFT-BAR** on
  `claude/no-left-bar` from `700fb18d`. Value blocks have no left bar or
  indent. Existing vertical spacing, tone panels, badges, labels and removed
  value strikes stay unchanged. The unused encryption warning style is removed.
  The design guard allows only the existing neutral transfer connector and
  transparent review triangle. Static and synthetic checks pass; one existing
  Jest suite has the same SVG mock load failure on the clean base. Owner device
  QA stays open. See the evidence row and scoped checklist below.
- Input integration, 2026-10-30: the owner requested a local commit and
  `--no-ff` merge of `codex/compact-neutral-inputs` into `redesign`. The
  commit scope includes the source and maintained design docs. Native QA
  fixtures, screenshots and local notes stay local. No push was requested.
- Scoped input work: **TX-1.INPUTS** on `codex/compact-neutral-inputs` from
  `redesign` `5fe184a7`. Owner approved revision 2 of the input study on
  2026-10-30. Shared 48-point neutral fields, one focus border, growing memo,
  Paste/Clear and existing QR routes, idle start/last-six presentation,
  complete editable values and full recipients on Confirm. Native QA below
  records the actual evidence; the design study does not close runtime checks.
- Scoped request review implementation: **GR-4 phases 1 and 2** on
  `claude/gr-item-approval` from phase 1 (`e11d4882`). A1 restores case-specific
  high-risk captions and notes. A2 restores the invoice other-app action.
  A3 restores the five-point review order. Sign data and Share credentials
  now use option B: one open item, a named approval button, approved rows
  with Undo, and unreadable-data confirmation. Consent keys, resets and
  handler gates remain. Static/component evidence is recorded below.
  Phase 3 fixes F1–F6 on `claude/gr4-qa-fixes` from `5bbdb4fb`.
  GR-4.5 is built. GR-4.6 device QA ran on iPhone 17 Pro, iPhone SE and
  Android 360x640 (2026-10-28/29); the reset reveal fix is `3e737b01`.
  Approved follow-ups on `claude/gr4-followups` fix request Back/exit cleanup,
  inherited app appearance, the other-wallet text action and four contrast
  places; Opus `f49eefc2` limits the Back guard to user Back. Device-checked
  on Android 360x640 and iPhone SE. Android normal size remains open.
- Scoped batch 5: **TX-1.BATCH5** on `claude/batch5-int` (L1, L2, R1, F1, F2,
  S7, S8 by GPT-6.1 Sol, merged by the orchestrator). Compact-screen layout:
  Create/import password, Enter password sheet, Add custom asset, Send
  recipient and amount keep the focused field and primary action above the
  keyboard; gift QR warning, Request ready ticket, submitted-result
  transaction ID, coin-page cards (144 pt compact), one-line card names and
  the Confirm failure notice fit on 360x640 and the iPhone SE. Requests:
  44-point identity rows on compact screens, "<n> of <m> checked" on Sign
  data, no identity-update gap, shared scroll cue never over text, paid
  sign-in response sent at broadcast with one "Payment sent" result, "Request
  not valid" for malformed requests. Funds: a send can spend the wallet's own
  unconfirmed change (never others' unconfirmed payments). Unlock: bounded
  private-card start and blocklist fetch. Device QA passed on iPhone SE and
  Android 360x640 (run 2026-10-27-batch5).
- Scoped batch 4: **TX-1.BATCH4** on `claude/batch4-int` (S1–S6 by GPT-6.1
  Sol, merged by the orchestrator). Small fixes (gift keyboard, one-line
  result txid, Android switch colours, one wrong-password text, backup warning
  once, one "New key", claim headline includes the fee, no shielded step in
  authority import, coin page opens the funded card, "N/A" for unknown prices
  in every asset list, identity-update fee placeholder and stale a11y label);
  recipient check while typing, Confirm "From" row and resolved i-address,
  hold hint; sign-in result sheet and "receives" review lines; login remembers
  the last network and shows a "Private testnet" pill. Device QA passed on
  iPhone 17 Pro, iPhone SE and Android 360x640 (night run 2026-10-27-night2).
- Scoped batch 3: **TX-1.BATCH3** on `claude/batch3-fixes` from `389618d6`.
  Identity update removes its payment-source subtitle in both states. Display
  currency scrolls to the selected row without focusing search. Revoke/recover
  clears the imported secret when Back returns to Import wallet or that route
  is removed. Difference reads "None" at or better than market in Send and
  invoice mode; stand-alone Amount and Pay with chips read "Details" for
  unknown or non-positive impact. Positive-impact rules stay in place. Static
  and temporary component checks pass. Orchestrator review and device QA stay open.
- Scoped night-run batch 2: **TX-1.BATCH2** on `claude/batch2-fixes` from
  `839e94c8`. Asset cards drop the pending amount line but keep total balances
  and private sync status. Display currency uses the shared selection sheet
  and saved-address keyboard rules. Small price losses keep significant digits.
  Revoke/recover lists only the selected network type. Self-send Sent uses one
  caption, and identity update hides its source instruction after selection.
  DESIGN.md records the pending-balance owner decision and current invoice-tag
  support. Static and component-fixture checks pass; orchestrator device QA is
  open. Idle discovery has no missing trigger: balance expiry is 60 s, while
  the automatic interval is 300 s with jitter. Polling stays unchanged.
- Scoped fixes from the first E2E night run (issues 1–4 of its report):
  **TX-1.OFFLINE-HISTORY** on `claude/offline-and-history-fixes` from
  `e3d7b53b`. VRPC requests end after 30 s. Confirm says at once that nothing
  was sent when the phone is offline, shows "Status unknown" when a broadcast
  request fails after it started, and blocks every way out while it
  broadcasts. VRPC history shows the recipient amount, a Network fee row and
  no own change address; a token send is a "Network fee" row on the native
  page. Home shows a connection card (card A look; owner approved 2026-10-26), and
  the coin page shows a dash total and a failed-history `EmptyState`. Two
  device rounds passed on the iPhone 17 Pro simulator and the Pixel 8; small
  devices are open.
- Scoped unlock fix: **SH-1.UNLOCK-FACEID** on `claude/faceid-unlock-loader`
  from `cd4c9890`. The owner saw the password form flash before Face ID on the
  phone (2026-10-25). A Face ID or Touch ID wallet now opens on "Unlocking
  your wallet" and keeps it through the prompt; the form shows only after a
  failed, cancelled or unavailable prompt. "Use Face ID" also shows the loader,
  and the row shows the phone's biometry icon. iOS simulator QA passed in light
  and dark; the real Face ID prompt (phone) and Android are open. Follow-up the
  same day: a cancelled "Use Face ID" reads "Face ID was cancelled."
  (**SH-1.UNLOCK-CANCEL-COPY**).
- Scoped imagery: **IMG-1** on `claude/imagery-glyphs` from `2709273e`. The
  owner chose option A on 2026-10-24: every still picture is a Lucide line
  glyph. Empty and failed lists use the new `EmptyState`; icon-led steps use
  `StepGlyph`. The grey 3D empty-state renders are removed. iOS QA on the
  normal and SE simulators passed in light and dark; Android is open.
  Follow-up 2026-10-25: shorter Z recovery secret button labels
  (**IMG-1.ZSECRET-LABELS**).
- Scoped asset row sizes: **TX-1.ASSET-ROW-SIZES** on
  `claude/picker-row-sizes` from `cc7c96a7`. The lists after Receive, Send and
  Convert, and Convert to, take the wallet row sizes (owner, 2026-10-24). iOS
  QA on the normal and SE simulators passed in light and dark; Android is open.
  Follow-ups the same day: smaller Convert to group titles, search only from 7
  items (**TX-1.SEARCH-MIN-ITEMS**) and the Receive assets title in the header
  (**RX-2.LIST-TITLE**).
- Scoped bridged line: **TX-1.BRIDGED-LINE** on `claude/bridged-line` from
  `d04ab115`. The owner chose variation C of the "mapped to" mockup on
  2026-10-23: one "Bridged from Ethereum ›" line on the asset screen and an
  information sheet. iOS QA on the normal and SE simulators passed in light
  and dark on the public testnet; Android is open.
- Scoped VerusID page: **ID-2** on `claude/verusid-page` from `63a8c0b2`. The
  owner chose "D revised" on 2026-10-22: the light card without a mark,
  Control, Content and Details above Funds, and a fund row that opens its
  asset screen with the VerusID card. The tab icon stays the @ mark. iOS QA on
  the normal and SE simulators passed in light and dark; Android is open.
- Scoped Receive restyle: **RX-2** on `claude/receive-restyle` from `e8992c94`.
  Owner approved Calm address (A) and the payment-request paper slip (C) on
  2026-10-20. Round-2 Android corrections pass on `Pixel_8_API_35`: native
  modal keyboard resizing, long-address truncation, and card type labels.
  Device QA on iOS 17 Pro, iPhone SE, Android Pixel 8 and 360x640 passed after
  fixes (see the RX-2 log rows); RX-2.6 QR decoding stays open.
- Scoped wizard title change: `claude/wizard-header-title` from `78ebe3c7`.
  The owner approved short header titles on 2026-10-17. Send/Convert removes
  large content titles and repeated subtitles, retains Amount context and
  fallback messages, and uses a 24-point top inset on normal/compact devices.
  The orchestrator owns rendered and keyboard-error QA.
- Scoped funding follow-up: A-33 on `claude/fix-pending-token-spends` from
  `70bb06c8`. Funding reads every input of each distinct spending mempool
  transaction with a fresh request. Token-only deltas can omit previous
  outpoints. Source, private Testnet RPC, and Node fixture checks pass.
  Orchestrator device QA stays open; no UI or preflight copy changes.
- Scoped keyboard-error fix: **A-34** on
  `claude/fix-wizard-error-keyboard` from `70bb06c8`. Amount and Recipient
  place the shared error directly after the field. Measured scrolling reveals
  it after error, content, or keyboard/viewport changes. Local checks pass;
  the orchestrator owns new Android/iOS light/dark normal/compact device QA.
- Scoped wizard polish: A-26, I-28, A-31, A-30, I-29, and A-8 on
  `claude/fix-wizard-polish` from `5cbbac30`. Rejection copy, self-send balance,
  review spacing, form error flow, save-chip visibility, and focused-header
  progress have source/fixture checks. Orchestrator device QA stays open.
- Scoped history tap/detail follow-up: I-21, A-29/I-30, and A-28 on
  `claude/fix-history-tap-detail` from `5cbbac30`. The native View around
  `SignedInEdgeFade` blocks SVG hit testing before it can cover the first row.
  Conversion Type case and dark header/action colors are corrected. Source
  checks pass; the orchestrator owns new iOS/Android rendered and touch QA.
- Scoped Confirm/Success follow-up: A-5/A-6/A-7, I-7/I-8/I-12, and
  I-16 rejection copy on `claude/fix-wizard-review-success` from `a1e758fd`.
  Implementation and source fixture checks are complete. The orchestrator owns
  Android/iOS light/dark and normal/compact device QA. TX-1.8/TX-1.9 stay open.
- Scoped Amount/Recipient fixes: A-23/I-9, A-9/I-11, A-10/I-10,
  A-12/I-14, and I-13 on `claude/fix-wizard-amount-recipient` from
  `a1e758fd` are ready for orchestrator device QA. Shared keyboard layout,
  amount precision, Continue-time identity lookup, network subtitle, and saved
  address filtering have source/fixture evidence. No Metro or device work ran.
- Scoped balance follow-up: I-16/A-11 on
  `claude/fix-balance-after-broadcast` from `a1e758fd` is ready for device QA.
  VRPC totals include mempool deltas. Successful sends expire address-response
  caches and refresh the source channel. Open wizards follow the ledger.
  The historical duplicate-input cause remains a node-side inference.
- Scoped history follow-up: A-16/I-20 on `claude/fix-history-conversions`
  from `a1e758fd`. VRPC grouping, pending time, conversion labels, and recipient
  metadata have source/RPC fixture checks. I-21 stays open: the C6 press callback
  and detail data work in the source fixture, but no native touch check ran.
- Scoped correctness follow-up: **I-16** on `claude/fix-mempool-spent-utxos`
  from `a1e758fd`. Funding excludes mempool-spent confirmed UTXOs with a fresh
  request and stops when the pending check fails. Local checks pass; the
  orchestrator owns consecutive-send device QA. TX-1 runtime boxes stay open.
- Scoped correctness follow-up: A-15/A-20 conversion estimates on
  `claude/fix-conversion-estimates` from `f22b7ab9` are ready for device QA.
  Numeric RPC serialization and daemon-only Amount estimates have local fixture
  and read-only private Testnet RPC evidence. TX-1 runtime boxes stay open.
- Scoped TX-1 follow-up: A-21/A-22 on `claude/fix-eth-export-recipient`.
  Ethereum export detection and the received-asset label are fixed. Source,
  option-matrix, and private-chain unsigned-build checks pass. Native QA stays
  with the parent task; this work does not close TX-1.8 or TX-1.9.
- Status: SH-1, RX-1, and ID-1 complete for their scoped local deliveries. The
  scoped ID-1 delivery is committed as `33865cab` and locally integrated into
  `codex/integrate-generic-request-upstream`; its rendered/native QA and the
  single independent high-risk review are done. GR-1 and GR-2 are complete:
  the GR-3 runtime matrix closed GR-1.9, GR-1.10, and GR-2.6 on 2026-10-10.
  Global QA-1 stays open across workstreams.
- Source-analysis baseline: `fecfbce4e5eba42e238a9960f30e7cd049ed08ba` on
  `codex/integrate-generic-request-upstream`.
- Evidence: source and fixture behavior checks, the data-lab Mobile contract suite,
  isolated iOS/Android native previews, and Android build/entry checks.
  Authenticated wallet delivery is now verified on iOS and in an Android smoke
  pass; see the GR-3 log entries.
- Current scoped fix (user, 2026-10-17): **A-19**, prevent Back from a successful
  Send/Convert from exposing a live submit action. Implementation and source
  checks are complete on `claude/fix-send-success-back`; orchestrator device QA
  is next. The remaining TX-1 redesign work stays open.
- Earlier focus (user, 2026-10-15): **SV-1**, the Services tiles and the
  fixed gift card screen. `claude/sv1-prep` added the DESIGN.md patterns, the
  `AcknowledgeSheet` `dismissLabel`, and the SV-1 brief. Track A (Services) and
  Track B (gift card) ran in two parallel sessions and are both merged into
  `redesign`. The Android run and a daemon claim followed. SV-1.15 and
  SV-1.16 are fixed; SV-1.17 is decided (no code change). See the SV-1 log
  rows.
- Earlier focus: **GR-3** on `codex/gr3-request-matrix`. Phase 2 is done: the
  user agreed the bug list and Phase 3 scope, and the agreed functional fixes
  (GR3-B6, B3, B2, R1) are verified on the iOS simulator. GR3-B4
  waits by user choice. Compact screenshots are deferred, and the
  physical-iPhone run remains. Phase 3 is implemented (GR-3.12 to GR-3.15,
  GR-3.18, GR-3.19). Phase 4: GR-3.16 ran (iOS rerun and Android smoke) and
  waits only on wallet backup (GR-3.9); GR-3.17 closed the GR-1/GR-2 runtime
  follow-up. GR3-B8 is recorded for later.
- Next focus (user, 2026-10-11): **NFC-1** on `codex/nfc-1-claim-from-card`.
  NFC-1.1–1.7 and the NFC tap screen (NFC-1.9–1.11) are done on the simulator,
  in one commit with NFC-1 (user). Next, one physical-iPhone session runs
  GR-3.9 and NFC-1.8 together.
- Previous focus: **ID-1 complete and locally integrated**, committed as
  `33865cab` on `codex/id1-redesign` and integrated into
  `codex/integrate-generic-request-upstream`. RX-1 remains complete with the
  user-requested system amount keypad, 196 native gallery captures, 32 passing
  focused behavior checks, and ready high-risk and design reviews. The next
  scoped implementation is the remaining TX-1 work when authorized. Broader
  authenticated/runtime and accessibility follow-up remains explicitly tracked
  under QA-1.
- Authority: creating this plan authorized documentation only. Later user
  instructions determine which work to execute. Unchecked boxes do not authorize
  starting the entire backlog. Existing authorization carries across sessions.

## Overview

| Workstream | Outcome | Status | Dependency |
| --- | --- | --- | --- |
| GR-1 | Credential and data-signing reviews use current request patterns | Ready for verification | Existing request-review primitives |
| GR-2 | Remaining request flows report delivery status accurately | Ready for verification | Coordinate with GR-1; can be implemented separately |
| GR-3 | Every GenericRequest type has runtime evidence; remaining request surfaces use the current design | In progress | GR-1, GR-2; deeplink-sim and provisioning webhook |
| GR-4 | Request card and item approval | Built and device-checked; follow-ups merged; Android normal size open | Owner-approved round-5 mockups; GR-1 consent contract |
| NFC-1 | A gift card on an NFC card can be claimed signed in and signed out | In progress | GR-3.13 claim flow; physical iPhone (with GR-3.9) |
| SH-1 | Selection and information sheets share the approved presentation | Done | Existing canonical sheets; supports TX-1, RX-1, ID-1 |
| TX-1 | Current Send/Convert wizard uses shared layout and sheets | Sheet tasks delivered through SH-1; remaining work not started | SH-1 for sheet migration |
| RX-1 | Receive choices are clear and payment requests have proper steps | Done | SH-1 for sheet migration |
| ID-1 | VerusID linking, details, and status surfaces are consistent | Done | SH-1 where a shared sheet is needed |
| ID-2 | The VerusID list and page use the approved light card, content v1, and funds | Built and iOS-tested; Android open | DESIGN.md "VerusID page"; owner chose "D revised" on 2026-10-22 |
| AL-1 | App alerts use the acknowledgement sheet; most old alerts move onto their screens; old Settings pickers become sheets | Built and iOS-tested; Android open | DESIGN.md "App alerts"; owner chose the sheet (option A) on 2026-10-22 |
| RG-1 | Result screens say each fact once: a shared result component, two `check:design` rules, a copy review step | Built and iOS-tested; Android open | DESIGN.md "Transaction result"; owner approved all three parts on 2026-10-23 |
| SV-1 | The Services root uses tiles; the gift card screen uses the fixed card | Done on iOS; Android tested, SV-1.15–1.17 closed; NFC write open | DESIGN.md "Services home" and "Gift card detail"; `AcknowledgeSheet` `dismissLabel` |
| QA-1 | Completed scope has recorded visual, behavioral, and review evidence | Relevant SH-1 checks complete; GR-1/GR-2 runtime evidence remains open | Applies to each delivered workstream |

Recommended sequence: GR-1 and GR-2 together, SH-1 with its first real consumer,
TX-1, RX-1, then ID-1. Apply QA-1 to every delivery rather than saving all QA for
the end. Small correctness fixes, such as misleading status text, may be pulled
forward with their own relevant checks.

## How an AI should maintain this file

1. Read this file, [AGENTS.md](AGENTS.md), [DESIGN.md](DESIGN.md),
   [TYPOGRAPHY.md](TYPOGRAPHY.md), and the relevant terms in
   [CONTEXT.md](CONTEXT.md). Current user instructions and the design contract
   remain authoritative; this plan is a backlog, not a replacement design system.
2. Select the authorized workstream. Record its status and current focus above.
   Recheck its current routes, source, Git state, active writers, and applicable
   workspace guidance. Treat baseline paths as starting points, not frozen code.
3. Use `- [ ]` for unfinished tasks and `- [x]` for completed tasks. Retain the
   text and task IDs. Do not delete completed work or rely on strikethrough alone.
4. Check an implementation task when that specific change is implemented and
   inspected. Keep verification boxes open until their evidence exists. Mark the
   workstream **Done** only when its acceptance criteria and relevant QA pass.
5. Use status **In progress**, **Blocked**, **Ready for verification**, or **Done**
   as appropriate. Blocked items remain unchecked. Record the specific blocker
   and next action; elapsed time is not approval or completion.
6. If a task is already solved elsewhere, verify the current implementation and
   record the supporting commit/evidence before checking it. If superseded,
   annotate it and link its replacement; do not mark it implemented.
7. Update the evidence log, current focus, and last-updated date after each
   coherent delivery or handoff. Record one concrete next action. This file
   should remain useful without access to the original chat.
8. Follow current repository rules for checks, reviews, scoped commits, and
   external actions. Keep incidental QA notes in `*.local.md` files. Never place
   credentials, wallet payloads, personal addresses/balances, or sensitive
   screenshots in this tracked plan.

Example resume request: “Work on TX-1 in UI_REDESIGN_PLAN.md. Complete the
authorized local implementation, relevant verification, and checklist update.”

## Preserve these boundaries

- The baseline enables `ENABLE_SIGNED_IN_REDESIGN` on both platforms. Wallet and
  coin-detail Send/Convert actions use `SendWizard`; Receive uses the Transfer
  screens. Recheck before editing. Do not blanket-redesign legacy
  `Coin/SendCoin`, `Coin/ConvertCoin`, or `Coin/ReceiveCoin` just because they exist.
- Authentication and app-encryption reviews, the dedicated Identity Update
  sequence, and the current invoice/revoke/recover work are references or nearby
  consumers. Regressions caused by shared changes are in scope; broad redesigns
  of those flows are not automatically included.
- Preserve source Asset, Card/subwallet, API channel, destination network,
  conversion route, recipient, fees, validation, signing, and transaction state.
- Preserve experimental request gating, credential scope filtering, required
  response signer restrictions, encryption requirements, and per-item consent.
- A signature, response delivery, transaction submission, and transaction
  confirmation are different events. Visible status must identify the event
  that actually occurred. Callback success does not prove payment settlement.
- Invoice-constrained amount, destination, network, route eligibility, and
  completion behavior must survive shared transfer changes. Do not substitute
  an unconstrained generic Send flow for invoice payment.
- Confirm a disposable Testnet wallet and VRSCTEST before authenticated wallet
  QA. Follow the current repository credential rules. Do not use mainnet wallets.
- These tasks do not authorize dependency churn, a package-manager migration,
  broad state-management refactors, backend capability expansion, or publication.

## Shared design starting points

| Need | Reuse or inspect |
| --- | --- |
| Theme and typography | [tokens.js](src/theme/onboarding/tokens.js), [TYPOGRAPHY.md](TYPOGRAPHY.md) |
| Floating sheet shell and dismissal lifecycle | [BottomSheetModal](src/components/BottomSheetModal.js) |
| Selection sheet | [IdentityPickerSheet](src/containers/DeepLink/components/VerusIdIdentityPickerSheet/IdentityPickerSheet.js) |
| Transfer-specific card selection reference | [CoinCardPickerSheet](src/containers/Coin/CoinCardPickerSheet.js) |
| Information sheet | [DeepLinkRequestSheetScaffold](src/containers/DeepLink/components/RequestReview/DeepLinkRequestSheetScaffold.js), [DeepLinkRequestDetailsSheet](src/containers/DeepLink/components/RequestReview/DeepLinkRequestDetailsSheet.js) |
| Request review | [AuthenticationRequestInfo](src/containers/DeepLink/AuthenticationRequestInfo/AuthenticationRequestInfo.js), [AppEncryptionRequestInfo](src/containers/DeepLink/AppEncryptionRequestInfo/AppEncryptionRequestInfo.js) |
| Full-screen stepped task | [ProgressHeader](src/components/ProgressHeader.js), [GiftCardFund](src/containers/Services/ServiceComponents/GiftCardService/GiftCardFund/GiftCardFund.js) |
| Bottom actions and compact forms | [SafeBottomActionStack](src/components/SafeBottomActionStack.js), [AddressBookEditSheet](src/containers/Services/AddressBook/AddressBookEditSheet.js) |
| Search, copy, loading | [AppSearchField](src/components/AppSearchField.js), [AppSearchLauncher](src/components/AppSearchLauncher.js), [CopyAction](src/components/CopyAction.js), [SkeletonLoader](src/components/SkeletonLoader.js) |

Use the approved floating geometry, title/row/action spacing, and semantic states
from these components and DESIGN.md. A `BottomSheetModal` import alone does not
establish consistency. Keep long tasks full-screen and short choices/details in
sheets. Avoid new generic cards, decorative icons, repeated headings, and local
near-copies of existing controls.

## GR-1 — Credential and data-signing review

**Finding:** `UserDataRequestInfo` displays “Credential Request”. It and
`DataPacketRequestInfo` share hard-coded light styles, card-heavy layouts, older
buttons, and dense technical payload displays. Their identity chooser already
uses the canonical sheet. Both request types are experimentally gated.

**Sources:**
[UserDataRequestInfo](src/containers/DeepLink/UserDataRequestInfo/UserDataRequestInfo.js),
[DataPacketRequestInfo](src/containers/DeepLink/DataPacketRequestInfo/DataPacketRequestInfo.js),
[dataRequestInfo.styles](src/styles/deeplink/dataRequestInfo.styles.js),
[experimentalDeeplinks](src/utils/deeplink/experimentalDeeplinks.js),
[userDataRequestValidator](src/utils/deeplink/validator/userDataRequestValidator.js),
[scopedCredentials](src/utils/deeplink/credentials/scopedCredentials.js).

- [x] **GR-1.1** Trace the current handler, validator, credential lookup, response
  builder, and screen props. Record supported data types and restrictions before
  changing presentation. Do not infer a general credential manager from this UI.
- [x] **GR-1.2** State the small design contract using authentication/app-encryption
  review as the exemplar: requester, requested action, responding VerusID,
  inspectable details, and the next required action.
- [x] **GR-1.3** Migrate both screens to semantic colors, shared typography,
  request-review composition, `AppButton`, and `SafeBottomActionStack`.
- [x] **GR-1.4** Show understandable credential names and the data being shared.
  Put secondary scope/encoding metadata behind a details affordance; keep exact
  values inspectable without turning the main page into a JSON dump.
- [x] **GR-1.5** Separate readable statements/data from hashes, bytes, and descriptor
  metadata in Data Packet review. Represent unknown or uninterpretable content
  honestly; never summarize arbitrary signatures as harmless authentication.
- [x] **GR-1.6** Preserve per-credential and per-statement/data-item consent. Reset
  consent when the reviewed payload or responding identity changes. Do not
  remove required acknowledgements merely to reduce copy. GR-4.5 changes the
  form to one open item and a named approval button. Per-item consent remains.
- [x] **GR-1.7** Distinguish locked, loading, no matching credentials, partially
  available credentials, lookup failure, and required-signer-unavailable states.
  Do not report “no credentials” before a lookup has completed successfully.
- [x] **GR-1.8** Give each state an accurate action label and recovery path. Make
  clear when continuing returns only some requested credentials or none.
- [x] **GR-1.9** Verify consent gates, scope/signer/network restrictions, encrypted
  responses, signed-out entry, and mixed-detail requests using disposable data.
  Done 2026-10-10 in GR-3 on VRSCTEST with real taps (GR-3.7, GR-3.16,
  GR-3.17): “Sign data” stays disabled until every item is checked (iOS and
  Android); matching, partial, and missing credential scopes; a required
  signer the wallet does not control shows “Required VerusID unavailable”
  with Switch wallet and sends nothing, and its own ID proceeds; wrong-network
  requests are rejected; credential responses arrive encrypted (harness);
  signed-out entry opens “Unlock wallet to review”, then the review after
  Face ID, and the signed response is verified; credential/data-packet in
  both orders and sign-in + credentials or data packet are verified. Consent
  reset on an identity change is covered by the GR-1 state checks only (the
  test wallet has one eligible VerusID).
- [x] **GR-1.10** Complete relevant QA-1 checks and record delivery evidence.
  Done 2026-10-10 with the GR-3.17 QA-1 record in the evidence log. Recorded
  follow-ups: full VoiceOver/TalkBack walkthrough, reduced motion, and the
  app-wide text-scaling decision.

**Implemented design contract (2026-09-10):** Authentication and app-encryption
review are the exemplars. Both screens reuse semantic theme/typography,
`DeepLinkRequestSourceCard`, request details and identity picker sheets,
`AppButton`, `SafeBottomActionStack`, `CopyAction`, and `SkeletonLoader`.
Credential values and readable signed data stay on the main review; exact
keys, hashes, bytes, scope, and descriptor data are inspectable in sheets.
Per-item checkboxes deliberately remain. Compact pages opt into the existing
sheet scroll cue so content below the requester remains discoverable.
The shared details-sheet body shrinks within the modal's height constraint so
Done remains inside its rounded boundary. Signing errors remain visible above
the primary action in the normal-flow footer, outside the scrolling review.

**Protocol coverage:** User Data supports scoped, encrypted full-credential
responses only; missing keys produce partial or empty contributions. A lookup
or decryption error is a retryable error, never an empty result. Data Packet
supports the handler's messages, descriptors, and statements; opaque bytes
remain explicitly unreadable. Validator, experimental gate, network, required
signer, and encryption restrictions remain authoritative. Native fixture
rendering substitutes wallet storage and signing; GR-1.9 remains open for an
authenticated disposable-wallet mixed request and callback walkthrough.

**Acceptance:** Both request types belong to the current review family in light
and dark mode. Users can understand and inspect what will be sent/signed, which
identity responds, and what is missing. Existing protocol restrictions and
informed consent remain intact. Delivery completion is tracked under GR-2.

## GR-2 — Accurate request completion and response delivery

**Finding:** User Data and Data Packet currently call the default `next` path.
Without another detail opting into automatic delivery, they reach the legacy
`GenericRequestComplete` screen, which displays “Success” before pressing
“Complete” attempts delivery. Newer flows already have a delivery sheet.

**Sources:**
[GenericRequestHome](src/containers/DeepLink/GenericRequestHome/GenericRequestHome.js),
[genericRequestCompletionFlow](src/containers/DeepLink/GenericRequestHome/genericRequestCompletionFlow.js),
[GenericRequestComplete](src/containers/DeepLink/GenericRequestComplete/GenericRequestComplete.js),
[genericRequestDelivery](src/utils/deeplink/genericRequestDelivery.js).

- [x] **GR-2.1** Inventory remaining callers of legacy completion and determine
  which can use existing centralized delivery. Include mixed-detail ordering and
  requests with no response content or no callback destination.
- [x] **GR-2.2** Route applicable credential/data-signing completion through the
  existing delivery mechanism. Avoid adding a second delivery implementation or
  changing the timing of user consent implicitly.
- [x] **GR-2.3** Make visible states accurately describe response preparation,
  sending, sent, redirect handoff, and failed delivery. Preserve any separate
  transaction-result facts; do not imply final settlement from a sent response.
- [x] **GR-2.4** Preserve duplicate-submission protection, retry behavior, the
  guarded exit after failure, and saved-request completion timing. Translate
  technical failures into clear guidance without claiming delivery succeeded.
- [x] **GR-2.5** Verify POST success/failure/retry, redirect handoff, no-callback,
  mixed-detail requests, and repeated button taps using controlled fixtures.
  Record which result was observed and which remains unverified.
- [x] **GR-2.6** Complete relevant QA-1 checks and record delivery evidence.
  Done 2026-10-10: real delivery on iOS for POST, fail once, fail always,
  redirect, and no callback (sign-in + app encryption), data packet fail
  always with Leave without sending, credentials with no response, and an
  identity update retry that redelivered the same txid; Android POST. QA-1
  record in the GR-3.17 evidence row.

**Completion inventory (2026-09-10):** Credential and Data Packet now opt into
centralized delivery. Authentication, app-encryption, and spendable-key flows
already do so. Mixed requests retain the existing accumulated completion policy.
`WalletBackupRequestInfo` and the older `InvoicePaymentConfiguration` retain
legacy completion; its pre-delivery copy now says “Ready to finish” and
“Response not sent”. (GR-3.12 removed this exception and the legacy screen on
2026-10-10.) Dedicated invoice results and inline Identity Update retain
their distinct transaction/update facts. The shared delivery path caches a
prepared signed/encrypted response per request/response pair for retry, rechecks
authentication expiry, and reports POST, redirect, and no-response outcomes
separately. Failure exit does not mark the saved request complete.

**Acceptance:** No broad “Success” state implies a response was delivered before
delivery occurs. Retry does not repeat already completed signing/payment work.
Remaining legacy completion callers are documented, with deliberate exceptions.

## GR-3 — GenericRequest runtime matrix and remaining request redesign

**Finding (2026-10-09, source only):** Mobile accepts nine GenericRequest
detail types. Most review screens use the current design. No authenticated
end-to-end run covers all types. The legacy `GenericRequestComplete` screen still
ends invoice and wallet-backup flows. `WalletBackupRequestInfo` still uses legacy
colors and Paper controls. The “Open in another app” pill in
`GenericRequestHome` uses legacy colors and absolute positioning. Rejected
requests show only an alert.

**Scope decisions (user, 2026-10-09):**

- Exclude DeFi. That is conversion and cross-chain invoice payment. Test invoices
  with native VRSCTEST only. The protocol has no separate DeFi detail type.
- Do not redesign, generate, or test the deprecated LoginConsent v1 and VerusPay
  invoice v1 links. Leave them as they are.
- Test wallet backup and the QR scan path on a physical iPhone with an NFC tag.
- Android gets one smoke pass per type in Phase 4, not the full matrix.
- Add new request generators to deeplink-sim on a separate branch.

**Request inventory (source verdict, 2026-10-09):**

| Detail type | Screen | Design state | Test request source |
| --- | --- | --- | --- |
| Authentication | `AuthenticationRequestInfo` | Current (exemplar) | deeplink-sim |
| Authentication + provision identity | `ProvisionIdentityBottomSheet` | Current | `verus-fake-provisioning-webhook` |
| App encryption | `AppEncryptionRequestInfo` | Current (exemplar) | New deeplink-sim generator |
| Identity update | `IdentityUpdateRequestInfo` and its steps | Current (exemplar); content step keeps Paper rows | deeplink-sim fixture setup; new variants |
| User data (credential) | `UserDataRequestInfo` | Current (GR-1) | deeplink-sim data lab |
| Data packet | `DataPacketRequestInfo` | Current (GR-1) | deeplink-sim data lab |
| VerusPay invoice | `InvoiceInfo`, invoice form/review/result | Current; ends on legacy completion | deeplink-sim invoice lab |
| Spendable key (gift card claim) | `SpendableKeyRequestInfo` | Current | Mobile Gift Card service |
| Create wallet backup (NFC only) | `WalletBackupRequestInfo` | Partial; ends on legacy completion | Physical iPhone and NFC tag |

Mixed requests are in scope: authentication with credential, data packet,
invoice, app encryption, or provisioning; credential and data packet in both
orders.

**Test bench:** The local VRSCTEST `verusd` (RPC port 18843) signs requests as
`TestBob.antafri@`. deeplink-sim runs from the `deeplink-sim-deps-update`
worktree. The provisioning webhook runs from `verus-fake-provisioning-webhook`.
Links open with `xcrun simctl openurl` on simulators that hold only the Verus
Mobile debug build. Use only disposable VRSCTEST profiles and identities.

Phase 0 — test bench:

- [x] **GR-3.1** Create the task branch `codex/gr3-request-matrix` from
  `codex/sync` and record this workstream.
- [x] **GR-3.2** Prepare clean normal and compact iOS simulators that hold only
  the Verus Mobile debug build, so no other app claims `verus://` links.
- [x] **GR-3.3** Create a fresh disposable VRSCTEST profile. Enable experimental
  GenericRequests and development HTTP callbacks.
- [x] **GR-3.4** Give the profile a VerusID through the provisioning webhook and
  fund it with a small VRSCTEST amount. Record this as the provisioning run.
  Deviation: Testnet rejects every sub-ID registration ("DeFi functions
  temporarily disabled"), and the app fails after the provisioning POST (bug
  GR3-B1). By user choice, the daemon test ID `liveqa09482856.antafri@` got the
  test wallet's R-address as a second primary address and its shielded address
  as private address. The app linked it through automatic discovery in a
  sign-in request. The provisioning row stays Blocked in the matrix.
- [x] **GR-3.5** Add the missing deeplink-sim generators: app encryption,
  authentication with app encryption, identity-update variants, and negative
  cases (wrong network, expired, bad signature, unknown detail, experimental
  setting off, over-length link).
- [x] **GR-3.6** Confirm that `xcrun simctl openurl` delivers a harness link to
  the debug build and reaches the review screen.

Phase 1 — test run (report only; fix only bugs that block the matrix):

- [x] **GR-3.7** Run each type and mixed request: approve, decline, and Back.
  Run each delivery mode: POST, fail once, fail always, redirect, and no callback.
  Record the observed screen, verified callback, and confirmed transaction as
  separate facts.
  Done on the iPhone 17 Pro simulator, except wallet backup (GR-3.9). All five
  delivery modes ran on authentication + app encryption; identity update ran
  POST and fail once; the other types ran POST. Two matrix-blocking bugs were
  fixed (GR3-B1 provisioning session, GR3-B5 identity content lookup). Four
  bugs stay open for triage (GR3-B2, B3, B4, B6).
- [ ] **GR-3.8** Capture light/dark and normal/compact screenshots of every
  review, processing, result, and error state.
  Light and dark at normal size are captured. Compact is deferred (user,
  2026-10-10): the compact simulator has no profile yet.
- [ ] **GR-3.9** Run wallet backup and the QR scan path on the physical iPhone.
- [ ] **GR-3.10** Write the local report and gallery. Give each row Works,
  Broken, or Blocked with the reason.
  Draft: local `gr3-matrix.local.md` and `docs/qa/gr3/gallery.html`. It becomes
  final after GR-3.8 and GR-3.9.

Phase 2 — triage:

- [x] **GR-3.11** Agree the bug list and redesign scope with the user. Fix
  functional bugs first. Reproduce each bug before its fix.
  Root causes (2026-10-10, local `gr3-matrix.local.md`): B6 is a missing
  `detachInactiveScreens={false}` on the invoice and identity-safety modal
  navigator, so every touch reaches JS twice. B3 is the app-encryption screen's
  own loading sheet colliding with the delivery sheet. B2 is a missing
  `resetDeeplinkData()` after provisioning. B4 is a primitives library Buffer
  defect under Hermes. P1 follows upstream behavior.
  Agreed (user, 2026-10-10): fix B6, B3, B2 and R1 now; leave B4 for later
  (harness workaround stays); all four Phase 3 groups are in scope. Done: each
  bug was reproduced, fixed, and rerun with real taps (see the evidence log).
  P1 stays an upstream question.

Phase 3 — remaining redesign (one scoped delivery each):

- [ ] **GR-3.12** Move invoice and wallet backup from `GenericRequestComplete` to
  the centralized delivery path. Keep the payment result separate from response
  delivery. This replaces the GR-2 exception for these two callers.
  Implemented 2026-10-10: after the last detail, a response with
  details always goes through the delivery sheet; an empty response with no
  detail asking for the sheet finishes without one, because invoices and wallet
  backups add nothing to send and their own screens show the outcome. A detail
  that asks for delivery (for example missing credentials) keeps the “Request
  complete” notice. The legacy screen, its route, and its styles are removed.
  Invoice-only verified on the simulator; wallet backup (no NFC on the
  simulator) and the skipped-backup passthrough are verified by source only and
  wait for the physical iPhone (GR-3.9). The wallet-backup screen still shows
  no “backup written” result; add it in GR-3.13.
- [ ] **GR-3.13** Migrate `WalletBackupRequestInfo` to the semantic theme and
  shared controls. Verify it on the physical iPhone with NFC.
  Implemented 2026-10-10. Request-review composition from
  `AppEncryptionRequestInfo` (title, subtitle, 56-point primary and Cancel);
  options use `SettingsProfileSummary`, `SettingsSwitchRow`, and a
  `SettingsRow` that opens a `SelectionSheet` for brute-force resistance;
  semantic strength colors; the shared `requestWalletUnlock`; no hero icons,
  Paper checkboxes, Paper menu, or filled wallet card. New “Backup written”
  result before the request continues (Done, or Continue when a claim
  follows); Settings no longer adds its own alert. Settings mode no longer
  adds the status-bar inset under its header, the keyboard offset includes the
  header, and the password fields use the onboarding autofill settings. NFC
  write logic, session guards, and completion markers are unchanged. Simulator
  evidence covers every state except a real NFC write (stubbed); the physical
  iPhone run (GR-3.9) is still required.
- [x] **GR-3.14** Fix the small leftovers: the “Open in another app” pill, the
  `InvoicePaymentConfiguration` fallback root, and the Identity Update content
  step Paper rows. Added (user, 2026-10-10): the empty band under “View request
  details” on every review (GR3-D8), the “1 hours” expiry copy (GR3-D9), and the
  “Secure POST” label on plain HTTP destinations (GR3-D6).
  Implemented 2026-10-10, commit `0c75f191`. “Open in another app” is a quiet text
  action in normal flow above the review (no absolute pill, no fixed 100-point
  offset, semantic colors); a nested safe-area provider stops the review from
  adding the status-bar inset again; the chooser is the shared
  `SelectionSheet`, and a failed handoff shows recovery guidance instead of
  the raw link. The unreachable `InvoicePaymentConfiguration` route and its
  legacy fallback root are removed (the invoice review renders it inline).
  The Identity Update private-information rows no longer use Paper `List` and
  `Divider`; one item no longer repeats the group title, and the private
  address uses monospace. D8: the data reviews no longer stack the source-card
  margin, a section margin, and item padding (about 110 to about 42 points);
  on short reviews the remaining space is free space above the footer. D9:
  `blocksToTime` uses whole seconds, correct singular units, and leaves out
  zero units (“1 hour”, “1 hour 1 minute”). D6: one shared delivery label —
  “Secure POST” only for HTTPS, “POST over HTTP” otherwise — in sign-in, app
  encryption, and the data-review details.
- [x] **GR-3.15** Replace rejection alerts with a request error state that gives
  recovery guidance (GR3-D1). In scope by user choice, 2026-10-10.
  Implemented 2026-10-10, commit `39dabf36`. A rejected GenericRequest stays on the
  opening screen, which turns into an error state: one title, one recovery
  sentence, and Close; Try again only when a retry can help (network failure
  or an unknown error). No icon, no step list, no raw error text. The same
  state covers detail-handler failures in `GenericRequestHome`, and a failed
  detail now stops the loop instead of running on to the next detail.
  `genericRequestRejection.js` maps coded errors (wrong network, request not
  valid, signer not verified, expired, unsupported detail, experimental off,
  delegated-signer wallet) and axios transport texts to the copy. Links that
  fail before a request screen exists (too long, unreadable) keep an alert, but
  with translated copy. The shared Paper alert backdrop was opaque black
  because the theme dropped `scrimOpacity`; it now dims the screen. Deprecated
  LoginConsent v1 and VerusPay invoice v1 keep their alerts.
- [x] **GR-3.18** Identity Update high-risk steps: show the address that gains
  control, the current and new authorities, and full names without mid-token
  breaks (GR3-D10, GR3-D2). Add the destination and fee to the gift-card claim
  review. Added by the user, 2026-10-10.
  Implemented 2026-10-10, commit `50727421`. The high-risk step now shows each
  change in full on the step itself: a primary-address change lists the
  removed and added addresses in monospace, and a recovery or revocation change
  shows the current and the new authority, with the new one emphasized. The
  rows keep View for the technical details; the acknowledgement sheet shows each
  name with its i-address. A content key with no known name reads "Unnamed key"
  with its full i-address instead of a four-and-four abbreviation. Long VerusID
  names wrap after a dot instead of inside a name part (`withNameBreaks`, display
  only) in "Updating identity", the provisioning name preview, and the
  provisioning review. The gift-card claim review shows "To" (wallet name and
  receiving address) and "Network fee"; the claim plan now keeps the fee that
  was already subtracted from the shown balance.
- [x] **GR-3.19** Mixed requests: tell the user when a second step follows the
  sign-in review (GR3-D11). Added by the user, 2026-10-10.
  Implemented 2026-10-10, commit `8270ae32`. When another review follows sign-in,
  the sign-in primary action names it instead of signing in: “Continue to sign
  data”, “Continue to share credentials”, “Continue to pay invoice”, “Continue
  to VerusID changes”, “Continue to wallet backup”, or “Continue to claim
  funds”. Nothing is sent until the last step, so “Sign in with VerusID”
  stays only when sign-in finishes the request (sign-in only, or sign-in with
  provisioning, which the sign-in step handles). `genericRequestNextStep.js`
  finds the next detail that opens its own review, in processing order, and
  skips a wallet backup that the passthrough flag skips. The label appears
  after a VerusID is selected; before that the action stays “Choose VerusID”.
  No step counter or progress bar: DESIGN.md does not allow a “Step 2 of 4”
  eyebrow, and the next screen's title matches the action that opened it.

Phase 4 — regression:

- [ ] **GR-3.16** Rerun the matrix on the final branch. Run one Android smoke
  pass per type.
  Run 2026-10-10 on `8270ae32` plus two fixes (commit `dd3a476f`). iOS: every
  in-scope type and mixed request passed again with real taps, including all
  five delivery modes on sign-in + app encryption, fail-once identity update
  with one transaction, both credential/data-packet orders, sign-in + invoice,
  the six rejected-request cases, and the gift-card claim. Android: one smoke
  pass per type on a new disposable profile (app encryption, sign-in + data
  packet, identity update, credentials, rejected requests, provisioning,
  invoice, gift-card claim). Fixed during the run: the gift-card claiming
  state pushed its text to the screen bottom (same `AnimatedActivityIndicatorBox`
  defect as GR-3.13), and the Android identity picker threw on a null
  `accessibilityState` (GR3-B9). New finding GR3-B8: two equal payments to the
  same address inside one block window reuse the first payment's inputs, so
  the second is a byte-identical rebroadcast that the app reports as
  submitted. Gaps: credential matching and provisioning registration (testnet
  sub-ID registration blocked, GR3-E1); wallet backup (no NFC, GR-3.9);
  compact size (deferred). GR-3.14, GR-3.15, GR-3.18, and GR-3.19 are checked
  on this rerun; GR-3.12, GR-3.13, and this item wait for GR-3.9.
- [x] **GR-3.17** Close GR-1.9, GR-1.10, and GR-2.6 where the evidence supports
  it. Refresh `docs/genericrequest-types-and-chains.html`. Complete the relevant
  QA-1 checks.
  Done 2026-10-10. GR-1.9, GR-1.10, and GR-2.6 are closed (see each item). The
  missing runtime checks ran first: required signer (unavailable and own),
  signed-out data-packet entry, request-details sheet close and reopen, and
  Android hardware Back and accessibility labels. The local protocol map
  (`docs/` is ignored by Git) now shows nine supported details, the unsigned
  order rules, the shared delivery path, the error state, the runtime
  evidence per type, and the open items; it renders at desktop and phone
  width in light and dark. Global QA-1 stays open (TX-1 and other workstreams).
- [x] **GR-3.20** Open VerusPay invoice links, identity update links and v1
  login links on the request loading screen instead of the white page with the
  old spinner. Theme the white page behind every request.
  Done 2026-10-22 on `claude/request-loading`. `GenericRequestLoading` takes a
  title and steps; invoices read "Opening invoice" (no Verify signer step when
  unsigned) and all of them have Cancel. Identity update failures (expired,
  signature, other) end on the request error state instead of a raw alert.
  v1 login keeps its alerts. iOS light and dark checked; iPhone SE and Android
  not run.

Recorded for later (user, 2026-10-10; outside the request redesign):

- **GR3-B8** Two payments with the same amount and destination inside one
  block window do not both happen. The second send selects the inputs that
  the first, still unconfirmed payment already spent, so it signs a
  byte-identical transaction. The server returns the first txid without an
  error, and the app shows “Payment submitted” for the second invoice.
  Reproduced three times on iOS (invoice only, 0.01 VRSCTEST to one address);
  a debugger counter showed an identical signed transaction; the mempool held
  one transaction each time. Source: `getSpendableUtxos`
  (`src/utils/api/channels/vrpc/requests/getAddressUtxos.js`) reads only
  `getaddressutxos`, which does not remove inputs spent in the mempool. Not
  run: two payments with different outputs (expected to conflict and fail
  instead). Needs its own task on send input selection; reproduce in a
  failing test first.
- **GR3-D15** (P3) Android hardware Back on a request review returns to
  Wallet and sends nothing, but skips the screen's Cancel handler, so
  `deeplink.id` stays set (Cancel clears it). Reopening the same link works;
  no visible effect seen.
- **Text scaling** (app-wide, QA-1.3): `src/utils/applyGlobalTypography.js`
  sets `allowFontScaling = false` for every `Text` and `TextInput`, so the
  system text size has no effect (checked at the largest iOS size). This is a
  product decision outside GR, not a GR regression.

**Acceptance:** Every in-scope type and mixed request has a recorded runtime
result with its proof level. No in-scope flow ends on the legacy completion
screen. All in-scope request surfaces belong to the current review family in
light and dark mode. Shared changes leave the excluded and deprecated flow
code untouched.

## GR-4 — Request card and item approval

Owner approval, 2026-10-28: Z3 replaces review titles, requester cards, details
links and footer identity rows. Z3c is used after the first identity-update
step. The round-5 mockups are the design authority. Phase 2 builds the approved
option B for Sign data and Share credentials, after the A1-A3 review fixes.
Saved requests, legacy LoginRequest, results and request logic remain outside
this scope.

- [x] **GR-4.1** Build shared `RequestCard` and `RequestCardCompact`, with
  two-tone complete names, verified marks, semantic colors, responsive rows
  and the existing picker action. Export the shared style module.
- [x] **GR-4.2** Build one requester sheet. Merge VerusID and request details
  through the current information scaffold, copy actions, scroll cue and Done.
- [x] **GR-4.3** Show the conditional "Open in another wallet" caption action.
  Owner-approved follow-up (2026-10-29): replace the icon, keep the fixed
  48-point headerless band, and use a small row on invoice Pay with only.
  Preserve the existing handoff flow.
- [x] **GR-4.4** Apply the shared card and approved copy to authentication,
  encryption, data signing, credentials, backup, claim/password, invoice Pay
  with and all identity-update stages. Preserve all request behavior. Update
  the canonical design contract and check.
- [x] **GR-4.5** Per-item approval one at a time (phase 2). Shared
  `DataApprovalList` opens the first unapproved item. The footer names it;
  approved rows have Undo. Unreadable data requires the confirmation sheet.
  `useDataReviewConsent` keeps its keys and resets, with the reset notice.
  Handler gates remain; checkboxes and the counter line are removed.
- [ ] **GR-4.6** Orchestrator device QA: iOS and Android, normal/compact,
  light/dark, all request states and merged sheets, long names, picker/reset,
  Back, retry, reload and interrupted operations. Check consent and request
  behavior. The implementation agent must not start devices.
  Done on iPhone 17 Pro, iPhone SE and Android 360x640. Open: Android normal
  size (Pixel 8). G4-and-01 (stale request after Back) and G4-and-03 (request
  screens ignore app Dark) are fixed (`claude/gr4-followups`) and passed on
  Android 360x640 and iPhone SE; the iOS invoice stale-request case
  G4-ios-01 passed on SE (Back, then a different invoice opens).
- [x] **GR-4.HEADER-TARGETS** Owner requested the invoice Back and Close
  target fix (G4-ios-03, 2026-10-29). `SendWizardHeader` now reuses
  `OnboardingBackButton` and `HeaderCloseButton` at 44 x 44 points, with
  equal space when Back is hidden. Preserve navigation callbacks, disabled
  controls, icon sizes, title centering and progress. The shared header also
  serves Send/Convert. The focused component check failed at 40 x 40 before
  the fix, then passed target sizes, callbacks, disabled controls and the
  hidden-Back slot. Design, two-file safe-area, Babel and completion checks
  pass. After an initial selector-blocked run, Terra 6.1 Extra High measured
  44 x 44 targets on iPhone SE, iPhone 17 Pro and Android 360x640. iOS
  titles are centered; SE and Android Confirm Back return to Pay with.
  SE Close followed by a new invoice shows the new amount. Send and Convert
  entry headers also pass at 44 x 44 on SE. No transaction was submitted.
  Evidence: `docs/qa/matrix/runs/2026-10-29-gr4-presentation/QA.local.md`;
  focused component check: `/tmp/invoice-header-targets-check.cjs`.
  No commit, merge or push.
- [x] **GR-4.PRESENTATION** Owner requested all four remaining presentation
  fixes and in-app screenshots (2026-10-29). Content-change cards state the
  removal action once. Review and Confirm count high-risk changes separately
  from ordinary content changes; content review steps and risk gates stay.
  Requester content reuses `describeIdentityContent`, including readable
  values, descriptor labels, unnamed-key labels and encrypted-value badges.
  Requester identifiers match transaction details at 12/17 monospace.
  All four focused regressions failed before the fix, then passed. The
  encrypted/empty-content checks, existing consent fixture, header fixture,
  design, seven-file safe-area, Babel and completion checks pass. Terra
  captured actual app screenshots on compact/normal iOS and small Android.
  Native cases pass for an empty-content clear and encrypted requester data.
  Plaintext, known-label and old-content native cases remain unverified.
  Root review found an orphan primary R-address character on Android, then
  applied the same identifier style to primary and private addresses.
  That regression fails at the base and passes in the component fixture;
  Android recheck passes at font scale 1.0: primary and i-address fit on one
  line, private address wraps on two lines, and encrypted rows remain legible
  in light and dark. Evidence is in the same QA folder, with `-fixed-`
  screenshots kept beside the initial captures. All task-owned runtimes are
  stopped. No commit, merge or push.

### GR-4.IDU-PARITY-FOLLOWUPS (2026-11-12)

Display-only follow-ups on `claude/idu-parity-followups-1112`, from local
`redesign` `da0bb81f`. Preserve transaction construction, funding, signing,
broadcast and response bytes. Each item has a separate commit.

- [x] Show the full key below named and unnamed titles for non-clear operations.
- [x] Use one field-count helper for singular and plural content previews.
- [x] State the high-risk acknowledgement instruction once; preserve its gate.
- [x] Group each decoded value's warnings and fields under one heading.
- [x] Remove only the redundant Included data chip; keep Public and the notice.
- [x] Review fix `e791e694`: unnamed clear-all removal cards keep their full key.
- [x] Device QA: iOS 17 Pro + SE and Android `normal` + `small`, light/dark.

Design contract: operate mode; existing GR-4 content cards and the canonical
information-sheet hierarchy. Reuse `InfoSheetRow`, `InfoSheet`, `CopyAction`
and the current card. Value headings use `theme.typography.titleRow` and
`textPrimary`; warnings keep `bodySm` and `warningText`. Use whitespace,
without a new card, color, dot or left-edge bar. Show one heading for each
value in a multi-value group. Remove the repeated root prefix from field
labels; keep nested paths. A single value needs no Value 1 of 1 heading.
Required rendered states: ordinary and upload content, multiple and single
values, warnings, long nested paths, raw-data and upload sheets, light/dark,
normal/compact. This task permits static checks only; device QA is pending.

### GR-4.IDENTITY-UPLOAD — identity update data (2026-11-03)

Status: **Ready for verification**. Scope: upload data in identity update
requests only. Do not import the upstream registration feature.

- [x] Copy the eight `src/utils/identityUpdate` modules unchanged from upstream
  `identity-registration` `0a99f88a` (implementation commit `c9d571d0`).
- [x] Replace the blanket refusal with upstream upload policy plus coded
  refusals for signatures, bindings, `createmmr=false`, and upload credentials.
- [x] Wire session-scoped native crypto, lossless request copies, pre-funding
  decrypt/verify, verified funding approval, and verified submission. Dispose
  build keys in `finally` and on cancellation or session change.
- [x] Keep GR-4 content rows and the review/content/risk/confirm sequence.
  Add Public, Encrypted upload, and Encrypted credential visibility labels.
  Review original upload fields and warnings inline and through `InfoSheet`.
  Reuse `InfoSheetRow`, `StatusBadge`, `CopyAction`, and `SkeletonLoader`.
- [x] Run frozen install, parser, design, safe-area, authority-funding, iOS
  production bundle, temporary upstream tests, and the existing identity tests.
  Eight unchanged modules match upstream byte for byte. The library stays at
  `50fa3ffa`: the diff to `5ddc4b8b` changes registration only.
- [x] Update existing tests for approved uploads, SDK canonicalization, request
  cloning, network fields, and the fifth signer argument. Use the approved
  plain rejection copy. Keep baseline test failures separate from regressions.
- [x] Device QA on disposable VRSCTEST (iOS, iPhone 17 Pro and iPhone SE,
  light/dark): ordinary content, public upload and encrypted upload confirmed
  on chain and verified by the requester; a refused upload ends on
  "Unsupported upload" with the plain copy; signed-out open and unlock; Back
  and Cancel from review and Confirm; an out-of-date review asks the user to
  reopen the request.
- [ ] Still open: Android (native encryption untested there), mixed uploads
  with ordinary content in one request, encrypted credentials, interrupted
  submission and unknown broadcast.

Design contract: operate mode; existing GR-4 content cards and compact request
card are the exemplars. Add fields within those rows and use the information
sheet primitives. Keep current badges, filters, summaries, removal details,
footer, and completion sheet. No new card style, dot, or left-edge bar. Full
upload fields stay visible. Native visual and accessibility review is deferred
by the task instruction. Existing zero-delta token fee support stays; all other
currency deltas must be zero and the shown fee comes from the SDK approval.

Initial port checks: 188 unmodified upstream module/wrapper tests pass. With the upstream
handler fixture adapted to this app's separate `subjectIdentityContent` and
explicit `createmmr=true`, 200 tests pass. The unmodified extra handler fixture
had five contract/fixture failures. Existing identity tests: 28 pass, 16 fail
(old wrapper/blanket-refusal expectations or missing chain fields), four suites
stop on the baseline SVG mock error. Existing gift/claim tests: 63 pass, 20 fail;
19 failures also occur against base source, and one assertion expects the old
four-argument signer. No existing test was changed. Temporary tests were removed.
Node policy and synthetic component fixtures pass; they do not prove native UI.

Test follow-up, `claude/identity-upload-tests` from `05e541f3`: the complete
requested identity group has 62 passing tests and no failing tests (base
`052d0b5c`: 53 passing, no failing). Nine cases were added within existing files
for refused options and supported-upload crypto. The same four SVG
`Touchable.Mixin` suite-load errors remain. Gift-card, claim, and spendable-key
tests have 77 passing and 19 failing tests on both base and candidate; all 19
failures still come from the existing missing `getMempoolUnspentUtxos` mock.
The branch-only signer failure is fixed with an explicit funding approval.
Parser checks on four changed JS files, design checks, and whitespace checks
pass. No new test files, skipped tests, or device checks.

Local details: `identity-data-upload.local.md`. No device runtime, transaction,
merge, push, dependency change, or registration work. The three local
`deeplink-sim` folders do not expose `--variant data-upload`; no upload command
was verified and those folders were not changed.

## NFC-1 — Claim from an NFC card

**Finding (2026-10-11, source; GR3-B10):** The app cannot read a Verus NFC
card. Upstream has two signed-out entries that call `readDeeplinkFromNfc`:
“Initialize from NFC” on the first-run screen and “Read deeplink from NFC” in
the signed-out menu. The signed-out redesign removed both (`62c9b54d`,
`5720414d`, 2026-06-08). No record shows that this was intended. iOS does not
open `verus://` links from tags (background tag reading supports only universal
links and system schemes), so an iPhone has no other path. Effects: a gift card
on an NFC card cannot be claimed with Verus Mobile alone, and the “Claim this
card” choice in `WalletBackupRequestInfo` (it needs `passthrough.fromNfc`) never
appears. Upstream never had a signed-in entry.

Related finding (source): onboarding “Scan QR code” (`CreateProfile`
`handleScan`) uses any scanned text as the imported seed, without a review
step. A gift-card QR scanned there becomes the new wallet's seed.

**Decisions (user, 2026-10-11):**

- Use the label “Claim from NFC card” in all three places. Changed
  2026-11-10 (user): the Home → Scan button reads “Scan NFC card”. Only that
  button changes; the other two entries keep “Claim from NFC card”.
- Signed out, no wallets: a row in the “Get started” sheet.
- Signed out, with wallets: a row in Login → Other options.
- Signed in: a button on Home → Scan.
- Hide the entries on devices without NFC.
- Include the onboarding QR fix.
- Build NFC-1 first. Then one physical-iPhone session covers GR-3.9 and NFC-1.
- Added (user, 2026-10-11): put the NFC tap screen from the “NFC Tap Moments”
  page (the simple version) into every NFC read and write, in the same commit
  as NFC-1. A card with other content (a wallet backup, no Verus link) shows one
  line and one action in the same screen, not an alert (proposed in the
  integration report; the user continued without a change).

**Design contract:** Scope is the two signed-out sheets, the Scan screen's
bottom button, the shared read action and its messages, the global
`LoadingModal` (the read status surface), and the onboarding QR result.
Exemplars are the existing rows of each sheet (`SignedOutActionRow` in the start
sheet, the Other options rows) and the scanner's safe bottom button slot as
`SendWizardRecipient` uses it. Shared primitives: `BottomSheetModal`,
`createSignedOutSheetStyles`, `AppButton`, `readDeeplinkFromNfc`. States: entry
shown or hidden by NFC support; reading (iOS system sheet, Android status with
Cancel); cancelled; failed; wallet-backup card; card without a Verus link;
success into the request flow. Deviation: `LoadingModal` gets semantic theme
colors so that it follows dark mode. It also serves the onboarding and
wallet-backup wallet setup. The NFC tap screen (NFC-1.9) replaced
`LoadingModal` as the read status surface.

**Tap screen design contract (NFC-1.9–1.11):** Scope is the status screen of
all four NFC operations: claim read (the three entries), wallet backup write
(Settings and request), wallet backup read (restore), and gift card write.
Exemplar: the simple version on the “NFC Tap Moments” page (one contactless
symbol, one line, help only after a failure; symbol at the top on iPhone and
in the middle on Android). Shared primitives: new `NfcTapView` (and
`NfcTapModal` / `NfcTapHost` for full-screen use), `AppButton` at 56 points
with the request-review secondary style, `SafeBottomActionStack`, theme roles
`titleSheet` and `bodySm`, one new token `primaryBackground` (existing values
`#EEF2F8` and `rgba(49, 101, 212, 0.24)`). States: preparing (backup only),
waiting, active, release (Android), done, failed, notice; light and dark;
normal and compact; reduced motion. Deviations: no Cancel while a backup is
prepared, because the encryption blocks the JS thread and a Cancel could not
respond; failures name the cause where the app knows it (“No card found”,
“Card moved too soon”, “NFC is off”), not only “Card moved too soon”.

Tasks:

- [x] **NFC-1.1** Record GR3-B10 and this plan.
- [x] **NFC-1.2** Shared read action: plain prompts and messages; no alert
  after a user cancel; a wallet-backup card leads to “Restore from NFC backup”
  when signed out and gets an explanation when signed in; an NFC support check
  for the entries; theme colors for `LoadingModal`.
  Done 2026-10-11. `readDeeplinkUriFromNfc` uses plain wording and returns
  codes for a user cancel (`NFC_READ_CANCELLED`, no alert) and a card without
  a Verus link (`NFC_NO_VERUS_LINK`, “Nothing to claim”); other failures show
  “Card not read”. `isNfcSupported` plus `useNfcSupported` hide the entries.
  `LoadingModal` uses the sheet color, `titleSheet`, and `AppButton`; it was
  white in dark mode before, also in onboarding wallet setup. Found and fixed
  during QA: a read that ended while the status modal still slid in left the
  native modal on screen above the next alert (Redux said closed). The status
  modal now stays at least 500 ms; this also covers a card already at the phone.
  NFC-1.9 replaced the status modal and the alerts with the tap screen; it keeps
  the 500 ms minimum, and a result no longer closes one modal to open another.
- [x] **NFC-1.3** “Get started” row (signed out, no wallets).
  The row shows only when no claim is in progress (`resumePendingDeeplinkId`).
- [x] **NFC-1.4** Other options row (signed out, with wallets). First row.
- [x] **NFC-1.5** Scan button (signed in). Uses the scanner's bottom button
  slot; the no-camera view shows it too. Address-only scanners and callers
  with their own button are unchanged.
- [x] **NFC-1.6** Onboarding QR: a scanned `verus://` link opens as a request,
  not as a seed. Setup closes first, so Cancel returns to Welcome.
- [x] **NFC-1.7** Simulator evidence: the rows and the button in light and dark,
  normal and compact (NFC support stubbed for capture only); the request flow
  from a simulated read; parser, design, and safe-area checks; the existing NFC
  read tests.
- [ ] **NFC-1.8** Physical iPhone with a card, in the GR-3.9 session: each entry
  reads a funded gift card; signed in, “Claim to existing wallet”; signed out
  with wallets, “Claim this card”; no wallets, create a wallet, back it up to
  the card, then claim; cancel; wrong card. Android: emulator UI only (no NFC
  hardware). Tap screen on the phone: the iOS scan sheet text per step, the
  success and error close of the sheet, the haptics, the timing of the check,
  and that the app's security cover does not hide the tap screen while the
  sheet is open.
- [x] **NFC-1.9** NFC tap screen. `walletBackupNfc.js` runs every card
  operation through one runner that reports a phase (waiting, active, done,
  release) and gives errors codes (cancelled, NFC off, timeout, card moved,
  no Verus link, no wallet backup). It sets the iOS scan sheet text (“Hold
  still.”, “Done.”, “Backup written.”) and closes the sheet with an error text
  on a failure. Card checks, overwrite guards, and the Android release hold are
  unchanged. `NfcTapView` draws the symbol (Animated plus SVG, native driver
  for the loops): waves pulse while waiting, a ring turns while active, a green
  check with one ripple when done, a red mark with a shake on failure, an
  orange mark for a notice. Haptics: light on card found (Android), success,
  error, warning. Reduced motion stops the loops, the shake, and the ripple.
  The security cover is not shown while an NFC session is open (iOS makes the
  app inactive under the scan sheet; to confirm on the phone).
- [x] **NFC-1.10** The tap screen in all four operations. Claim read: an
  app-wide host (`state.nfcTap`) replaces the status modal and the alerts;
  results offer Try again, Restore wallet, or Close in the same screen.
  Wallet backup: preparing, the card steps, and the result with its protection
  text and Done or Continue in one view; a failure offers Try again (keeps the
  confirmed options) and Cancel. Restore: the card steps, then the password
  step or the import. Gift card: the card steps, then “Gift card written” with
  Done instead of the system “Success” alert; Cancel after a failure rolls the
  share back without an alert. A user cancel ends without a message everywhere.
- [x] **NFC-1.11** Simulator evidence with an in-app fake NFC chip (installed
  through the debugger, no app code); see the evidence log.

Recorded for later (found in NFC-1 QA; existing claim-flow behavior):

- **GR3-D16** After “Claim submitted” → Done, the delivery step adds a
  “Request complete / No response was sent to the requester” sheet. A gift
  card has no requester, so the second confirmation is noise. Source: the
  claim's Done calls `completeWithDelivery` / `next(..., {autoDeliverOnComplete:
  true})` (since `33eb5624`).
- **GR3-D17** Reading a card whose claim is still unconfirmed shows “Pending
  claim transaction / Retry when your connection is available”. The broadcast
  worked (the transaction was in the mempool), so the connection hint is wrong.
  Seen again in the tap screen QA after “Backup written” → Continue on the
  same, already claimed test link.

Recorded for later (found in the tap screen QA; existing behavior):

- **NFC-D1** Android keeps the card session open for 5 seconds after a success
  (`NFC_POST_WRITE_ANDROID_HOLD_MS`, so that the phone does not read the card
  again). The check therefore stays 5 seconds before the claim or restore
  screen opens. Option: open the next screen during the hold.
- **NFC-D2** Back from the restore setup step returns to the NFC step, which
  starts a new read by itself (`autoStart` on mount). On iPhone the scan sheet
  opens again.
- **NFC-D3** After the signed-out unlock in a wallet-backup request, the
  request starts again and shows “Claim this card” a second time.
- **NFC-D4** The restore start screen (“Import using NFC”, Paper button) is
  legacy UI; only its scan states use the tap screen.

**Acceptance:** From each of the three entries, a funded gift card on an NFC
card opens the claim flow on a physical iPhone, and the funds arrive. Cancel
and wrong-card cases show no technical text. Devices without NFC show no entry.

### NFC gift choice C — Add-on (2026-11-09)

Scope: replace C1 only when a wallet on the request's network exists on this
phone. Exemplar: approved `r1-c-add-on.dc.html` and its checked/unchecked
captures at 390×844. Reuse the shared V2 box, selection-row styles, onboarding
title/compact roles, semantic theme colors, and `SafeBottomActionStack`.
The checkbox starts the row and keeps success fill when checked. The step list
uses 32-point circles and 18-point Lucide glyphs with 1.8 stroke. Normal gap is
40 points; compact gap is 32. Claim, write, password and overwrite mechanics stay.

- [x] Replace the two choices with the optional backup checkbox, dependent
  unlock/switch, backup and claim steps, and the two primary action labels.
- [x] Keep selection in request passthrough through remount and cancelled unlock.
  Keep it separate from the resume flag. New scans reset both.
- [x] Return header Back and Android Back from gift backup options to the
  checked choice. Preserve Close, Cancel, no-wallet and Settings backup Back.
- [x] Run Babel, design, safe-area, whitespace and controlled component checks.
  Inspect source-derived light/dark normal/compact fixtures.
- [ ] Orchestrator Android QA: both phone sizes, light/dark, loading, checkbox,
  unlock cancel/success, switch wallet, matching wallet, busy actions, Back,
  fresh scan and the unchanged password prompt. Native text, focus, TalkBack
  and NFC hardware remain outside this implementation's evidence.
  Large Android phone passed 2026-11-09 on `22db722c` (owner scope: large phone
  only): light/dark, checkbox, unlock cancel/success, Back, backup and claim,
  claim only and fresh scan. Small phone, switch wallet and TalkBack not run.
- [x] Owner follow-up 2026-11-10: the no-wallet first screen shows the same
  step list (create, back up to card or phrase, claim). A complete scan with
  no claim and no unspent output titles the card "No funds found on this card".
- [x] Owner follow-up 2026-11-10 (phone test): a card with several assets
  names a count in the title and lists each currency and VerusID below it.
  When the box adds the backup step, the other steps move first, then the
  step fades in. Unchecking removes it at once (an exit fade blanked Android).
- [x] Owner follow-up 2026-11-10: on the claim review with one chain, the
  receiving address and fee continue the balance or VerusID list. The empty
  row between two lines is gone.
- [x] Owner follow-up 2026-11-10: the claim review drops the chain label and
  the count line ("2 balances") above several balances or VerusIDs; the list
  follows the subtitle. List labels show only when balances and VerusIDs both
  show. One balance keeps its large amount.

## SH-1 — Consistent sheet presentation and dismissal

**Finding:** Many transfer and VerusID sheets use the shared shell but explicitly
set `floating={false}` and duplicate their headers, rows, actions, and overflow
handling. Some clear visible content or navigate before the shell finishes closing.

- [x] **SH-1.1** Inventory active consumers in TX-1, RX-1, and ID-1. Classify each
  as selection, information, compact form, blocking processing, or a full task.
  Record intentional exceptions rather than applying one height to everything.
- [x] **SH-1.2** Compare the running identity selector and transfer card picker
  with proposed consumers at matching size/theme. Use DESIGN.md as authority.
- [x] **SH-1.3** Reuse or minimally extract a shared selection composition from
  the approved pattern. Preserve transfer-specific balance, network, route, and
  address information; do not force it into identity-specific data structures.
- [x] **SH-1.4** Reuse the information scaffold for fee and supported-chain details.
  If its DeepLink location obstructs reuse, extract the smallest shared component
  while preserving existing wrappers and behavior.
- [x] **SH-1.5** Standardize floating geometry, semantic selected states, titles,
  action rows, keyboard handling, measured overflow cues, and quiet Done actions
  where appropriate. Preserve explicit exit controls for blocking/nested tasks.
- [x] **SH-1.6** Separate visibility changes from destructive cleanup. Keep
  selected content mounted through closing; use `onClosed` for cleanup/navigation
  that must wait. Check rapid reopen and reduced-motion behavior.
- [x] **SH-1.7** Migrate with a real consumer and verify existing canonical
  consumers immediately. Do not create a broad unused sheet framework.
- [x] **SH-1.8** Complete relevant QA-1 checks and record migrated consumers and
  deliberate exceptions in the evidence log.

**SH-1 inventory and design contract (2026-09-11):**

| Active surface | Classification | SH-1 disposition |
| --- | --- | --- |
| Send/Convert source Card, destination network, route | Selection | Migrated to `SelectionSheet` and semantic selected rows; existing eligibility, balance and route data preserved |
| Send saved addresses and self addresses | Searchable selection / selection | Migrated; address/network filtering preserved; exact address remains available; Address Book navigation deferred until closed |
| Send confirmation fee breakdown | Information | Migrated to `InfoSheet` with unchanged fee data and preflight explanation |
| Receive Card and address choice | Selection | Migrated; Card and address choices are named separately; selection applied after closing |
| Receive supported chains | Information | Migrated to `InfoSheet`, section rows, measured overflow and quiet Done |
| VerusID chooser and Coin Card picker | Specialized selection exemplars | Retain canonical composition; regression checked alongside migrated sheets |
| Address Book edit and manual identity link | Compact form / nested form | Retain existing dedicated keyboard and save/link handling; broader migration belongs to TX-1 / ID-1 |
| Receive payment-request amount/subject/settings/result | Full task | Migrated by RX-1.5 to a full-screen stepped task (`ReceivePaymentRequestFlow`) with `ProgressHeader`, `FadedScrollView` and `SafeBottomActionStack`; the 90% attached sheet is removed |
| VerusID discovery/linking | Nested searchable task | Retain canonical floating 76% sheet and existing post-close manual-link handoff |
| VerusID explanation FAQ | Information with disclosure | Existing floating sheet retained; FAQ consolidation and copy remain ID-1.9 |
| VerusID pending status and unlink confirmation | Action/status and destructive confirmation | Keep explicit guarded exit and action behavior; lifecycle/presentation migration stays with ID-1.3 |
| GenericRequest delivery and Identity Update processing | Blocking processing / stepped task | Preserve existing completion, consent and transaction semantics |

The shared selection composition follows the running identity selector's floating
shell, 18-point row radius, 16-point row inset, 4-point row spacing and semantic
success selection. `SelectionRow` uses a 56-point minimum and grows for balances,
network/route details, complete addresses, and text scaling. Titles use the shared
20/26 role; task rows use the canonical 62-point minimum. The searchable
saved-address sheet fills the 76% shell to keep loading, empty,
error and loaded states stable. With the Android keyboard open, it uses 90% of
the remaining height and moves the management action into the scroll content so
one complete address remains legible; Android uses native modal resizing. The
fade gives way to the native scroll indicator below a 128-point viewport. Other short
choices retain their intrinsic height. The information scaffold
and rows moved to `InfoSheet` / `InfoSheetSection`, retaining the DeepLink exports
as compatibility wrappers. `SheetScrollView` supplies the existing measured fade
and chevron to both families. Simple sheets dismiss by outside tap/system back;
information sheets also have the quiet 56-point Done action.

Visibility is separate from pending source/target/Card content. `useSheetDismissal`
queues one choice or navigation callback for `onClosed`, cancels it on a rapid
reopen, and dismisses the keyboard. Existing shell animation and reduced-motion
behavior remain authoritative. No signing, preflight, transaction, invoice, or
identity-management capability is changed.

**Acceptance:** Migrated sheets feel like the same component family and preserve
their task-specific information. No blank/reset flash or competing navigation
occurs during dismissal. Canonical consumers retain their existing behavior.

## TX-1 — Current Send and Convert wizard

- [x] **TX-1.RECEIVE-IMPACT-ROW** Owner-approved 2026-11-13: percent-only Price
  impact wording, option B pinned received-asset block, and option A invoice
  slippage presets. Preserve the fiat toggle, route rules and invoice encoding.
- [ ] **TX-1.RECEIVE-IMPACT-ROW-QA** Separate device task: iOS normal/SE and
  Android normal/360dp, both themes. Check empty/loading/estimate/pre-launch,
  long names and large amounts, real/missing received-asset prices, compact
  keypad fit with the fiat toggle, sheet Back/reopen, presets/custom validation,
  conversions off, and generated invoice amounts. No device ran in this task.
- [x] **TX-1.CONFIRM-TOTAL** Owner-approved 2026-11-13 (T1): an export's Total
  sits above the slide on every window size, quiet on a normal payment and
  large with the notice "The fees are higher than the amount." when the fees
  exceed the amount. Bridge fee, Network fee and Total show money values. The
  receive node gets a money value for a target outside the wallet. Small
  windows use compact pay and receive nodes.

- [x] **SLIDE-1** Replace irreversible commit controls with `SlideToConfirm` in
  Send/Convert, invoice payment, gift card funding, high-risk app encryption,
  external VerusID updates, and VerusID registration and management.
- [x] **SLIDE-1.DEFERRED-CANCEL** Re-check the gesture epoch before the deferred
  handler runs. Prevented Back cancels the old commit and permits a fresh slide.
- [ ] **SLIDE-1.QA** Check native light/dark, normal/compact, cancellation,
  accessibility activation, retry, and gift card funding with the keyboard open.
  Device QA belongs to the later machine round.
- [x] **TX-1.LONG-PRESS-COPY** Add exact-value long-press copy to Confirm,
  Sent and history details through `useCopyFeedback`. Keep existing copy icons,
  tap actions, hidden balances and row geometry. No new Confirm icons.
- [ ] **TX-1.LONG-PRESS-COPY-QA** Device owners: check all four flows in both
  themes and sizes, including full precision, both VerusID lines, fees, invoice
  rows, repeated copy, scroll cancellation, fee tap, Back and sheet reopen.
  Implementation checks are recorded in the 2026-11-12 evidence row.

- [x] **TX-1.ADDRESS-CHOOSER** Use "Choose an address" with no instructional
  subtitle in Send, Convert, Receive, invoice payment, and the asset-screen
  selector. Align related search, empty-state and accessibility copy. Show
  no source counts in lists (owner, 2026-11-12); retain gift-card and NFC-card
  terminology. Single-network choosers have no group title; multiple networks
  keep titled groups. Design, safe-area and Babel parse checks pass (2026-11-12).
  ESLint is blocked by its import plugin; visual QA belongs to the orchestrator.
- [x] **TX-1.ADDRESS-CHOOSER-QA** Check the production chooser components in
  light/dark, normal/compact iOS component fixtures, including selection,
  dismissal/reopen, unavailable private sources, search and empty states.
  Evidence: `docs/qa/address-chooser-20261030/QA.local.md`. Android, real-wallet
  journeys, and full assistive-technology checks remain unverified.

- [x] **TX-1.INPUTS** Implement the owner-approved compact neutral field
  treatment in `AppTextInput` and shared address entry, with Send, Address
  Book, manual VerusID, recovery and asset-identifier consumers.
- [x] **TX-1.INPUTS-QA** Check light/dark normal and compact native states:
  empty, focus, Paste/Clear, raw-address idle/edit/Back, names, errors,
  password eye, search Clear, memo growth, scanner Back, and saved full value.
  Native component fixtures pass on iPhone 17 Pro, iPhone SE and Android
  360x640. Production signed-out name/password controls also pass on iOS.
  Keep live camera decoding and authenticated behavior separate from fixtures.
  Evidence: `docs/qa/compact-inputs/QA.local.md` and `gallery.local.html`.

**Sources:**
[SendWizardNavigator](src/containers/SendWizard/SendWizardNavigator.js),
[SendWizardHeader](src/containers/SendWizard/components/SendWizardHeader.js),
[WizardUI](src/containers/SendWizard/components/WizardUI.js),
[SelectionSheets](src/containers/SendWizard/components/SelectionSheets.js),
[AddressBookSheet](src/containers/SendWizard/components/AddressBookSheet.js),
[SelfAddressSheet](src/containers/SendWizard/components/SelfAddressSheet.js),
[SendWizardConfirm](src/containers/SendWizard/SendWizardConfirm.js),
[SendWizardContext](src/containers/SendWizard/SendWizardContext.js).

- [x] **TX-1.BATCH5** Night-run 2 small-screen fixes, second send from own
  unconfirmed change, unlock time limits, paid sign-in response at broadcast
  with one result, "Request not valid", plus QA follow-ups S7/S8 (2026-10-27).
- [x] **TX-1.BATCH5-QA** iPhone SE and Android 360x640 (one device at a time):
  layout, request and unlock checks pass; second sends verified on chain
  (three chained unconfirmed sends in one mempool; token change spent while
  unconfirmed; unconfirmed incoming funds not spent). Not checked: Android
  app-encryption identity row (wallet has no Z secret), revoke/recover result
  on device, Face ID unlock.
- [x] **TX-1.BATCH4** Night-run batch 4 and owner items A (Confirm From row,
  resolved VerusID recipient, hold hint), B (sign-in result sheet, review says
  what the requester receives) and C (login remembers the network, private
  testnet pill), plus QA follow-ups S5/S6 (Convert hint, "N/A" in asset lists,
  fee loading said once, app-encryption result title) (2026-10-27).
- [x] **TX-1.BATCH4-QA** iPhone 17 Pro, iPhone SE and Android 360x640, light
  and dark: 21 checks plus 4 follow-up checks pass. Not reachable: Private card
  From row, address skeleton, priced zero balance.
- [x] **TX-1.BATCH3** Remove the identity-update subtitle, reveal the selected
  display currency on opening, clear revoke/recover import secrets on return
  or route removal, and show "None" for zero or negative price impact in Send
  and invoice mode. Stand-alone Amount and Pay with chips use "Details" for
  unknown or non-positive impact. Record the owner-approved rule in DESIGN.md
  (2026-10-27).
- [x] **TX-1.BATCH3-QA** Orchestrator: review the candidate and check iOS/Android,
  light/dark, normal and compact sizes. Check identity-update source selection,
  fee loading/error and Back without the subtitle shift; currency selection at
  the start, middle and end, search/no results/clear/reopen without autofocus;
  revoke and recover import/Back/re-entry/exit with custom text, phrase, QR
  and NFC; Send and invoice Difference at/better than market, small positive
  impact and the 0.1/1/5% boundaries. No new chip for zero or negative impact.

- [x] **TX-1.BATCH2** Apply the scoped night-run fixes for asset-card pending
  text, display-currency keyboard handling, small price losses, revoke/recover
  network filtering, self-send result copy, and identity-update source copy.
  Correct DESIGN.md's invoice-tag statement. Keep balance totals and polling.
- [ ] **TX-1.BATCH2-QA** Orchestrator: check iOS/Android, light/dark, normal
  and compact sizes. Check incoming/outgoing pending totals, hidden balances and
  private sync; currency search with the keyboard, no results, selection and
  reopen; small price differences; both network lists in revoke and recover;
  self-send versus external/conversion/bridge results; identity-update source
  selection, fee loading/error and Back. Leave Home idle through one full
  balance cycle after an asset arrives, then check Review/dismiss persistence.

- [ ] **TX-1.1** Confirm entry from Wallet and Asset detail in Send and Convert
  modes, including preselected Asset/Card and unavailable source states.
- [ ] **TX-1.2** Adopt `ProgressHeader` and the approved signed-in wizard
  composition. Preserve correct progress when steps are skipped. Expose one
  clear exit on initial/result states; retain necessary back navigation elsewhere.
- [x] **TX-1.HEADER-TITLE** Move Send/Convert step titles into the header,
  centered between back and close in `titleSheet`. Remove large content titles
  and repeated helper copy. Keep Amount context and missing-selection messages.
  Use a 24-point content top inset on normal and compact devices.
- [ ] **TX-1.HEADER-TITLE-QA** Orchestrator: verify all five titles in Android
  and iOS light/dark, including 360dp Android and 375pt iPhone SE. Check title
  fit, Back/close/progress, missing-selection states, and Amount/Recipient
  keyboard errors scrolling into view. TX-1.8/TX-1.9 remain open.
- [x] **TX-1.CONTEXT-BAND** Replace the Amount context line with a context band
  under the Send/Convert header on Amount and Recipient (owner-approved option C,
  2026-10-17). Contract: `DESIGN.md`, Stepped tasks. No band on Confirm/Success.
- [ ] **TX-1.CONTEXT-BAND-QA** Orchestrator: verify the band on Android and iOS in
  light/dark, 360dp Android and 375pt iPhone SE, with long names, Send to another
  chain on Recipient, keyboard open, and large text.
- [x] **TX-1.NETWORK-GROUPS** Group the Send/Convert network sheet into "Same
  network" (always first) and "Other networks". Plain network names, no "· Same
  network" suffix (owner-approved option 1, 2026-10-18). Contract: `DESIGN.md`.
- [x] **TX-1.AMOUNT-IMPACT** Replace the Amount estimate card with a flat estimate:
  price caption, market price row, and price impact in money with a warning or
  danger `StatusBadge` and a verified "Use <N> instead" suggestion (owner-approved
  option C "say it in money", 2026-10-18). Remove "Enter amount to see estimate".
  Wording approved 2026-10-19: no minus signs, "<money> less than the market price",
  badge "x.x% less", money in the display currency when a price exists and
  otherwise in the received asset.
- [x] **TX-1.VIA-ROW** Show a "Via" row on Amount only when the conversion can take
  more than one basket; best price chosen and labelled "Best price"; "Convert via"
  sheet lists baskets best first with "x.xx% less" for the others. No "Same
  network" on Amount (owner-approved 2026-10-19).
- [x] **TX-1.RECIPIENT-ROWS** Turn the Recipient quick cards into flat rows and
  drop the helper line (owner-approved option A, 2026-10-18).
- [x] **TX-1.CONFIRM-SENT-SPINE** Draw Confirm and Sent as a pay and receive
  spine with a flat fact list and a "Transaction details" sheet (owner-approved
  option B, 2026-10-18).
- [x] **TX-1.AMOUNT-PIN** Pin the Amount estimate (receive row, money line, badge,
  suggestion, Via row) above Continue so it is never below the fold with the keypad
  open, with a compact variant on windows of 667 points or less (owner-approved
  "pin it", 2026-10-19).
- [x] **TX-1.POLISH-3** Owner feedback of 2026-10-19: show "Bridge.vETH" in full, no
  progress bar on Sent, drop the fee sheet subtitle, a better loading state between
  Recipient and Confirm (Confirm skeleton that mirrors the review, button "Preparing…"),
  Confirm notices above Hold, Sent compact on short screens, hide the unit chip without a
  fiat price, route on its own line in the Confirm connector.
- [x] **TX-1.DECLUTTER-CONFIRM-SENT** Owner feedback of 2026-10-19 (second pass): show the
  recipient once on Confirm, no "More details" row, no "centrally controlled currency"
  notice, no header on Sent, no "To" or "Arrives" row on Sent.
- [x] **TX-1.AMOUNT-DECLUTTER** Build owner-approved A2: one pinned receive
  line and a percent chip when impact is at least 0.1%, there is more than one
  basket, or an Ethereum fee needs a quote or has a result. "Price and route"
  holds price, basket choices, fee, and suggestion. Its compact layout now
  follows TX-1.PRICE-ROUTE-DENSE below. Owner chose A2 on 2026-10-19;
  orchestrator device QA remains open.
- [x] **TX-1.PRICE-ROUTE-DENSE** Implement owner-approved variation A:
  basket choices first; no explanatory sentence or section titles; 48-point
  basket, 40-point single-line fact, and 52-point suggestion rows. Only the
  basket list scrolls with the shared cue. Facts and Done stay fixed. Done
  follows the shared small-device rule. Suggestions start from 1% impact:
  WARNING aims to halve impact; DANGER keeps the 3% target. Retain debounce,
  real candidate quotes, and measured lower-impact gating. Device QA pending.
- [x] **TX-1.SMALL-BUTTONS-KEYBOARD** Owner request, 2026-10-19: primary and
  secondary actions use 44 points on windows of 667 points or less, with at
  least 48-point touch targets; wizard footer top padding is 8 points. Use
  neutral Price and route copy. Android Amount and Recipient avoid the keyboard
  from a stable outer layout frame; iOS keeps padding avoidance and the header
  offset. Button rules and voice are recorded in `DESIGN.md`.
- [ ] **TX-1.SMALL-BUTTONS-KEYBOARD-QA** Testers: verify Android 360x640,
  iPhone SE 375x667, and a normal phone in both themes. Check primary/secondary,
  text/tonal, sheet Done, Hold, onboarding, Amount/Recipient errors and Back.
  Repeat sheet-close/refocus at least 20 times on Android. Measure remaining
  Available/MAX clipping with the wrapped pinned receive line and keypad open.
- [ ] **TX-1.UX2-QA** Orchestrator: see the 2026-10-18 and 2026-10-19 evidence rows for
  what was rendered (iOS, Android, iPhone SE 375pt and Android 360dp). Still open:
  large text, fiat money text (no VRSCTEST price on the private chain), Send to
  another chain on Confirm when the Ethereum fee is affordable, long recipient
  names, and the small-device defects listed in the 2026-10-19 pin row.
- [ ] **TX-1.FEE-CHOICE** Owner-approved variation A, 2026-10-20: plain
  ETH/ERC-20 and BTC Network fee choice on Confirm, Slow/Normal/Fast and a
  nested Custom fee form. Use likely Ethereum fees for display and the confirmed
  maximum for safety; BTC uses validated per-byte rates. Bridge/conversion,
  Verus, fixed-fee coins, legacy sends and Sent keep their existing behavior.
  Implementation on `claude/fee-choice`; keep open until orchestrator device QA
  on Sepolia ETH/ERC-20, BTC, iPhone SE, Android 360dp, both themes and keyboard.
  F7/F8 follow-up: computed fee fallback and field-specific Custom errors are
  implemented. Local checks pass; the new device checks remain open.
  D1/D2 follow-up: Custom pins its warning and summary above the action, reveals
  the focused field, and protects tier subtitle width. SE device QA stays open.
  High-fee follow-up: Custom warns above twice Fast's effective gas price or
  sat/vB rate. Local checks pass; orchestrator device QA stays open.
  D3 follow-up replaces the pinned warning and summary with scroll content;
  only Use this fee stays fixed. Focus and content changes reveal Priority.
  Source layout and required checks pass; new device QA stays open.
  Device QA 2026-10-21 (iOS 402pt and iPhone SE, Sepolia ETH, both themes,
  keyboard) passes, including 4 real sends. Still open: ERC-20 (no Sepolia
  token), BTC (no testnet coin; owner deferred) and Android 360dp.
- [x] **TX-1.HISTORY-PROCEEDS** (withdrawn by the owner, 2026-10-19) Label
  conversion proceeds in the Verus history list and the transaction sheet. It read
  "Converted from X" for a received import from the wallet's own system. The
  "Convert to X" label on the sending row (2026-10-17) went in the same decision.
  History rows no longer recognise conversions; see TX-1.HISTORY-NEUTRAL.
- [x] **TX-1.HISTORY-NEUTRAL** Use a neutral history row on the Coin Overview
  (owner-approved option A, 2026-10-19): one gray direction mark, green only on an
  incoming amount, Pending as the status badge in place of the date. Contract:
  `DESIGN.md`, Transaction history row.
- [x] **TX-1.TX-DETAIL-SHEET** Replace the legacy `TxDetailsModal` with
  `TransactionDetailsSheet` (gap 1 of the 2026-10-20 audit; owner asked to build it
  on 2026-10-21). Contract: `DESIGN.md`, Transaction details. Android QA stays open.
- [x] **TX-1.SCAN-SEND** Open Send from scanned payment QR codes (gap 2 of the
  2026-10-20 audit; owner chose option A and the shared Confirm on 2026-10-21).
  Contract: `DESIGN.md`, Scanned payments and VerusPay invoices. Android QA open.
- [x] **TX-1.INVOICE-PAY** Pay VerusPay invoices through Pay with, Confirm and
  Sent, with the payer's payment slip (owner chose slip variation 2 on
  2026-10-21). Signed, two-card, any-amount and Android checks stay open.
- [x] **TX-1.INVOICE-PRICE** Signed slip names the VerusID larger with no badge;
  Pay with shows one row per currency with Send's price impact chip ("x% more")
  and "Price and route"; Send and invoice Confirm drop "via" from the price line
  and open "Price and route" from Price impact (owner approved 2026-10-22).
  Warning and danger levels with real data, two cards and Android stay open.
- [ ] **TX-1.PRIVATE-SEND** Private (z) card sends in SendWizard (gap 7 of the
  2026-10-20 audit): private recipients and "name@:private", the Memo row and
  sheet, the sync block, the confirmed balance and the transparent-address
  notice (owner approved memo option A, sync option 1 and the notice on
  2026-10-22). Contract: `DESIGN.md`, Private card sends. QA on the public
  testnet; the private testnet turns the private card off.
- [ ] **TX-1.PRECONVERT** Pre-conversions: a "Pre-launch" section in Convert
  to, Amount without an estimate, Confirm with the launch facts, the refund
  line and the cannot-cancel notice, Sent with the arrival, and the wallet
  screens after a pre-conversion (Home row, pre-launch asset screen, "Pre-convert
  more"). Owner chose mockup A with C's wallet screens on 2026-10-23. Contract:
  `DESIGN.md`, Pre-conversions. A real broadcast waits for the public testnet
  to allow reserve transfers again.
- [x] **TX-1.ASSET-ROW-SIZES** The "Receive assets" list, Select asset in Send
  and Convert, and Convert to use the wallet (Home) row sizes (owner,
  2026-10-24). Contract: `DESIGN.md`, Lists, forms, and settings. Android
  stays open.
- [x] **TX-1.CONVERT-GROUP-LABELS** The Convert to group titles stay in
  capitals and drop from 14/19 to `labelSm` (13/18) (owner, 2026-10-24).
  Contract: `DESIGN.md`, Lists, forms, and settings. Android stays open.
- [x] **TX-1.SEARCH-MIN-ITEMS** The Receive assets list, Select asset and
  Convert to show the search field only from 7 items in the whole list
  (`APP_SEARCH_MIN_ITEMS`; owner, 2026-10-24). Contract: `DESIGN.md`, Lists,
  forms, and settings. Android and a real 7-item wallet stay open.
- [x] **SV-1.TICKET-SHAPE** The gift card and the payment slips share one
  outline (20-point corners, round notches), the amount size (38 points on
  narrow or short windows) and a 20-point unit (owner, 2026-10-22).
- [x] **SV-1.LIST-ROWS** The gift card list uses option C of the list mockup:
  68-point rows with the gift icon and no tile, Not funded rows without the
  "No contents yet" line, and claimed cards last under "Claimed" as one quiet
  line without a badge (owner, 2026-10-26). Contract: `DESIGN.md`, Lists,
  forms, and settings. Android stays open.
- [x] **TX-1.ASSET-PENDING** The asset screen and its "Choose a card" sheet show
  each card's total, the same as Home, and a card with funds that still confirm
  adds one line ("+0.05 VRSCTEST pending"); owner chose mockup A on 2026-10-22.
  Contract: `DESIGN.md`, Asset screen balances. A Bitcoin card, an outgoing
  send and Android stay open.
- [x] **AL-1.RECOVERY-QR** Recovery secrets and revealed private keys get a QR
  action next to Copy that opens a QR sheet (owner request, 2026-10-22).
- [x] **AL-1.DEAD-SETTINGS** General drops "Max. display TXs" (unread since 2020)
  and "Add toggle button for QR scanner" (read only by the old Send screen),
  owner decision 2026-10-22.
- [x] **AL-1.REMOVE-WYRE** Wyre stopped operating. Security & recovery drops the
  "Deprecated services" Wyre row, Manage assets never offers Wyre assets, and a
  Wyre asset added earlier says "Wyre is no longer available. Remove this asset
  in Manage assets." (owner decision 2026-10-23; replaces the 2026-10-22 choice
  to keep the row). The Wyre plumbing stays for the dead-code task.
- [x] **AL-1.ASSET-DETAILS-DONE** The Manage assets details sheet gets the
  pinned Done of the information sheet: `InfoSheet` takes a `header` slot for
  the logo header, the rows and "Remove from wallet" scroll above Done (owner,
  2026-10-23). Android stays open.
- [x] **AL-1.MANAGE-SEARCH-MIN** Manage assets hides the search field and the
  All / On Home / Hidden tabs below 7 assets (`APP_SEARCH_MIN_ITEMS`); the count
  includes "New assets found" (owner, 2026-10-24). Add asset keeps its field.
  Android stays open.
- [x] **AL-1.SEARCH-MIN-SHEETS** The Choose a card sheet (field, type chips and
  chain chips), Link VerusID, Saved addresses in Send, Choose currencies for a
  gift card, the Address book screen and Pay with show their search field only
  from 7 items (`APP_SEARCH_MIN_ITEMS`). When the controls hide, the search text
  and the filters reset, on these lists and on Manage assets. No space stays
  reserved for a hidden field (owner, 2026-10-24). Contract: `DESIGN.md`, Lists,
  forms, and settings. Android and a real "Pay with" run stay open.
- [x] **AL-1.CARD-SHEET-TIDY** Choose a card and Choose currencies drop their
  count line and repeated network text; a gift currency amount drops the
  ticker; below 7 items both sheets grow past 76% when needed, so 6 rows fit
  on the iPhone SE (owner, 2026-10-25). Contract: `DESIGN.md`, Lists, forms,
  and settings. A run with real wallet data and Android stay open.
- [x] **AL-1.SYSTEM-POPUPS** The last native `Alert.alert` boxes that the
  redesigned app can still show use the app alert sheet: the Valu Mobile
  question ("Open Valu Mobile" / "Not now"), the start-up server error, three
  unlock edge cases and the key warning (owner, 2026-10-23). The old v1 login
  keeps its boxes; the rest are in unreachable code (AL-1.10). Other error
  messages stay as they are (owner).
- [x] **TX-1.BRIDGED-LINE** A Verus currency whose original lives on Ethereum
  shows "Bridged from Ethereum ›" ("Bridged from Sepolia ›" on testnet) under
  its ticker on the asset screen; it opens an information sheet with Original,
  Contract address and "View in explorer" (owner chose variation C on
  2026-10-23). Home, the card picker, ETH, ERC-20, VRSC and Bridge.vETH do not
  change. Contract: `DESIGN.md`, Bridged asset line. Android stays open.
- [x] **GR-3.CLAIM-ANIMATION** "Claiming funds" shows a small gift card and the
  wallet icon; a coin of the claimed currency arcs from the card into the icon
  every 1.8 s until the broadcast returns, then the card dims and the wallet
  setup check settles on the icon (owner chose animation A on 2026-10-23).
  Reduce Motion: opacity only. Contract: `DESIGN.md`, Claiming funds. Android
  stays open.
- [x] **GR-3.CLAIM-RESULT** The claim result says each fact once: "Claim
  submitted" with the Sent step's check, the amount, Transaction ID, explorer
  and one caption; one block per transaction; "Claim not finished" with the
  real counts, Retry and Close; error titles once (owner approved the copy on
  2026-10-23). Contract: `DESIGN.md`, Request-review hierarchy. Android stays
  open.
- [x] **TX-1.3** Migrate source Card, destination network, and route sheets through
  SH-1. Preserve eligibility, selected values, balances, and route distinctions.
- [x] **TX-1.4** Migrate Address Book and self-address sheets. Retain search,
  network filtering, validation, and clear raw-address presentation.
- [x] **TX-1.5** Move fee breakdown to the shared information pattern. Keep fees,
  conversion estimates, and any uncertainty understandable and accurately labeled.
- [ ] **TX-1.6** Defer selection-triggered navigation and Address Book handoff
  until sheet closure completes. Verify back navigation retains valid form data.
  SH-1 implements the post-close callbacks; authenticated wizard back-navigation
  verification remains open in TX-1.
- [ ] **TX-1.7** Align amount, recipient, confirmation, processing, error, and
  result layouts. Reuse existing search, copy, skeleton, and safe-action controls.
- [x] **TX-1.I16** Exclude confirmed UTXOs spent by a mempool transaction from
  Send/Convert funding. Use fresh pending data, fail closed, and explain a
  resulting insufficient-funds error. Reuse the check for claim/identity funding.
- [ ] **TX-1.I16-QA** Orchestrator: verify two sends from the same address before
  confirmation, including the pending-balance message and retry after a block.
- [x] **TX-1.A33** Resolve token-only mempool spends from fresh verbose raw
  transaction inputs. Fetch each distinct spending transaction once. Keep the
  shared claim/gift-card check, fail-safe error, and pending-balance copy.
- [ ] **TX-1.A33-QA** Orchestrator: verify a pending USD send followed by a
  conversion, then retry after confirmation. Check the pending-balance message
  when the remaining unspent funds cannot fund the transaction.
- [x] **TX-1.I18** After a successful same-system VRPC conversion to the source
  Card's own address, activate the received currency through Manage assets.
  Share review's own-address check. Preserve Hidden choices and active assets.
  Keep metadata/storage work off the Success navigation path.
- [ ] **TX-1.I18-QA** Orchestrator: convert to an inactive USD/KMD/VRSC-USD
  asset on private Testnet. Check Home before and after settlement and restart.
  Check Hidden, already-active, other-recipient, export, and add-failure cases.
- [ ] **TX-1.8** Verify relevant direct send, conversion, cross-chain destination,
  no eligible route, insufficient funds, fee/preflight failure, processing, and
  result states. Preserve all Card/channel and transaction constraints.
- [ ] **TX-1.9** Complete relevant QA-1 checks and record delivery evidence.
- [x] **TX-1.A25-I26** Quote Ethereum export fees on Amount with the existing
  validated, zero-amount daemon simulation. Show one estimate row, skeleton,
  or unavailable value. Check amount plus source-currency fee before Continue.
  Reserve the fee for MAX. Keep Confirm's validated fee rows and final preflight.
- [ ] **TX-1.A25-I26-QA** Orchestrator: inspect fee loading/value/unavailable,
  insufficient funds, MAX, fiat MAX, route/amount changes, and Back from review
  on private Testnet. Check Android/iOS, light/dark, and normal/compact sizes.
- [x] **TX-1.A19** Clear prepared wizard steps after broadcast. Block a later
  submit with the existing context result and a synchronous success latch.
  Route Success hardware Back through Done (reset to Wallet home, unchanged);
  header Close keeps the shared exit to the opener. Keep the existing disabled inner swipe and hidden result back arrow.
- [ ] **TX-1.A19-QA** Orchestrator: verify Success exits on Android and iOS,
  including Back/swipe, Close, Done, and normal entry for a new send. Include
  direct send, conversion, and cross-chain paths when available.

- [x] **TX-1.REVIEW-SUCCESS** Fix A-5/I-7 fee-aware source balance, I-8
  visible amount reduction, A-6 complete fee text, A-7/I-12 scrollable Success
  and Android txid ellipsis, and I-16 explicit rejection copy. Preserve the
  ambiguous-broadcast state and transaction/preflight contracts.
- [ ] **TX-1.REVIEW-SUCCESS-QA** Orchestrator: verify direct send, token send
  with a system-currency fee, conversion, MAX, explicit rejection, unknown
  broadcast status, and Success scrolling/copy in Android/iOS light/dark at
  normal and compact sizes. Verify Back, retry, and Done behavior.

- [x] **TX-1.A21** Classify Ethereum export systems from the currency
  definition's `nativecurrencyid.type` with `DEST_ETH`. Keep explicit `ethdest`
  routes and the existing recipient, self-address, and preflight paths.
- [x] **TX-1.A22** Use the asset portion of an unknown currency's qualified
  name for its fallback ticker. Owner decision, 2026-11-03: network rows and
  their selected target keep the full unknown Verus name ("MKR.vETH"). The
  Ethereum row uses the Ethereum asset name. Other fallback consumers retain
  the asset-portion rule.
- [x] **TX-1.BRIDGE-NAMES** Use per-route Ethereum symbols on network rows
  and the selected target. Native ETH reads "ETH" on both networks. Retain
  Verus currency IDs for routing, logos and prices. Address Book records are
  redesign-only; no released-record migration is required.
- [ ] **TX-1.BRIDGE-NAMES-QA** Check Convert and Send network choices, Amount,
  Price and route, context, Confirm/preparing, Sent and saved-address context
  in light/dark on normal phones and iPhone SE. No device ran in this task.
- [x] **TX-1.BRIDGE-FUNDING** Reduce native sends only to balance minus fees.
  Preserve submitted amount for the Reduced from notice. Expose export bridge
  and parent network fees from the validated preflight that is signed.
- [x] **TX-1.BRIDGE-FEES** Remove fee-versus-amount blocks. Local conversions
  show one light notice only when paid-currency fees exceed the prepared
  amount. VRPC exports show exact Bridge fee, Network fee and Total rows,
  with each paid currency listed once. Amount names the bridge fee. Preparing
  mirrors the rows and keeps the chosen receive name even without an estimate.
  Confirm and Sent omit an old Amount quote after a fee reduction when a fresh
  preflight estimate is unavailable. Confirm retains the estimate-unavailable notice.
- [ ] **TX-1.BRIDGE-FEES-QA** Check affordable small exports, conversion fees
  above/equal/below amount, exact Bridge fee / Network fee / Total rows with
  one or several paid currencies, MAX with a fee rise, plain MAX, errors,
  retry and Back in light/dark on normal phones and iPhone SE.
- [x] **TX-1.I16-A11** Refresh the source balance after a successful broadcast.
  Expire the source system's address-response caches. Include mempool deltas in
  VRPC totals and discovery snapshots. Keep an open wizard's balance current,
  and keep the entry route stable when a send empties its Card.
- [ ] **TX-1.I16-A11-QA** Orchestrator: compare Wallet, Asset detail, and a new
  wizard before confirmation. Repeat the same amount and recipient after a send.
  Check a full-balance send and unavailable-balance retry on iOS and Android.

- [x] **TX-1.A23** Share measured-header keyboard avoidance between Amount and
  Recipient. Keep the existing error message above the safe action footer.
- [x] **TX-1.A9** Reject asset input beyond the source coin's decimal precision
  before the existing amount rounding. Disable Continue and show the inline error.
- [x] **TX-1.A10** Resolve a VerusID name on Continue with the source system's
  existing identity helper. Show checking, not-found, and retry states. Ignore
  late replies after edit or navigation away. Preserve raw-address validation.
- [x] **TX-1.A12** Name the source network in the direct-send Amount subtitle.
- [x] **TX-1.POLISH** Map `bad-txns-inputs-missing` to recovery copy. Subtract
  only source-currency fees for a direct send to the selected channel's source
  address. Keep amount subtraction for conversion and cross-chain transfers.
  Separate review warnings with the shared spacing token. Keep form controls
  and errors in one scroll flow. Hide the save chip on Recipient errors.
  Restore current-step progress when a mounted header regains focus.
- [ ] **TX-1.POLISH-QA** Orchestrator: verify all six fixes on Android and iOS,
  in light/dark and normal/compact layouts. Check Amount and Recipient errors
  with the keyboard open/closed, MAX and save-chip visibility, conversion
  warning spacing, and Back from Confirm. No new device proof exists here.
- [x] **TX-1.A34** Reveal Amount/Recipient errors in the shared scroll layout
  after error and keyboard/viewport changes. Place errors next to their fields;
  retain MAX and secondary controls in normal flow and the safe action footer.
- [ ] **TX-1.A34-QA** Orchestrator: verify precision and bad-address errors
  with the keyboard open/closed on Android/iOS, light/dark, normal/compact.
  Confirm the field, full error, and footer are visible together. Check MAX,
  conversion estimates, error clearing, retry, Back, and keyboard reopening.
- [x] **TX-1.I13** Permit a valid R-address contact across currencies on its
  Verus network. Use the same context filter for the saved count and chooser.
- [ ] **TX-1.AmountRecipient-QA** Orchestrator: inspect Amount and Recipient on
  Android and iOS with the keyboard open/closed, light/dark themes, and normal/
  compact sizes. Check precision errors, identity lookup loading/error/retry,
  Back during lookup, source-network subtitle, and count/chooser agreement.
  No transaction broadcast is needed for these checks.
- [x] **TX-1.HISTORY** Preserve VRPC spend metadata and mempool timestamps.
  Group by transaction ID and prefer confirmed data on snapshot overlap. Label
  a single decoded conversion with its target currency in the existing row and
  detail Type slots. Retain the actual conversion recipient and stable VRPC row
  keys. Preserve net balance amounts and same-transaction import aggregation.
- [ ] **TX-1.HISTORY-QA** Orchestrator: check pending/confirmed history and detail
  opening, including I-21, in light/dark and normal/compact layouts. The local
  fixture does not reproduce the native C6 tap failure. The extra safe-area
  check flags the existing legacy modal `SafeAreaView` import on both the base
  and candidate; this copy-only change retains the modal shell.
- [x] **TX-1.HISTORY-TAP-DETAIL** Add a native no-touch wrapper to the signed-in
  edge fade. Keep the carousel, list, and gradient geometry. Preserve conversion
  currency case and use sheet theme colors for the dark detail header/actions.
- [ ] **TX-1.HISTORY-TAP-DETAIL-QA** Orchestrator: verify the newest row at
  several x positions, above and below the 32-point top fade boundary. Check
  scrolling, return to top, older rows, Card swipes/copy, sheet close/reopen,
  conversion Type, and enabled/disabled Details on iOS/Android in both themes
  and normal/compact sizes. The native interception cause has high source
  confidence; no new native execution ran in this worktree.

**Acceptance:** The active wizard uses the current stepped-task and sheet
patterns without obscuring source/destination networks, route choice, fees, or
recipient. Existing transfer restrictions and state transitions still hold.

## RX-1 — Receive and payment-request creation

**Sources:**
[ReceiveAssetsList](src/containers/Transfer/ReceiveAssetsList.js),
[ReceiveSubwalletSheet](src/containers/Transfer/ReceiveSubwalletSheet.js),
[ReceiveAssetDetails](src/containers/Transfer/ReceiveAssetDetails.js),
[receive.styles](src/containers/Transfer/receive.styles.js).

- [x] **RX-1.1** Trace Wallet/Asset entry, Card selection, address selection,
  supported-chain information, and payment-request generation separately.
- [x] **RX-1.2** Rename the Card selector’s misleading “Choose address” title to
  “Choose a card”. Keep network context visible and show a current selection when
  the invoking flow has one. Preserve the Card-to-address/channel relationship.
- [x] **RX-1.3** Remove duplicate address-selection headings and migrate Card,
  address, and supported-chain sheets through SH-1.
- [x] **RX-1.4** Use consistent identifier typography and shared copy feedback.
  Verify the full copied address and displayed QR belong to the selected Card
  and network; keep address distinctions required by the current channel.
- [x] **RX-1.5** Convert the amount/subject/settings/result payment-request flow
  into a full-screen stepped task with `ProgressHeader` and safe bottom actions.
  Inspect the current field rules before deciding which optional steps can be
  combined. Document any justified alternative before implementing it.
- [x] **RX-1.6** Add proper back navigation that preserves valid inputs. Make
  cancellation/re-entry deliberate; do not reset visible content mid-dismissal.
- [x] **RX-1.7** Preserve request amount, currency, subject, settings, QR encoding,
  and share semantics. Request creation must not be described as receiving money.
- [x] **RX-1.8** Verify empty/loading/error states, one/multiple Cards, applicable
  address types/networks, optional fields, keyboard layouts, back/cancel/reopen,
  generated request decoding, and result display with disposable fixtures.
- [x] **RX-1.9** Complete relevant QA-1 checks and record delivery evidence.

**Implemented design contract and data trace (2026-09-11):** Entry is Wallet →
`ReceiveAssetsList`, or Asset detail → `ReceiveAssetDetails` with
`{coinId, subWalletId}` from `SignedInCoinDetail`. `receiveCardsForCoin` filters
Cards by `WALLET_APP_RECEIVE` and an address channel; `getExplicitAddressRecords`
reads `activeAccount.keys[coinObj.id][card.api_channels[API_GET_ADDRESSES]].addresses`
with labels from `card.address_info`; the Card therefore owns the channel, the
channel owns the address list, and the copied address and receive QR are the same
selected record. Card network copy uses `getSubWalletNetworkLabel`. Supported
chains remain informational (`getSupportedNetworks`). Payment requests stay
separate in `generateReceiveInvoice`. Since 2026-10-24 a VerusPay payment
request is an unsigned `GenericRequest` with one invoice detail (`verus://1/…`),
not the deprecated VerusPay v3 invoice link.

The design contract follows the canonical Gift Card stepped task: `ProgressHeader`,
20-point horizontal / 24-point top / 28-point bottom insets,
`theme.typography.headlineMd` (28/36) step title with a 22-point title-block gap,
one primary `SafeBottomActionStack` action per step, `FadedScrollView` content and
header back. RX-1.5 replaced the 90% attached payment-request sheet with
`ReceivePaymentRequestFlow`: conversion-eligible Cards use amount → optional
subject → conversion settings → result, non-conversion Cards keep amount → result
with the v0 QR and camera-roll save. Subject and settings stay separate steps.
RX-1.4 uses the established platform monospace convention for raw addresses
(`Menlo` on iOS, `monospace` on Android) while human VerusID names keep normal
type, and the details screen offers accurate loading/empty/error states with a
safe exit instead of an empty Card chooser. RX-1.6 keeps step inputs across back,
intercepts system back and removal gestures through `beforeRemove` to match the
header back, invalidates in-flight generation on cancel/unmount/context change,
single-flights creation and QR saving, and binds the result QR, amount, share
message and save source to the generated snapshot. A pending generation is never
a dead end: the header back and an explicit `Cancel` action both invalidate the
generation before leaving, and every QR save completion is bound to the request
and save operation that started it. RX-1.7 preserves the invoice contract,
including the subject being share-message only and not encoded in the modern
VerusPay invoice, and replaces raw RPC/file errors with concise recovery
guidance. No wallet permission, share or save is invoked automatically.

The amount step uses a normal editable `AppTextInput` driven by the system
`decimal-pad` keypad — the same native input and keyboard mechanism as the
slippage field — instead of the custom on-screen numeric keypad, which is
removed. The field keeps the currency beside it, the fiat estimate and the
fiat/coin switch, autofocuses on entry, and preserves the previous plain-decimal
input contract (digits and one locale decimal separator, 18-character ceiling) so
a paste such as `1e5` or `0x10` cannot validate into an unintended invoice. The
rest of the step machine, single-flight generation, save binding, cancel and
back handling are unchanged.

**Acceptance:** Users can distinguish choosing an Asset, a Card, and an address.
Simple choices use consistent sheets. Payment-request creation has understandable
steps, a working back path, and a result accurately tied to its generated data.

## RX-2 — Receive restyle

**Status:** Implemented and device-verified on 2026-10-20 (QR decoding open).
Owner approved 2026-10-20: Receive variation
A ("Calm address") and variation C's paper slip. Keep the current address field;
show the normal address or human VerusID name under the slip QR.

- [x] **RX-2.1** Remove the supported-chain claim and sheet. Show only the
  selected card type and network; open the existing card chooser from this line.
- [x] **RX-2.2** Apply the flat Receive layout, white QR tile, unchanged address
  rows, Share address, and secondary Request amount through the safe footer.
- [x] **RX-2.3** Combine request input into one step. Add Note and Conversions
  compact sheets with the Settings gate and existing slippage validation.
- [x] **RX-2.4** Add the fixed paper slip, compact QR, snapshot estimate and
  receiving address/name. Preserve invoice, share, save and operation guards.
- [x] **RX-2.5** Verify iOS and Android in light/dark, normal/compact sizes:
  keyboard, scroll, long amounts/notes, VerusID, non-conversion cards, copy,
  chooser, share/save failures, Back, cancellation and context changes.
- [ ] **RX-2.6** Compare rendered states with the approved mockups. Decode result
  QRs and verify the saved QR source. Inspect the iOS shadow and Android outline.
- [x] **RX-2.LIST-TITLE** The Receive assets list shows its title in the header
  bar in `titleSheet`, as Select asset does, without the large title (owner,
  2026-10-24). Contract: `DESIGN.md`, Receive and payment request. Android
  stays open.
- [x] **RX-2.CLOSE** Receive has a close button on the right of the header.
  Close leaves Receive and the "Receive assets" list in one tap (owner,
  2026-10-26). Contract: `DESIGN.md`, Receive and payment request. Android
  stays open.
- [x] **RX-2.REQUEST-CLOSE** Request and Request ready have the same close
  button. Close leaves Receive in one tap and cancels a pending request (owner,
  2026-10-26). Contract: `DESIGN.md`, Receive and payment request, and Stepped
  tasks. Android stays open.

**Implementation evidence (2026-10-20):** Uncommitted work in the existing
`receive-restyle` worktree. Shared primitives: `ProgressHeader`, `FlatRow`,
`AppTextInput`, `SettingsSwitchRow`, `BottomSheetModal`, `useSheetDismissal`,
`StatusBadge`, `CopyAction`, `FadedScrollView`, and `SafeBottomActionStack`.
The approved HTML/images were inspected. Design (30 sources), safe-area (10
files), Babel parse (10 files), whitespace, and iOS/Android production bundles
pass. Configured ESLint cannot load `eslint-plugin-import` because
`./lib/util/glob-util` is not exported by ESLint; the isolated undefined/unused
name check passes. Temporary Node component fixtures pass input/result,
snapshot, single-flight, Back, context reset, stale sheet apply, decimal guard,
failure/retry, cancellation, and slippage validation. Source comparisons keep
address rows/styles, the invoice helper, error mapping, and operation handlers
unchanged. These checks do not prove native layout or QR decoding. No Metro
server, simulator, emulator, or live wallet action ran.


**Round-2 Android correction evidence (2026-10-20):** Based on `f624307d` in
`claude/receive-restyle`; changes stay uncommitted. The canonical Address book
Add sheet also hid Cancel behind Gboard. Android native dialogs already use
`adjustResize`; the shared `Modal` added a second, cached-height
`KeyboardAvoidingView`. The original Conversions sheet reproduces the hidden
Done button; switching only the Android wrapper to a flexible `View` resolves
it. iOS retains its padding avoider and offset. No keyboard metrics or timers
were added. Note and Conversions keep the full field and Done visible in light
and dark mode. Done applies values; close/reopen retains them. Invalid 101%
slippage keeps its error and Done visible. The request keypad keeps Create
request visible; a 1.25 VRSCTEST request reaches the result on private Testnet.
Address book passes Label/Address focus, Cancel, and reopen; the disposable
wallet unlock sheet also passes. Other native-sheet consumers were inspected
in source, not run: Coin Card picker, gift currency picker, PasswordCheck,
identity provisioning, GenericRequest identity linking, and Services identity
linking. Embedded sheets keep their existing wrapper.

Android address and VerusID rows disable selectable text so native middle
ellipsis works. Private (78-character z-address) and gETH (42 characters) pass
before/after checks; CopyAction copies the full Private address. The chooser
uses card types, retains a VerusID name, and shows a monospace transparent
address subtitle. Private/Transparent choice, balances, network group, selected
state, and accessibility labels pass on the device in light/dark mode.
Evidence: `/tmp/rx-fix/` (before/after PNGs and `keyboard-probe.log`). Design
contract (30 sources), safe-area (3 JS files), Babel parse (3), whitespace, and
production Android/iOS bundles pass. No Jest tests ran. Private testnet and
slippage editing are restored OFF; system night mode is restored OFF. No
new runtime, reinstall, Metro restart, staging, commit, push, or merge.
This pass does not establish iOS runtime behavior, compact-device behavior,
VerusID device rendering, multiple transparent-card rendering, TalkBack speech,
or native behavior of the six source-only shared consumers.

## ID-1 — VerusID linking, details, and status refinement

**Sources:**
[SignedInVerusIdService](src/containers/Services/ServiceComponents/VerusIdService/SignedInVerusIdService.js),
[SignedInVerusIdDetails](src/containers/Services/ServiceComponents/VerusIdService/SignedInVerusIdDetails.js),
[VerusIdObjectData](src/components/VerusIdObjectData.js),
[LinkExistingVerusIdSheet](src/containers/DeepLink/components/VerusIdIdentityPickerSheet/LinkExistingVerusIdSheet.js),
[LinkIdentityForm](src/components/SendModal/LinkIdentity/LinkIdentityForm/LinkIdentityForm.render.js),
[DeepLinkVerusIdDetailsSheet](src/containers/DeepLink/components/RequestReview/DeepLinkVerusIdDetailsSheet.js).

- [x] **ID-1.1** Trace automatic linking, manual fallback, and request-resume paths
  separately. Automatic discovery already uses the newer component; retain it.
- [x] **ID-1.2** Bring manual input, review, loading, error, and result into the
  current linking experience. Preserve network/ownership checks and the ability
  to inspect the resolved identity before completing any required confirmation.
- [x] **ID-1.3** Migrate pending-status and unlink sheets through SH-1. Make the
  useful refresh/retry action prominent and removal secondary where appropriate.
  Keep unlink distinct from on-chain revocation, deletion, or recovery.
- [x] **ID-1.4** Use `onClosed` for manual-modal handoff, pending selection cleanup,
  and any navigation that requires the sheet to finish closing. Retain error
  contents until dismissal ends and block conflicting actions while processing.
- [x] **ID-1.5** Refine the detail hierarchy: identity name, status, and network
  first; understandable authority/control information; secondary technical data
  progressively disclosed. Preserve important warnings and complete identifiers.
- [x] **ID-1.6** Replace copy-alert interactions in the touched details path with
  `CopyAction`. Account for other users of `VerusIdObjectData` before shared edits.
- [x] **ID-1.7** Remove the unconditional “No attestations linked” assertion unless
  backed by an actual result. Prefer omitting the unsupported section; adding a
  new attestation-loading feature is a separate scope decision.
- [x] **ID-1.8** Use stable loading treatment and readable retry guidance for
  linked-list/detail failures. Ensure a refresh failure is visible even when old
  identity data remains on screen; do not expose raw RPC errors as the main copy.
- [x] **ID-1.9** Consolidate the informational sheet where practical, remove
  repeated copy, use “VerusID” consistently, and label icon-only controls for
  accessibility. Preserve state-aware scrolling and overflow cues.
- [x] **ID-1.10** Verify no identities, several identities, long names, discovery
  empty/error, manual link validation, pending/failed status, details loading/error,
  copy feedback, and unlink cancellation. Verify security-sensitive mutations only
  in the authorized disposable Testnet setup.
- [x] **ID-1.11** Complete relevant QA-1 checks and record delivery evidence.

**Implementation (verified and review-ready; committed as `33865cab` and
locally integrated):** manual entry, validation, identity resolution, the
resolved-identity review, the linking loading state, and the actionable failure
now live inside the shared
`LinkExistingVerusIdSheet` instead of the legacy SendModal link flow. The manual
step reuses the compact-form composition from `AddressBookEditSheet`
(`AppTextInput` plus `SafeBottomActionStack`) and the review reuses
`InfoSheetSection` with the section builder exported from
`DeepLinkVerusIdDetailsSheet`, so both the signed-in VerusID service and the
GenericRequest identity picker share one experience. Resolution stays read-only:
automatic discovery still queries `getIdentitiesWithAddress` with the stored
Redux VRPC R-address, and manual resolution calls `getIdentity` on the sheet's own
chain and matches the result against the wallet's stored VRPC addresses for the
ownership check, so no seed, private key, or signing material is requested.
Active-status, network/system, duplicate-link, and primary-address ownership
checks run in the sheet and remain enforced by the existing parent link paths.
The linked result is the refreshed list entry or request selection that the
existing parent flow already performs, so automatic and manual linking end in the
same place instead of adding a second result surface.
The signed-in service links under a captured session scope and re-asserts it
after each awaited step, so a late completion from another account cannot mark a
link or close a newer sheet.

Pending status and unlink confirmation are now floating shared sheets driven by
`useSheetDismissal`: refresh/retry is primary, removal/unlink is
secondary/destructive, every control disables while processing, cleanup and
selection clearing happen in `onClosed`, request-resume navigation waits for the
status sheet to close, and `goBack` waits for the unlink sheet to close. The
unlink copy states that it only removes the local wallet association and does not
revoke, delete, recover, or change the VerusID on-chain. The signed-in details
screen consumes a new `presentation="signedInDetails"` variant of
`VerusIdObjectData`: the name is the screen title, status/network/identifiers lead
the rows, warnings and authority/control information follow, identity content and
the private address start collapsed, copy uses inline `CopyAction`, refresh
failure stays visible above stale-but-useful data, and the unsupported
“No attestations linked” section is gone. The informational sheet now composes
the shared `InfoSheet` (measured overflow cue included) with one definition line
instead of duplicating the “What is VerusID?” heading.

**Correction (session-bound linking and resumption, follow-up):** the first
candidate passed rendered-source review but failed independent high-risk review,
so the following corrections are part of the committed `33865cab` delivery. The
shared `LinkExistingVerusIdSheet` now captures a real wallet session scope
(account hash plus login epoch) for both automatic discovery and manual lookup,
re-checks it after every await and immediately before it hands a candidate to a
parent, invalidates discovery/resolution/review when the scope changes, and
carries immutable origin metadata on every candidate. The three parents
(`AuthenticationRequestInfo`, `AppEncryptionRequestInfo`,
`SignedInVerusIdService`) revalidate that the candidate's chosen primary
R-address belongs to the currently scoped account's VRPC address array for the
candidate chain in addition to the identity's own primary-address list, so a
candidate resolved for one account can never link into another even when both
share the same first R-address. `processVerusId` gained a backward-compatible
optional guard that is checked after the pending-request storage await and
immediately before every dispatch and navigation; the signed-in service supplies
the captured session plus a synchronous operation token, and both the retry and
READY-row resume paths are single-flight so a stale completion cannot dispatch,
navigate, reopen a fallback sheet, clear a newer operation, or attach an error to
a newer session. The unlink confirmation's queued `goBack` now re-checks the
immutable originating session and route/focus ownership at execution time (the
unlink token is deliberately not used, because `onClosed` bumps it first). A
pending-status sheet that becomes READY now closes so the READY row's guarded
Link action takes over, with truthful "Ready to link" copy if it renders before
closing. The remaining legacy Authentication manual fallback now routes into the
shared manual step with the request network and a prefilled FQN, and the touched
consumers no longer open the legacy SendModal link UI. `IdentityPickerSheet`'s
nested Back transition guards on the synchronous `linkBusyRef` instead of the
React `linkBusy` state so a same-frame Back cannot leave the link step.

**Correction (final lifecycle defects, follow-up):** the same independent
high-risk reviewer rechecked the corrected candidate, closed five findings, and
returned two reproduced P2 lifecycle defects, now corrected. First, the unlink
confirmation's delayed callback validated against `renderedSessionScopeRef`
(rewritten on every render), so after an account/session change the old callback
could validate against the new session and call `goBack`. The callback now
carries the immutable `requestContext.sessionScope` captured when the unlink
started, alongside the unchanged mounted, focused-route, and route-key checks;
the unlink token is still deliberately unused because `onClosed` bumps it first.
Second, the READY-resume single-flight flag was cleared only by the old
promise's `finally`, so an unresolved run left the component rejecting every
later READY action. `createVerusIdResumeOwner` in `verusIdFlowGuards.js` now
binds the in-flight flag and token to the owning session scope: an account-hash
or session-epoch change invalidates the old token and releases the gate
synchronously, while a stale `catch`/`finally` cannot reopen a fallback, attach
an error, navigate, or clear a newer run's gate. Both defects are covered by the
real queued-callback and handler behavior with deferred promises, each confirmed
to fail when its fix is reverted by mutation.

**Final verification (iOS fixture, rendered and native):** the committed final
candidate `33865cab` was compiled into a task-owned iOS release fixture bundle
from the actual candidate (26 assets) and exercised with synthetic disposable
VRSCTEST states on a normal 402x874 simulator and a compact iPhone SE, in light
and dark. Covered:
no identities, several identities, long names, discovery loading/empty/error, the
always-reachable manual fallback, manual validation/lookup/resolved review/
failure, processing single-flight with blocked dismissal/Back, pending
error/progress/READY actions, details loading/error/long values, separate
accessible `CopyAction` nodes with copied feedback, unlink cancellation/failure,
and the rebuilt final details spot check. Native QA found a manual-row clipping,
corrected before the final capture. The same and only independent Astra
high-risk reviewer returned READY with all original and follow-up findings
closed, against a complete before/after state guard (1,702 files, no exclusions,
identical). Parent-owned visual QA applied the canonical SH-1/onboarding
patterns at normal/compact and light/dark; because the user required exactly one
independent reviewer, no second design-adviser reviewer was added, and the
single reviewer explicitly applied `max-product-design-taste` while reviewing
the final renders. Proof limits: fixture data and API are synthetic and cannot
sign, spend, move funds, expose a real key, or prove live RPC or
authenticated-wallet behavior, and callback or session authentication is not
transaction or settlement proof; native proof is iOS only. Android runtime, full
VoiceOver/TalkBack, exhaustive text scaling/reduced motion, and authenticated
disposable-wallet mutation remain explicitly unverified follow-up, not implied
passes. Node was 22.18.0 because the requested 22.23.2 was unavailable; checks
used the canonical sibling `node_modules`, and no source depends on it.

**Acceptance:** Automatic and manual paths form one coherent experience. Details
and status are concise and truthful. Copy feedback is unobtrusive. Unlinking is
understandable and remains distinct from changes to the identity on-chain.

## ID-2 — VerusID list and page (light card, content v1, funds)

**Sources:**
[SignedInVerusIdService](src/containers/Services/ServiceComponents/VerusIdService/SignedInVerusIdService.js),
[SignedInVerusIdDetails](src/containers/Services/ServiceComponents/VerusIdService/SignedInVerusIdDetails.js),
[VerusIdCard](src/containers/Services/ServiceComponents/VerusIdService/VerusIdCard.js),
[describeIdentityContent](src/utils/verusid/describeIdentityContent.js),
[describeVerusIdState](src/utils/verusid/describeVerusIdState.js),
[getVerusIdFunds](src/utils/verusid/getVerusIdFunds.js),
[SendWizardSelectSource](src/containers/SendWizard/SendWizardSelectSource.js).

- [x] **ID-2.1** Mockup rounds 1–3 in `/tmp/vm-mock-vid` (not in the repo). The
  owner chose "D revised" and kept the @ tab icon (2026-10-22).
- [x] **ID-2.2** List: filled rows, two-color name, asset count, a status badge
  only when not active. No network pill and no count pill.
- [x] **ID-2.3** Page: light card, Receive and Send, Control, Content and Details
  rows, then Funds. Status uses `getInfo` for the chain tip. Unlink moves to ⋯.
- [x] **ID-2.4** Content v1 sheet: decoded values; encrypted values grouped under
  one neutral "Encrypted" badge and never decrypted. Details sheet: parent,
  addresses, last change; no explorer on testnet (fixes the old verus.io link).
- [x] **ID-2.5** A fund row opens the asset screen (main-stack `CoinMenus`) with
  the VerusID card selected; Back returns to the page.
- [x] **ID-2.6** Send from a VerusID: one asset opens Amount; several open Select
  asset with only that VerusID's cards and a "From <name>" band
  (`sourceIdentity` route param).
- [x] **ID-2.7** iOS QA, normal and SE, light and dark, with real testnet data.
- [x] **ID-2.10** Owner follow-up (2026-10-22): no i-address on the card (it is
  in Details), the name is copyable, and Receive, Send and Convert are the asset
  screen's icon buttons (`SignedInActionButtons`).
- [ ] **ID-2.8** Android QA (normal and 360x640).
- [x] **ID-2.9** Move the request screens that still open the old
  `VerusIdDetailsModal` to the new view. Only one was live: the card claim's
  outside-authority line (through `GenericRequestHome`). It opens
  `DeepLinkVerusIdDetailsSheet` since 2026-10-23; the other callers cannot run,
  and v1 login keeps its old screen by decision.

**Acceptance:** The page says each fact once. Funds are a list of assets, not one
coin. A fund opens its asset. Encrypted content is marked and never decrypted.

## AL-1 — App alerts and old Settings pickers (gap 4)

**Sources:**
[Alert](src/components/Alert.js),
[AcknowledgeSheet](src/components/AcknowledgeSheet.js),
[BottomSheetModal](src/components/BottomSheetModal.js),
[SettingsScaffold](src/containers/Settings/components/SettingsScaffold.js),
[SettingsFieldSheet](src/containers/Settings/components/SettingsFieldSheet.js).
The call-site audit is a local note (`alert-audit.local.md`, not in the repo):
303 calls; 140 cannot run, 26 repeat the screen, 75 belong on the screen, 18 are
confirmations, 39 errors stay.

- [x] **AL-1.1** Mockups (sheet, dialog, without an alert, pickers) in
  `/tmp/vm-mock-alert`. The owner chose the sheet, kept the Wyre row, chose a
  confirmation for slippage ("Turn on" / "Not now") and dropped the old
  conversion disclaimer (it was only in the unreachable `SendCoin`).
- [x] **AL-1.2** `createAlert` renders the acknowledgement sheet; the alert
  options (`cancelable`, `disabled`) work again; a button runs after the sheet
  closes; Android back runs the way out.
- [x] **AL-1.3** Settings, sign-in and onboarding: inline password and save
  errors, no success alerts the screen already shows, specific confirmations.
- [x] **AL-1.4** Settings pickers: key derivation and blocklist source use
  `SelectionSheet`; number, RPC server and blocklist fields use
  `SettingsFieldSheet`; display currency reuses the Home currency sheet.
  Fixed: a blocklist source pick no longer clears the list, and the RPC check no
  longer spins forever.
- [x] **AL-1.5** GenericRequest screens, invoice payment, VerusID provisioning,
  gift cards and Address Book move their checks onto the screen.
- [x] **AL-1.6** A closing native sheet no longer comes back after an alert.
- [x] **AL-1.7** iOS QA on iPhone 17 Pro (light and dark) and iPhone SE.
- [ ] **AL-1.8** Android QA, including the back button on an alert.
- [ ] **AL-1.9** Device checks that need a staged failure or a request: the
  request wallet gates, invoice inline errors offline, gift card removal reasons.
- [ ] **AL-1.10** Remove the unreachable legacy code and its 140 alerts (separate
  task, after the upstream sync).

**Acceptance:** A user meets an alert only when the screen cannot show the
answer. Every alert looks like the acknowledgement sheet and names its action.

## SV-1 — Services tiles and the fixed gift card screen

**Authority:** [DESIGN.md](DESIGN.md) sections "Services home", "Gift card
detail", "Confirmation", and the status badge rule. The user approved them on
2026-10-15. The mockups illustrate the rules; DESIGN.md wins when they differ.

**Mockups:** the artifact
`https://claude.ai/artifact/Fix3WydeV2fp1wkKw3RrXM` (private to the owner;
read it with the Artifact tool's `read` action) and the local copy
`docs/qa/sv1/mockup.html` in the main checkout (ignored by Git). Use the top
two sections: "Services tab" and "Gift card screen". "Earlier options" are
rejected options.

**Decisions (user, 2026-10-15):**

- The Services root uses the two-column tile grid. A tile shows no pending
  count and no dot.
- The gift card detail uses the fixed card (no flip).
- Status uses the tinted badge with no dot. Ready uses the success pair,
  Pending the warning pair, and Not funded, Shared, and Claimed the neutral
  pair. Today the list shows Redeemed in red; that changes to neutral.
- Visible text says "Claimed" instead of "Redeemed" and "Claim completed".
  Internal names stay: `GIFT_CARD_DISPLAY_STATUS_REDEEMED` and
  `status.state === 'redeemed'` do not change.
- A new display status, Shared, applies after the link left the wallet
  (`hasGiftCardBeenShared`). Precedence: Claimed, then Pending, then Shared,
  then Ready, then Not funded.
- List filters: All, Ready, Pending, Not funded, Shared, Claimed. The list
  summary drops its "Shared ·" prefix, because the badge says it.
- The first share of an unshared card (Share, QR code, or NFC) opens
  `AcknowledgeSheet` with `confirmLabel="Share"` and `dismissLabel="Not now"`.
  This replaces the permanent "Unfunded gift card" and "Shared from this
  wallet" notices. A shared card shares again without the sheet.
- The card shows a pending amount dimmed. Pending funding records store
  transaction IDs, systems, and VerusIDs; they may not store amounts. Trace
  `addGiftCardPendingFunding` and the `broadcastGiftCardFunding` results first.
  If no amount is recorded, show the pending VerusID names or "No contents
  yet", and keep the Pending badge. Never invent an amount.

**Preserve:** the share-attempt record and rollback in `runShareAction`, the
pending-funding share guard, single-use funding after a share or funding
attempt, cancel and remove checks, the NFC tap host, refresh, and the existing
`GiftCardOptionsSheet` cancel flow. These are behavior, not layout.

**Track A — Services tiles.** Own branch from `redesign`. Expected files:
`src/containers/Services/SignedInServicesHome.js`, `src/copy/signedIn.js`, and
a style module if the tile is reusable. Do not touch gift card files.

- [x] **SV-1.1** Replace the image rows with the tile grid from DESIGN.md
  "Services home". Remove the folded 3D image imports. Keep the navigation
  targets and the address count loading.
- [x] **SV-1.2** Tile lines: Gift cards shows its card count ("3 cards",
  "1 card"). Read the count from the gift card service data the way
  `GiftCardServiceOverview` loads it; trace the storage, do not guess. With no
  cards it shows "Send funds or IDs". Address book shows "{n} saved", or "Save
  addresses" when empty.
- [x] **SV-1.3** Icons: Lucide `Gift` and `BookUser` at 24 points
  (`lucide-react-native` is installed and used by the sheets).
- [x] **SV-1.4** Delete `services-gift-card-folded.png` and
  `services-address-book-folded.png` only if nothing else imports them.
- [x] **SV-1.5** Verify on the iOS simulators `Verus GR3 QA` and
  `Verus GR3 Compact` (iPhone SE), light and dark, with zero and several cards
  and addresses, and at a large text size. Run `check:design`,
  `check:safe-areas` on the changed files, and a Babel parse.

**Track B — Gift card screen.** Own branch from `redesign`. Expected files:
`GiftCardServiceOverview.js` (detail, list badge, filters, summary), a new
fixed card component, `GiftCardFlipCard.js` (delete when unused),
`src/utils/giftCard/giftCardPresentation.js` and its unit test, and a shared
status badge. Do not touch `SignedInServicesHome.js`.

- [x] **SV-1.6** Presentation: add the Shared display status, the "Claimed"
  label, and the card texts "No contents yet" and "Empty". Update the expected
  wording in `giftCardPresentation.unit.test.js`. This is a spec change from
  this decision list; record it in the log.
- [x] **SV-1.7** Move `GiftCardStatusBadge` to a shared status badge with a
  card variant that uses the dark-mode pairs. Use it in the list and on the
  card. Update the DESIGN.md "Status label" row.
- [x] **SV-1.8** Build the fixed card from the `GiftCardFlipCard` material and
  shape: name and badge on top, contents at the bottom, no flip, swipe hint,
  "VERUS GIFT CARD" label, or issued date. Delete `GiftCardFlipCard.js` when
  nothing imports it.
- [x] **SV-1.9** Rebuild the detail screen from DESIGN.md "Gift card detail":
  header with back, refresh, and ⋯; the card; the Share, QR code, and NFC
  tiles; the fact rows; the pending transaction row; the Not funded footer.
  Remove the notice boxes, the Contents and Funding addresses sections, and the
  "Gift card options" button. "Fund from another wallet" keeps its route
  (`openFunding(card, {startExternal: true})`).
- [x] **SV-1.10** Share confirmation: the first share of an unshared card goes
  through `AcknowledgeSheet` (`dismissLabel="Not now"`), then the existing
  `runShareAction` with `shareNative`, `navigateToQr`, or `shareNfc`. Start the
  share after `onAcknowledged`, so the sheet has finished closing.
- [x] **SV-1.11** ⋯ options: keep `GiftCardOptionsSheet` and its actions. Add
  "Share before funding" for a not-funded card, through the same confirmation.
- [x] **SV-1.12** List: badge colors, the six filters, and the summary without
  the "Shared ·" prefix.
- [x] **SV-1.13** Verify the five states with real taps on VRSCTEST, light and
  dark, normal and compact: Not funded (a new card), Pending (right after
  funding), Ready (after confirmation), Shared (share by QR code), and Claimed
  (claim from a second disposable profile or with deeplink-sim). Check the
  confirmation's Share, Not now, and outside tap. Run `check:design`,
  `check:safe-areas`, a Babel parse, and the gift card unit suites.
- [x] **SV-1.14** Run one independent, report-only review of the Track B diff
  against DESIGN.md, the mockup, and the preserved behavior. Resolve blocking
  findings before the merge.

Android follow-ups from the 2026-10-15 Android run (see its log row):

- [x] **SV-1.15** Pending "Funding transaction" row on Android: the ID wraps to
  a second line that is cut off, with no ellipsis. The `Text` combines
  `numberOfLines={1}`, `ellipsizeMode="middle"` and `selectable`; Android does
  not ellipsize selectable text. Show one line with a middle ellipsis on both
  platforms (`CopyAction` already copies the full ID).
- [x] **SV-1.16** Android hardware Back on the gift card detail closes the whole
  Gift cards screen and returns to the Services root. The detail is local state
  (`selectedCardId`) on the list screen, with no `BackHandler`. Back from the
  detail must return to the list, as the on-screen back arrow does. Older than
  SV-1.
- [x] **SV-1.17** On Android, React Native `Share.share` never reports a
  dismissal, so opening the system share sheet marks the card Shared even when
  nothing was sent, and the next share skips the confirmation. Decision (user,
  2026-10-15): keep this behavior, because the link may have left through Copy.
  No code change. Recorded in DESIGN.md "Gift card detail" (Sharing).

**Acceptance:** Each fact appears once on the gift card screen. Sharing is
visible without a gesture and asks once before the key leaves the wallet. The
Services root grows by one tile per service with no new artwork. Status uses
the badge without dots everywhere SV-1 touches. Preserved behavior still works.

### SV-1.GIFT-AMOUNT-FIRST — Build the gift (2026-11-02)

Owner-approved reference: option B, frames B1–B10 in
`/tmp/vm-mock-gbuild/out/`, with `opt-b.js` and `opt-b.css` as the measurement
source. Implementation branch: `claude/gift-amount-first`, from `redesign`
at `700fb18d`.

- [x] Replace the currency form and inline identity list with shared amount
  entry, keypad, Available / MAX, ordered extras, canonical currency and
  multi-select VerusID sheets, and the contextual add action.
- [x] Move external funding to the Build step's header options. Preserve the
  funding payload, downstream funding flow, and Review return state. Update
  DESIGN.md and remove the unused old currency picker.
- [ ] Orchestrator QA: compare B1–B10 in light/dark on normal and compact
  iOS and Android. Check swaps, removal, identity-only gifts, long lists,
  sheet dismissal, Review Back, busy state, and external funding.

Evidence: `check:design` passes (37 canonical sources). Safe-area checks pass
for all 4 changed JS files. The iOS production JS bundle and Babel parsing
pass. Local source-extracted state/contract checks pass 26 cases, component
tree/callback checks pass 11 cases, and the existing amount-keypad script
passes 20 cases. Repository ESLint cannot load its existing `import` plugin
(`ERR_PACKAGE_PATH_NOT_EXPORTED`); isolated undefined/unused lint passes.
The amount map stays the single source for `selections.funds`.
The clear-all VerusID action reads "Done" and applies an empty selection.
The existing positive-amount Review gate still permits an amount above the
balance; funding validation stays downstream. No device or simulator QA ran
in this implementation task, as instructed by the owner.

Device-QA follow-up, 2026-11-02 (same implementation branch):

- [x] Hide tabs for the active `GiftCardCreate` and `GiftCardFund` Services
  routes, including every internal step. Other routes use the unchanged
  `HomeTabScreens` tab style. Review drops the bottom inset with its password
  keyboard open. Processing reserves its scroll content's bottom safe area.
- [x] Display the main amount with the locale decimal separator. Keep
  `fundAmounts`, funding selections and MAX values normalized. Preserve the
  amount caret when only the displayed separator changes.
- [x] Inspect accessibility wrappers and action semantics. No grouping or
  descendant-hiding parent was found. Add has an explicit label. Extra rows,
  remove actions and Add have explicit disabled states. Unit and MAX already
  have their own button roles, labels and disabled states.
- [ ] Orchestrator recheck: native tab restoration, safe-area geometry, locale
  entry and separate accessibility elements on iOS and Android.

Follow-up evidence: `check:design` passes (37 canonical sources). Safe-area
checks pass for the 3 changed JS files, together and individually. Narrow
undefined/unused lint, Babel parsing and the iOS production bundle pass.
The earlier state/contract (26) and component (11) scripts pass against
`700fb18d`; the existing keypad checks pass (20). Local QA regression checks
cover tab defaults, locale entry, caret edits, accessibility props and shared
safe-stack padding. This is source and React component evidence. No simulator
or native accessibility check ran in this follow-up. Metro on port 8197 was
left running for orchestrator QA.

## RG-1 — Say each fact once (result guard)

**Authority:** [DESIGN.md](DESIGN.md) core rule "Say each fact once", the
"Transaction result" section, and the verification checklist. The owner saw
"Claim submitted" state one fact four times and approved the three-part guard on
2026-10-23.

- [x] **RG-1.1** Extract `TransactionResult` from the Sent step. Send, Convert
  and invoice payments use it without a visible change.
- [x] **RG-1.2** Gift card funding uses `TransactionResult`: "Funding sent",
  one row per transaction, "Sharing unlocks after it confirms."
- [x] **RG-1.3** `check:design` fails on a section label or a count line that
  repeats a status word of a title in the same file.
- [x] **RG-1.4** DESIGN.md: core rule, verification step, and the encoded
  fixes.
- [x] **RG-1.5** Copy: the signature-threshold high-risk step, the identity
  update broadcast and delivery errors, the expired invoice, and the response
  delivery error say each fact once.
- [x] **RG-1.6** Move the card claim result onto `TransactionResult` after the
  claim branch merges; `check:design` then passes with no hits.
- [ ] **RG-1.7** Android QA of the Send and gift card results.
- [x] **RG-1.8** Gift card funding results use the detail screen's `canShare`
  rule for Share availability. Pending funding keeps View gift cards primary;
  an unfunded retryable failure keeps Share available. Device QA remains open.

**Acceptance:** Every result screen states its outcome once, in the title.
`check:design` passes with no repeated-fact hits.

## QA-1 — Completion criteria for each workstream

These criteria apply to each delivered scope. The overview’s QA-1 row becomes
Done only when all delivered workstreams have their applicable evidence. Until
then, record coverage per workstream in the log rather than claiming a global pass.

- [ ] **QA-1.1** Every completed workstream has a recorded design contract,
  implementation commit/candidate, touched paths, and acceptance outcome.
- [ ] **QA-1.2** Every redesigned surface has been compared with its canonical
  exemplar in light and dark mode at normal and compact sizes. Include relevant
  empty, selected, loading, error, keyboard, processing, and result states.
- [ ] **QA-1.3** Navigation, sheet dismissal/reopen, system back, reduced motion,
  safe areas, scrolling, labels/focus, and text scaling have applicable evidence.
  Do not infer accessibility compliance from screenshots alone.
- [ ] **QA-1.4** Relevant design, safe-area, parser/bundle, and behavior checks
  have passed or have precise documented limitations. Do not add new Jest tests
  unless the user explicitly asks; follow current repository validation guidance.
- [ ] **QA-1.5** Meaningful behavior changes have the required independent review,
  with reviewer selection based on actual changed risk. Resolve blocking findings
  and record the final candidate reviewed. Follow current AGENTS/skill procedures.
- [ ] **QA-1.6** Shared changes have checked affected existing consumers, especially
  authentication, Identity Update, invoice payment, and Card selection where used.
- [ ] **QA-1.7** Completion claims are supported by the right evidence: source,
  rendered UI, native behavior, response delivery, and transaction confirmation
  are recorded separately. Unverified platforms/states remain explicitly open.
- [ ] **QA-1.8** The final checklist and log reflect delivered Git state. Any
  known remaining issue has a task ID, clear next action, and owner or blocker.

Useful checks, selected for the actual change:

```sh
corepack pnpm check:design
corepack pnpm check:safe-areas <touched-ui-files>
git diff --check
```

The baseline design check protects 27 canonical sources. It does not scan every
screen for adoption and does not replace rendered QA. Since RG-1 it also scans
`src` for two repeated-fact patterns: a section label or a count line that
repeats a status word of a title in the same file. Add narrow mechanical
coverage only when a concrete recurring failure warrants it; do not turn this
plan into a repository-wide migration test project.

## Evidence and handoff log

| Date | Scope | Candidate / commit | Evidence and result | Remaining / next action |
| --- | --- | --- | --- | --- |
| 2026-11-13 | TX-1.SEND-NETWORK-AT-PICK: network sheet at asset pick, Ethereum-to-Verus routes | `claude/send-network-at-pick` from `redesign` `51a414cb`; `2b8afb2d`, `fd102444`, `20ff97f0`, `66753397`; `SendWizardSelectSource.js`, `SendWizardAmount.js`, `SendWizardContext.js`, `SendWizardRecipient.js`, `wizardUtils.js`, `DESIGN.md` | Owner chose option A (2026-11-13): Send asks for the network at asset pick when two or more networks remain; the picked row shows a spinner; Amount reuses the routes. Fixes: a route that exports to a Verus system is `VERUS` also from ETH/ERC-20 cards (was `GENERIC`: no Send to self, no VerusID check, "Recipient address" placeholder); the Verus row of an Ethereum asset reads "Receive as vETH" / "DAI.vETH"; a known Verus network uses its wallet name ("Verus Testnet"); Recipient checks a VerusID through the channel router as Confirm does; a load still running when Select asset loses focus is dropped. Temporary fixture of `buildSendTarget` with bridge-shaped ETH and DAI paths fails on `51a414cb` ("Receive as ETH", `generic`) and passes on the branch. Babel transform, `check:design`, `check:send-wizard-options`, `check:safe-areas` pass. iOS 26.5 (GR3 QA and GR3 Compact, public VRSCTEST, Face ID QA wallets, gETH balance injected in Redux only for the list): sheet "Same network: Ethereum / Receive as ETH", "Other networks: … / Receive as vETH"; Amount without "Checking networks…"; Recipient "Address or VerusID" + Send to self (2) for gETH to Verus; TestBob.antafri@ accepted, unknown name "VerusID not found…", 0x address refused; SE fits; light and dark. Android (gamemax, normal + small, JS from Mac Metro 8086): VRSCTEST sheet, Amount, Recipient pass; USD/SUPERNET open Amount directly; stale "busy" row description fixed; with an 8 s debugger-patched lookup, Back at 3 s and 6 s (12 runs + 2 header-arrow runs) never opened the sheet or Amount. Probe on both phones: lookup 0.9 to 1.6 s, no JS stall above 150 ms. Evidence: `docs/qa/send-network-at-pick/` (iOS, local) and the PC's `qa-shots/2026-11-13-*` folders. | Not verified: a funded gETH-to-Verus Confirm (no Sepolia ETH in QA wallets; preflight refused the empty balance) and vETH on Arrives; private testnet; VRSCTEST-to-Ethereum Recipient (bridge fee above balance). Accepted race: Back that lands as the sheet appears shows the sheet briefly, then the wizard closes. Pre-existing and left: stale Recipient text after a network change; a Back during the address sheet's close animation goes to that sheet. |
| 2026-11-13 | TX-1.LOWERED-AMOUNT: lowered amount on the node (option B), fee money, Ethereum bridge fee rows | `claude/reduced-amount-was-now` from `redesign` `47ae4391`; `69459c05`, `2a4a4c83`, `313189f7`; `SendWizardConfirm.js`, `SendWizardSuccess.js`, `loweredAmount.js`, `components/TransferSummary.js`, `components/ConfirmFacts.js`, `components/FeeBreakdownSheet.js`, `DESIGN.md` | Owner chose B of the reduced-amount mockups (canvas D8F85qJVwMP4myjDHWUnhx, 2026-11-13): Confirm and Sent show the entered amount struck through above the sent amount and "Lowered for fees" under the label; the "Reduced from …" sentence is gone; invoices show it too. The plain Fees row shows its money value. An Ethereum-to-Verus bridge splits its fee into Bridge fee and Network fee › from the prepared transfer; the "Network fee" sheet explains the gas maximum and, when lowered, the ETH kept back. Owner: keep upstream's bridge amounts unchanged (the first preflight at the full balance uses the 1,000,000-gas fallback, so more than the shown fee stays in the wallet). Babel transform, `check:design`, safe-area check pass. iOS 26.5 (GR3 QA + GR3 Compact, VRSCTEST QA wallets): lowered send to self sent and Sent checked (txids `13e58be7…a2b1`, `ecd0fde6…f032`), not-lowered, lowered conversion to BASKET, Ethereum-to-Verus Confirm + sheet with a debugger-patched preflight result and gETH balance, dark mode: pass. Android (gamemax, normal + small, JS from Mac Metro 8093): lowered send sent (`ca02fd70…d838`, `3476dc04…f266`), not-lowered, lowered conversion to AMERICA, dark mode: pass. | Not verified: a funded gETH-to-Verus transfer and its Sent screen; real fiat prices on testnet (synthetic prices on iOS); Sent in dark mode on Android. Accepted: on a 360 dp Sent screen with the testnet ticker VRSCTEST, "Lowered for fees" wraps to two lines without clipping (mainnet VRSC fits). |
| 2026-11-13 | TX-1.MONEY-LINE-ANY-CURRENCY | `claude/money-line-any-currency` on `claude/confirm-total-at-slider` `5befa70a`; `wizardUtils.js`, `useReceivedPrice.js`, `SendWizardAmount.js`, `SendWizardConfirm.js`, `DESIGN.md` | Conversion targets carry the destination's `systemid`. A target that `CoinDirectory.findCoinObj` cannot find gets a price descriptor (currency id, system id, the paid coin's testnet flag, `proto: 'vrsc'`; a non-native system also needs its directory VRPC endpoints, else no price) and goes through the unchanged `getCoinRates` and on-chain engine, so the fiat conversion, testnet-price rule, 60 s cache and silent errors stay the same. The Amount hook call moved above the early return (hook order). Babel parse (4 files), `check:design`, `check:safe-areas --changed` pass. A temporary Node script ran the real `selectCurrencyPriceRoute` on read-only public VRSCTEST `getcurrency`/`getcurrencyconverters` output: BASKET (basket, VRSCTEST reserve) about $0.187; SUPERNET (reserve in BASKET) about $0.129 through BASKET. | No simulator or device run. Device QA: Convert VRSCTEST to BASKET and to SUPERNET (not in the wallet) with testnet prices on shows a money value on Amount and Confirm; a target without a route still shows none; wallet targets unchanged. Invoice conversion targets carry no system id and keep the old behavior. |
| 2026-11-13 | TX-1.RECEIVE-IMPACT-ROW | `claude/price-impact-receive-row` from `9724ada3`; implementation `01e9e8c3`, `4df07ed5`, `e503f1e3` | Inspected all four approved PNG boards. Price impact labels are percent only; basket badges only Best price. Amount pins the logo/name/estimate/money and impact doorway; one-line middle ellipsis works with Android's constraint. Money uses the received coin ID in the existing ledger price channel and display currency; no crypto-ratio fallback. Invoice presets/custom share the existing validator and encoder. Temporary non-Jest fixtures pass selection, errors, decimal commas, deferred apply, off and cancel/reopen. Real invoice classes round-trip 0.5/1/2/3 percent to 500000/1000000/2000000/3000000, byte-identical to the base text-field path. | No simulator/device runs, push or merge. Native light/dark, normal/compact, text wrapping, assistive technology and live rates remain for the separate QA task. Static check results recorded in the follow-up below. |
| 2026-11-13 | TX-1.CONFIRM-TOTAL | `claude/confirm-total-at-slider` on `claude/price-impact-receive-row`; implementation `86f34e59` | iOS 26.5 simulators, public VRSCTEST, testnet prices on, VRSCTEST to ETH on Ethereum, never slid. iPhone 17 Pro light/dark: high-fee state (amount 1, bridge fee 39.97891815) shows the notice and the large Total above the slide; normal state (amount 50) shows the quiet Total; money values on Bridge fee, Network fee ("< $0.01") and Total; preparing skeleton in place; long-press copy; Price and route opens; one-network conversion keeps Fees and shows the short notice at a dust amount; plain send unchanged; prices off shows coin values only. iPhone SE light/dark: compact nodes; normal state fits; high-fee state scrolls 22.5 points (lower part of Arrives under the fade). Not seen on device: the receive money value (the testnet has no price for these targets). Screenshots in `docs/qa/confirm-total-at-slider/` (local). Android not run. |
| 2026-11-12 | SLIDE-1.DEFERRED-CANCEL | Follow-up to merge `eae7c336` on `claude/slide-to-confirm-1112` | A temporary non-Jest component fixture fails before the fix: a successful release, first animation frame, prevented Back and rearm timer let the second frame invoke the old handler. The deferred handler now checks its captured gesture epoch. The fixture passes after the fix, including a fresh slide after Back, cancelled release beyond 90%, short release, busy label before commit, two-frame defer and duplicate accessibility activation. Design (39 sources), card colors (17 materials), changed-file safe areas (1 file), iOS and Android production bundles pass again. Fifteen function AST comparisons, 12 byte-identical copy/review files and both original checkbox/evidence sets pass against redesign / the original branch. | Source and controlled fixture evidence only. Native gestures, rendered states, clipboard and accessibility remain open. Existing AmountInput cursor-at-end polish, promise returns and gift duplicate-submit guard are retained; transaction construction/funding/signing/broadcast inputs match redesign. No Jest tests added, devices, wallet actions or push. |
| 2026-11-12 | SLIDE-1.REDESIGN-MERGE | `claude/slide-to-confirm-1112`, parents `d49fb338` and `70f81518` | Both import sets, both checkbox sets and all evidence rows retained. Read merged WizardUI, ConfirmPayStep, SendWizardConfirm and DESIGN. Copy primitives and 12 copy/review files match redesign; payment/preparation function ASTs match. Frozen install, design (39 sources), card colors (17 materials), changed-file safe areas (49 files), iOS and Android production bundles pass. Row copy is inside the scroll content; the slide is a sibling footer, so no simultaneousHandlers/waitFor link is needed. Cancelled and short slides, busy text, two-frame defer and duplicate activation pass a temporary component fixture. | Fixture found that prevented Back between the deferred frames can rearm an old commit; fix follows in a separate commit. Native gestures, rendered light/dark and normal/compact, clipboard and accessibility remain unverified. No devices, wallet actions or push. |
| 2026-11-11 | SLIDE-1 | `claude/slide-to-confirm` from `552a2ee9` | Shared 44/56-point slide, 90% release threshold, three-second action hint, promise latch and cancellation guards. Six approved paths use it. Gift funding adds a synchronous broadcast guard; wrappers return commit promises. Invoice native modal gets a gesture root; the track uses View to avoid Pressable pan capture. Design/card-color, changed-file safe-area, 15-file Babel transform, 35 existing presentation tests and 33 controlled component checks pass. CoreText at Inter Semibold 17 pt measures the longest labels at 192.11 and 177.86 pt; both fit the 320-point screen calculation. pnpm required verify-deps-before-run=warn with reused modules; no install. | No device, native gesture, native font, gift keyboard, broadcast, VoiceOver or TalkBack proof. No success motion changes, push or merge. |
| 2026-11-12 | GR-4.IDU-PARITY-FOLLOWUPS | `claude/idu-parity-followups-1112` from `da0bb81f`; five separate item commits | Static only. Each focused Node fixture fails before its fix and passes afterward with native component stubs. Grouping checks cover both theme modes, warning ownership, nested paths, scalar/single values, upload-sheet open/copy/close, unchanged original data and upload bytes; path-only changes preserve field values, copy values, warnings and raw text. Design: 39 canonical sources pass; 17 card materials pass, minimum 5.014:1. Safe-area: `--changed` passes; explicit five-source check passes. iOS and Android release bundles pass in `/tmp/idu-followups-1112.nMlO4w/`, with 41 and 47 assets. Requested six Jest suites: 50 tests pass before and after, with the same two suite-load failures (`Touchable.Mixin`, `Platform.OS`). Existing upload/model suites add 34 passing tests. No new Jest tests. `identityContentReviewScreen.unit.test.js:143,167` still assert the intentionally removed Included data chip; the suite fails to load before reaching them, and its tests are unchanged. | Device rendering, normal/compact light/dark, native copy and accessibility remain pending. No simulator, emulator, Metro server, transaction, push or merge. |
| 2026-11-12 | GR-4.IDU-PARITY-FOLLOWUPS device QA | `claude/idu-parity-followups-1112` `e791e694` | Astra (gpt-6-astra high): one P2 (unnamed clear-all key hidden) fixed in `e791e694`, re-check no open P1/P2; build/fund/sign/broadcast/response files byte-identical. iOS + Android release bundles and safe-area (5 files) pass. iOS 26.5 iPhone 17 Pro + SE: before shots on `da0bb81f`, after shots on `e791e694`, all five items pass, high-risk gate still blocks Continue, bidi copy keeps U+202E/U+2066; smoke on `da0bb81f` (unlock, add/fly/remove, hidden after relaunch, no block-list row, send Confirm long-press + fee sheet + Back, convert Price impact copies `0`) passes. Android 16 `normal` + `small` on `e791e694`: A1-A5, round-1 cases 1-6, bidi copy, smoke D1-D6 pass; add-asset fly not captured. Report https://claude.ai/artifact/QoCnQ2tYquAjCvTAJgXjNe | Open: `normal` cold unlock up to about 246 s (dev build, seen before); lone wrapped characters in long keys; dark "Will remove" pill contrast; `small` Convert "You receive" wraps. Untested: Price impact `<0.1`/`0.2`, iOS normal-dark/SE-light for items 1/2/3/5, wrong network (fixture), case 8 on the identity path, accessibility. |
| 2026-11-12 | GR-4.IDU-PARITY-P2 | `claude/idu-parity-fixes-1112` from `b7f7e630`; `84eaee26`, `95d6aa2c`, `3d3aaf91`, `406c5cd0`, `ce776b82`, `4195873a` | Compared each gap with upstream `f32e7fb95`. Design: 39 sources pass; card colors: 17 materials, minimum 5.014:1. Safe-area: requested `--changed` passes for 0 files after commits; explicit 10-file check passes. Babel parser: 10 files pass. iOS production bundle: passes, 41 assets in `/tmp`. Existing regression group: 52 tests pass; the same two suite-load failures occur before and after. Handler/removal regression: 30 tests pass. Temporary component/model checks pass; seven preparation, broadcast, signing and delivery functions are byte-for-byte unchanged. | Device rendering, normal/compact light/dark, accessibility and live request entry remain open. QA links are local only. No devices, Metro server, identity transaction, push or merge. |
| 2026-11-12 | GR-4.IDU-PARITY-P2 review corrections | `claude/idu-parity-fixes-1112` over `4aa642bb`; removal `a4e40912`, refusal `74f6de1e`, copy follow-up in this commit | Temporary component fixtures reproduce the removal and escaped-copy defects before correction and pass afterward in both theme modes. Clear-all keeps the original lookup key and inspector; notes and decoded removal data render once per operation. Empty-target copy states the add-content fact once. Handler fixtures use real SDK partial/upload validators with mocked network/builder boundaries: local threshold refusal keeps its reason without retry; RPC, daemon, transport and builder failures remain retryable, including identical error text. Accepted builder input and original request bytes remain unchanged. Design: 39 canonical sources and 17 card materials pass. Safe-area: all 5 changed source files pass. Babel parser: 5 files pass. Production iOS bundle: passes, 41 assets in a temporary directory. Same 8 existing Jest suites before/after: 6 pass, 2 fail to load, 82 tests pass; no new failure. | Static fixtures use native component stubs. Device rendering, native clipboard and accessibility remain unverified. No simulator, Metro server, transaction, push or merge. |
| 2026-11-12 | GR-4.IDU-PARITY-P2 envelope refusal | `claude/idu-parity-fixes-1112`; `4ff19f1a` | Second review found flag bit 32 still fell to "Cannot open request" with retry. The handler now runs the SDK's four envelope checks on the validation copy. Review (gpt-6-astra, offline execution): flags 0-31 and 12 boundary cases pass, flag 32 gives `IDENTITY_UPDATE_REFUSED` with its reason and no retry, zero external calls; no open P1/P2. Design, safe-area (10 files) and iOS production bundle pass. | Device rendering and live request entry remain open. |
| 2026-11-12 | GR-4.IDU-PARITY-P2 device QA | `claude/idu-parity-fixes-1112` `68117896` (redesign 96787c81 merged) and polish `452f6b87` | iOS 26.5 iPhone 17 Pro + iPhone SE, light/dark, before (96787c81) and after, 8 signed VRSCTEST requests for TestBob.antafri@: all six gaps pass; wrong network via debugger fixture; refused URL via `ftp://` sign-in request. Polish re-check (cases 1, 3, 4) passes. Android Pixel 6a API 35 light/dark + 360x640 dp: cases 1-6 pass; case 7 shows expiry (same cause). Update never pressed. Report https://claude.ai/artifact/QoCnQ2tYquAjCvTAJgXjNe | Owner review of the new review-screen UI before merge. Accessibility, Android clipboard/case 8/polish, real broadcast untested. |
| 2026-11-12 | TX-1.LONG-PRESS-COPY | `claude/confirm-long-press-copy-1112` from `b7f7e630` | Shared copy hook and stable feedback on Confirm, Sent and history detail facts. Exact amounts, validated fees, prepared addresses and full txids; separate VerusID lines; original icons and tap actions retained. Install, design/card colors, safe areas (15 JS files), Babel (15 JS files), 56 component/hook, 6 exact-value and 4 React Native Pressability fixture checks pass. iOS release (41 assets) and Android debug (52 assets) bundles pass with one worker and temporary cache-only config overrides after default-cache read failures; project resolver and transformer unchanged. | Device owners retain light/dark normal/compact rendering, actual scroll dispatch, VoiceOver/TalkBack, Back/reopen and all four wallet-flow checks. No devices, transactions, push or merge. |
| 2026-11-09 | NFC gift choice C: optional backup | `claude/gift-nfc-choice-c`; UI `88043a05`, behavior `8fcffe7e`, redesign merge `5e6e8f83` | Approved option C checkbox and state-dependent steps; separate passthrough selection/resume flags; cancelled unlock and both Back routes return to the checked choice. Three baseline navigation checks fail before the behavior fix and pass after it. Ten container checks, 40 entry theme/size/state cases and both busy action paths pass in temporary component fixtures. Babel with project config passes all 188 changed JS files across the gift-base/redesign diff union. Design, two-screen safe-area and whitespace checks pass. Source-derived renders cover light/dark at 390×844 and 360×640, with native controls/layout substituted. | Orchestrator owns Android device QA and native accessibility. No devices, Metro, NFC write, claim transaction, push or merge into redesign ran. See the scoped checklist. |
| 2026-11-09 | ID-3.REG-R11-APPENC: app-encryption and private-address review fixes | `aac3f80e`, `c00d9079`, `fc8f1bc1` on `claude/appenc-review-fixes`, merged into local `redesign` | P2 current Z address shown (Current / After update), Removed/Replaced/Added, details sheet says each fact once, chosen VerusID kept after approve (batched `next()`), nested VerusID and key number on the main review, short addresses in the acknowledgement sheet. Android large light + small dark: 11 of 11 links pass, 0 of 123 frames show the loader, simulator verified signers; acknowledgement re-check 4 of 4. Design and safe-area checks pass. | Not pushed. iPhone and TalkBack not run. |
| 2026-11-09 | ID-3.REG-R11-UPSTREAM: hero fix, full Android run, merge | `b301373c` on `claude/new-verusid-flow-upstream`, merged into local `redesign` | Hero gap cause: Android measured "80 USD" as two lines (72 dp) and drew one. The amount now uses the Send one-line pattern; small phone after the fix: 36 dp, fee line 8 dp below. Root-name Check details unchanged on both phones. Full Android run: `nvfpixg1109@` (normal) and `nvfsmlg1109@` (small) paid with the default Foundation referral (20 VRSCTEST each on chain) and linked. Design and safe-area checks pass on `redesign` after the merge. | Not pushed. Device check of app-encryption requests and the private-address removal warning remains. Four P3s left as is (see the section). |
| 2026-11-09 | New VerusID upstream sync | `claude/new-verusid-flow-upstream`, upstream `64166d35` | Five upstream commits merged; encryption scope/session/security port, shared lifecycle/cache/claim/NFC helpers, private-address removal risk, VRSC/VRSCTEST Foundation default. Redesign startup refresh, optional drawer close, scoped signer guards and app alerts retained. Install/pins, design, safe areas, 11-case completion check and both release bundles pass. Requested Jest: 386 pass / 21 fail plus seven suite-load errors; exact names and baseline comparison in local report. | No push or merge into redesign. Component fixtures only; native light/dark/compact, signing/delivery, registration and physical NFC QA remain. |
| 2026-11-07 | ID-3.REG-R11-QA5 | `claude/new-verusid-flow-fixes5` from `9bdb2f8f` | One price-currency payer balance through SelectionRow; namespace referral policy stabilizes the initial progress count; cancellable funds polling stays nonbusy until a funded review rebuild. Design, safe-area (5 files), Babel and focused core/React/hooks lint pass. Seventeen controlled checks pass; nine fail on the base. Inspected 12 source-derived payer states in both themes and Android widths. | Orchestrator review, then Android QA. Hero gap has no identified source cause and is unchanged. Native wrapping, navigation during a slow poll, top-up/re-entry, fresh hold and accessibility remain device checks. Standard ESLint retains its import-plugin load error. |
| 2026-11-07 | ID-3.REG-R11-QA4 | `claude/new-verusid-flow-fixes4`, `59fbfecc` | Shared continuous progress, canonical referral rows, Check details address sheet with Send balance styles, and read-only fixed-payer funds refresh for Home/tab notices. Design, safe-area (10 files), Babel, Android dev bundle (52 assets), 12 component checks, 15 refresh checks and 37 progress regression checks pass. Inspected 40 source-derived light/dark states at both Android sizes. | Android QA pending. Verify keyboard, Back, sheet dismissal, one/two currencies, hidden balances, fixed-payer top-up, Home/tab refresh and no automatic payment. Native controls, accessibility and live chain reads remain unverified. |
| 2026-11-06 | ID-3.REG-R11: New VerusID | `claude/new-verusid-flow` from `7b089908` | R8–R11 stepped create, all-currency payer reads, in-place second hold, durable problem notices, grouped tab rows, shared one-tap Link sheet, and own-name control facts. Android dev bundle, design, safe-area, Babel and focused ESLint pass. Existing suites: 395 pass / 4 baseline assertions fail; 2 baseline native-mock suite-load errors. Full command output and spec map: `new-verusid-flow.local.md`. | No simulator, emulator, signing, broadcast, push or merge. Device tester owns native keyboard/Back/reload, all live payment states, light/dark normal/compact, accessibility, and real linking. |
| 2026-11-05 | ID-3.NIGHT3-B: VerusID safety | `claude/night3-batch-b` from `ff2e63e0` | Modify identity/control summary and Added/Removed rows; clipped VerusID form scrolls, label-first reveal, compact pinned price and hidden Save; known decimal source balances checked against every full-quote currency; approved app-data and Transfer words. Design, safe-area, Babel, focused ESLint, temporary non-Jest behavior checks and both release JS bundles pass. Normal ESLint retains its existing import-plugin package-export failure. Exact commands and proof limits: `verusid-batch-b.local.md`. | Render the candidate in both themes on Pro/SE and Android normal/360x640. Cover keyboard/funds/control-change states, Back/reload and both payment approvals. No native rebuild required by these JS changes. No push or merge. |
| 2026-11-05 | TX-1.HIDDEN-BALANCES | `claude/hidden-balances-tx-persist` from `bd00f503` | Overview and pre-launch history rows blur signed amounts and fiat. Transaction details blur amount, fiat and fee. Hidden accessibility values use "Balance hidden". One phone-level AsyncStorage read starts at module load with a 400 ms fallback; startup applies an explicit visibility action before accounts load. Toggle writes are serialized. Frozen install, design/card-color checks, Babel parse (11 JS files), whitespace and temporary non-Jest checks pass. Two baseline checks fail before the fix and pass after it. Storage/Redux checks cover restarts, rapid taps, failed/stalled/late reads, save failure and account changes. Twelve controlled component scenarios cover both themes, live toggles and readable identifiers. | Opus: review the commit and run iOS normal/SE and Android normal/360x640 QA, both themes, including native blur, accessibility speech, restart and account changes. No device, native build, Metro, push or merge ran. |
| 2026-11-04 | HOME.NOTICE-A | `claude/home-notice-a` from `bc6602db` | Approved smaller notice sizes and Private sync state. Design, changed-file safe-area, iOS bundle and 20 controlled selection cases pass. Native component fixtures cover light/dark on normal iPhone and SE. The notification Jest suite fails before and after edits at the same vector-icons native-module import. | iOS and Android device QA passed on 2026-11-04 (dismissal/reopen, thresholds, SE and small phone 32-point buttons). VoiceOver/TalkBack speech remains open. Merged into `redesign`; not pushed. |
| 2026-11-04 | NFC gift claim G1–G8, G6b, C1 and typed backup password | `claude/gift-nfc-claim` from `b5adf175`; JS-only implementation | Reuses onboarding, WalletSetup, phrase verification, SelectionRow and PasswordCheck. Session-bound typed-password flags, direct choice-to-unlock, root-chain amount preview, unsigned action titles and plain backup rows implemented. Babel parse, Android development bundle, design, safe-area and whitespace checks pass. 19 source-component checks pass. G1/C1/G6 source-derived fixtures inspected in light/dark at 402×874 and 360×640; native controls, fonts and measurements are substituted. The same 12 existing suites on baseline and candidate give 9 passing suites, 3 failing suites, 107 passing tests and 17 failing tests. Two suites fail to load on `Touchable.Mixin`; spendable-key failures include missing `getMempoolUnspentUtxos` mocks. No tests added or changed. | Implementation only. Device QA pending: real onboarding/replay, compact keyboard, Back/Cancel, failed-write retry, NFC hardware write/restore, phrase-to-claim and signed requester regression. No merge or push. |
| 2026-11-04 | ID-3.POLISH-2: I1, N1/V1, repeated copy, Unlink, Android Back and display fiat | `claude/idreg-polish-fixes` from `ccbb4ed4` | Shared prose topic; hidden namespace filtering/search; quiet V1 numeric prices; result-only network suppression; unpaid-delete body; primary Unlink; manifest Back opt-out; display-currency fiat from cached ledger pairs. Design, 12-file safe-area/Babel, XML, whitespace and 60 temporary controlled checks pass. Base: 24 pass / 36 fail. Engine, SDK, storage, RPC readers and Jest sources stay unchanged. | Orchestrator owns native light/dark normal/compact QA and Android PC build/Back tests. See `idreg-polish-2.local.md`. No device, Metro, build, push or merge. |
| 2026-11-04 | ID-3.MANAGEMENT-UI phase 2b | `claude/idreg-ui-mgmt` from `63289e4b` | Approved management options, Transfer, Modify option B, results and Link option A. Shared controls and theme roles; unchanged engines; sign-out clears active/available cards. Design, 13-file safe-area/parser, 59 synthetic checks and both production bundles pass. Requested Jest run: 316 pass / 20 fail, 3 native-fixture load errors; see scoped evidence below. | Orchestrator native normal/compact light/dark QA, consent/hold, unknown broadcast, Transfer + unlink, and Link failure/retry. No device, push or merge. |
| 2026-11-04 | ID-3.REG: phase 2a New VerusID | `claude/idreg-ui-reg` from `63289e4b` | V3 field, namespace prices/search, two holds, saved tab rows, app-sheet alerts and shared testnet DAI.vETH/Bridge.vETH route. Engine, backend and tests unchanged. Core suites: 268 pass; storage: 78 pass / 1 existing route failure. UI components/presentation pass; screen fixture has an incomplete native SVG mock. Design, safe-area, source behavior, price, parser and both production bundles pass. Source-derived renders only. | Orchestrator owns native light/dark normal/compact QA and real testnet flows. See `idreg-reg.local.md`. Phase 2b remains separate. No device, Metro server, push, PR or merge. |
| 2026-11-03 | Meeting fixes device QA (wallet logos, gift Share, bridge names and fees, identity upload) | `claude/meeting-fixes-int` `40378c38` (redesign `f278b505` + `claude/meeting-ui-fixes` `cd5f18ad` + `claude/bridge-names-fees` `f1b90816` + `claude/identity-data-upload`) | Sonnet testers plus Opus checks on VRSCTEST, iPhone 17 Pro and iPhone SE sims, light and dark. Pixel icons on Home and Manage assets (no "?"). Gift card funded (txid `a6eabb77…`): result has no Share while pending. Network rows: vETH on Verus, ETH on Ethereum; DAI.vETH → DAI. Confirm for a send to Ethereum shows Bridge fee, Network fee and Total with Hold enabled; local conversion below fees shows the notice. Identity updates: content add `9847dd47…`, public upload `0c9a765d…`, encrypted upload `7fd6fa39…`, all verified by the requester; refused upload shows the plain copy; signed-out unlock works. Fixed during QA: first-render crash on every identity update request, `0x…` contract names shown as asset names, and an out-of-date review shown as a fee error. | No real bridge or conversion broadcast (public VRSCTEST DeFi disabled). Android not run. P3 polish items are listed in the meeting-fixes run folder `docs/qa/matrix/runs/2026-11-03-meeting-fixes/` (ignored). No push. |
| 2026-11-03 | GR-4.IDENTITY-UPLOAD tests and plain rejection | `claude/identity-upload-tests` from `05e541f3` | Existing suites now check supported upload crypto, nine refused variants, real SDK canonicalization, unchanged signed request bytes, history checks, and the fifth signer argument. Exact approved rejection copy applied. Requested identity group: base 53 pass / 0 fail; candidate 62 pass / 0 fail. Four unchanged SVG suite-load errors. Gift/claim/spendable-key group: 77 pass / 19 fail on both. Frozen install, four-file parser, design, and whitespace checks pass. | The 19 missing-mempool-mock failures and native verification remain open. No new test files, device work, merge, or push. |
| 2026-11-03 | Meeting UI fixes: wallet logos and RG-1.8 gift funding results | `claude/meeting-ui-fixes` from `052d0b5c` | `logoId` uses built-in artwork or raw `coin.id`; Home, shared asset rows/reviews and setup consume it. Claim animation keeps `iconId`. Funding result Share uses the detail screen's `canShare` rule; caption, unfunded sharing and share guards remain. Frozen install, design, safe-area (5 files), Babel (5 files), 15 temporary Node behavior checks, iOS production JS bundle and whitespace checks pass. Existing unit suites: 51 pass, the same 2 baseline failures from a missing `getMempoolUnspentUtxos` mock. Details: `meeting-ui-fixes.local.md` (local only). | Owner device QA: light/dark, normal/iPhone SE; Home identifier currency, Manage assets, details/identifier review, setup logos, pending/partial/retryable/confirmed gift funding results and Back. No device runtime or rendered evidence in this task. |
| 2026-11-03 | TX-1.BRIDGE-FEES and naming state follow-up | `claude/bridge-names-fees` after `865bfb68` | Production iOS JS bundle, design (39 sources), safe-area, option matrix and Babel checks pass. Synthetic React checks run production Confirm, facts/preparing and provider: affordable amount 10 / bridge 17 / network 0.0001 / Total 27.0001 keeps Hold enabled; mixed-currency Total is 10 DAI.vETH + 17.0001 VRSCTEST; reduced amount and notice agree; conversion fees above/equal/below amount show one/zero/zero notices without blocking; preflight error has no Hold. After a reduction, a failed fresh estimate hides the old Amount quote and shows the existing notice. Network changes retain amount, recipient and memo, clear preflight, and restore the Verus ticker on return. Existing related Jest: 7 suites / 88 tests pass, 1 suite / 8 tests fail identically on the untouched base and candidate because currencyTransferIntent mocks the removed getSpendableUtxos interface. No wizardUtils/SendWizard Jest suite exists; the existing option script passes. Logs and throwaway scripts: `/tmp/bridge-names-fees*`. | Native rendered checks, accessibility and broadcast/settlement remain unverified. Check Convert and Send network sheets, all downstream target labels, export fee rows/Total, local fee notice, MAX with a fee rise and plain MAX, Back/retry and loading in both themes, normal phones and iPhone SE. No device, wallet keys, signing, broadcast, merge or push. |
| 2026-11-03 | TX-1.BRIDGE-FUNDING | `claude/bridge-names-fees` after `018b493c` | `/tmp/bridge-names-fees-preflight.cjs` runs real preflight and protocol validation with synthetic network boundaries. Base amount 90 / balance 100 / fees 17.0001 sends 72.9999; candidate sends 82.9999 and retains submitted amount 90. Amount 10 stays 10 with bridge 17 + network 0.0001. Plain MAX 100 produces 99.9999 and byte-identical hex to base. Ordinary send and insufficient-funds failure pass. | No signing or broadcast. Device review of Reduced from, MAX and fee rows remains open. |
| 2026-11-03 | TX-1.BRIDGE-NAMES | `claude/bridge-names-fees` from `052d0b5c` | Pure Ethereum-name helper; per-route receive ticker; network rows preserve full unknown Verus names. Existing option matrix and design check pass. Throwaway `/tmp/bridge-names-fees-live.cjs` reproduces the base defect and checks live public-testnet definitions/routes: vETH/ETH for DAI and VRSCTEST conversions, DAI.vETH/DAI for Send, DAI for an ETH-source bounceback built from live definitions and live Sepolia contract metadata in the app's route shape. All downstream target labels consume the selected target ticker. Upstream has only personal email/phone contacts, with no redesign Address Book record format. | No record migration. Device QA remains open, including light/dark, iPhone SE, selected names, Back and saved-address context. No keys, signing, broadcast, simulator or emulator used. |
| 2026-11-03 | GR-4.IDENTITY-UPLOAD | `claude/identity-data-upload`, source `251ed289`, modules `4fd048e8`, base `052d0b5c` | Eight upstream modules match `0a99f88a`. Handler, confirm, wrappers, sign-in gate, original-content review, and visibility labels are wired by hand. Frozen install, parser (24 files), design (39 sources), safe-area (24 files), authority funding, iOS production bundle, 188 unchanged upstream tests / 200 with adapted handler fixtures, and Node policy/component fixtures pass. Existing test failures and baseline comparisons are recorded in the scoped checklist and local report. Temporary tests removed; no library bump. | Native encryption with VRSCTEST `zs` recipients, real funding/submission, all rendered states, normal/SE sizes, light/dark and accessibility await the device tester. No devices started, main checkout edits, merge, push or registration port. |
| 2026-11-03 | TX-1.ASSET-STACK: Final E-r4 variant 5 | `claude/asset-stack-sheet` from `ae8758e4` | Safe top row, 6/4-shape stack, hidden sum, flat SVG materials, saved per-account Jewel slots, picker swatches and persistent sheet implemented. Existing total, sync, copy, history/details, action and pre-launch contracts remain. Offline frozen install, design (39 sources), safe-area (9 files), color guard (17 materials, minimum 5.014:1), Babel (17 changed JS files), Node behavior fixtures and both production JS bundles pass. The fixtures cover 506 stack selections, stable slots, account isolation, save failure/retry, sheet taps/drags/zero-pointer reset/Reduce Motion, total/error/loading/privacy/sync states, Overview refresh gating and the screen Back/pre-launch paths. A source-derived HTML fixture was inspected in light/dark, normal/compact, peek/open and single-card states. | Owner device QA and native accessibility/motion remain open. Open history closes by header only. Source-derived fixtures substitute native controls and history rows; they do not prove native rendering or gesture arbitration. No devices, new dependencies, Jest tests, ESLint, push, merge or PR. Exact check commands and temporary fixtures: `/tmp/asset-stack-checks.local.md`. |
| 2026-11-03 | TX-1.ASSET-STACK: device QA | `claude/asset-stack-sheet` (`fe53c0c3`..`958ba89f`) | Sonnet testers on VRSCTEST: iPhone 17 Pro sim (P0–P14), iPhone SE sim (S0–S8) and Pixel 8 Android 15 emulator (A0–A9), light and dark, with an in-memory 20-ID fixture for the cap, "N more" sum, picker swatches, long names and neighbor colors. Fixed after QA: card colors can no longer block publishing cards; the front card SVG redrew late after a strip tap (darker band); body clipping cut the top strip shadow; a tap open/close on Android froze and then jumped (state now commits when the sheet rests); the sync badge now sits left of a strip amount and under the front-card amount as in the mockup. Each fix re-checked on device (Android frame recordings before/after; iOS recording after). Saved slots held across relaunch and theme. Edge swipe, Android Back (sheet first, details sheet only), row taps, refresh and copy pass. | Not proven: VoiceOver/TalkBack (tool reads the tree only), real-finger motion and Release-build performance, hidden balances on a real Android phone (the shared native blur showed readable text on the emulator, also on Home), header drag on the VRSCTEST stack at Pro height (tool limit; proven on gETH and SE), DAI.vETH bridged line on SE/Android (asset absent). Older items kept: picker opens with the current row half under the chips, picker list overhangs its sheet on Android, testnet fiat "—", 4-decimal total. Run folder: `docs/qa/matrix/runs/2026-11-03-asset-stack/` (ignored). |
| 2026-11-02 | SH-1.TEXT-ACTIONS: option B | `claude/text-action-link` from `69de19d6` | Shared link token and TextAction roles; audited clients, live v1 text buttons and recovery Change actions migrated. Design, safe-area, parser, contrast, component fixtures and both production JS bundles pass. Gift Back/Close declarations match base. No Jest tests added. | Orchestrator device QA remains open. See `text-action-implementation.local.md` for the action inventory, exclusions, routes and states. No simulator, emulator, push or merge. |
| 2026-11-02 | GR-4.NO-LEFT-BAR: content value blocks and design guard | `claude/no-left-bar` from `700fb18d` | Value blocks lose their left border, radius and indent; label colors and 4-point vertical padding / 6-point bottom margin stay. The unused `detailRowWarning` has no users and is removed. DESIGN.md records the rule. The AST guard permits only the neutral transfer connector and transparent review triangle. Design check passes (37 sources); restoring the old 3-point border fails. Start-edge width, both color properties and a recolored connector also fail; transparent color passes. Babel parses all 4 changed JS files. Changed-file safe-area check passes for 3 files; whitespace check passes. Synthetic component trees for 6 states, light/dark and both panel-tone modes match the base except for the approved removal (24 renders). Existing Jest: identity-update suite passes (1 test); content-display suite cannot load because its SVG mock lacks `Touchable.Mixin`, with the same result on a clean temporary `700fb18d` worktree. Logs: `/tmp/verus-no-left-bar.iZ0xzX/`. | Follow-up 01b36422: Existing/Active labels in light mode go from #CCC (1.6:1) to #6B7280 (4.7:1). Agent iOS QA on 01b36422 (Verus Night iOS, iPhone 17 Pro, iOS 26.5, Metro 8193, review only): added, appended, replace (action 3) and clear (action 4) pass in light and dark; no bar pixels, value text at the title edge, groups separate, strikes present. Evidence: `docs/qa/matrix/runs/2026-11-02-no-left-bar/`. Open: private/encrypted state on device, removed without metadata on device, Android, owner look. |
| 2026-11-02 | Verus JS library compatibility; identity data uploads remain unsupported | `claude/verus-libs-update` from `fabfaf12` | Four approved commit pins and scoped bn.js overrides installed with one copy per library. Hermes Buffer subarray fix verified with the app Hermes binary. Non-empty signDataMap requests stop before GenericRequest network lookups and at all three shared update-build wrappers; the existing request-error screen receives a specific non-retryable message. Existing upload-success test now verifies rejection; no UI files changed. Both release bundles and hermesc compiles pass. Check scripts: 7 pass, the 3 supplied baseline failures remain. Focused Jest: 7 passed / 5 failed suites (116 passed / 29 failed tests); full Jest once: 98 passed / 30 failed suites (777 passed / 132 failed tests). | No upload support port, signing, broadcast, simulator or device work. Review follow-up: overrides moved to package.json `resolutions` (lockfile unchanged); identityUpdateEmptyContent now expects the new client to accept daemon outer-key order and to reject all 4 value changes with its new error text. Other focused failures concern existing missing mempool mocks and the credential-decryption failure policy. No merge or push. |
| 2026-10-30 | TX-1.INPUTS follow-up: Save to address book secondary colors | `codex/compact-neutral-inputs`, uncommitted | The compact recipient chip now matches AppButton secondary colors. Dark text/icon use textPrimary on surfaceMuted; light uses primary on primaryBackground. Existing geometry and handler remain. Native iPhone 17 Pro/SE fixture captures checked in both themes. Contrast 12.22:1 dark, 4.74:1 light. Design, targeted safe-area, Babel and diff checks pass. Evidence: `docs/qa/compact-inputs/QA.local.md`. | Styling-only follow-up. No authenticated storage check, commit, merge or push. |
| 2026-10-30 | TX-1.INPUTS: compact neutral fields | `codex/compact-neutral-inputs`, uncommitted from `5fe184a7` | Shared 48-point fields use one neutral focus border, 16/22 values and no glow. Shared address entry supplies Paste/Clear, optional QR, idle prefix/last-six display and complete editable values. Send, Address Book, manual VerusID, recovery and asset identifier consumers use it. Native component fixtures pass on iPhone 17 Pro (402x874), iPhone SE (375x667) and Android 360x640, with light/dark and keyboard states. Paste/Clear, full-value handoff and Back, wrong-network error, scanner fallback/Back, names, long identifiers, password eye, search Clear, memo grow/shrink/reopen, save failure/retry and clipboard failure/late edit passed in the recorded lanes. Fixed iOS two-line clipping and Android one-line native minimum height during QA. Production iOS signed-out name/password controls also pass. Both production JS bundles, design (37 sources), explicit safe-area (10 consumers), search-field (1257 sources), Babel (15 JS files) and diff checks pass. Screenshots and exact boundaries: `docs/qa/compact-inputs/QA.local.md`; no new Jest tests. | QR hardware decoding, live identity lookup, authenticated saves/signing/broadcast and every consumer journey remain outside fixture proof. Existing Send-options checker stops on unchanged `wizardUtils.js` ESM Buffer import. Task-owned QA server stopped; refreshed devices are unbooted with no open sessions. Existing Metro 8081 remains. No commit, merge or push. |
| 2026-10-29 | GR-4 header targets and four presentation fixes | `codex/invoice-header-targets`, uncommitted from `e37b9495` | Focused pre-fix regressions reproduced repeated removal text, overlapping counts, nested requester counts and 14-point identifiers; the corrected fixtures pass. Content review stays required, and existing Sign/Share consent gates pass. Design (37 canonical sources), safe-area (7 JS files), Babel and completion checks (11 cases) pass. Terra 6.1 Extra High native QA on iPhone SE, iPhone 17 Pro and Android 360x640 measured 44 x 44 header targets; SE/Android Confirm Back and SE replacement-invoice cases passed. The clear flow retains acknowledgment and one count/badge; requester i-address fits and encrypted data shows one value count. Root then applied compact monospace to primary/private addresses after Android's primary address left one character on a new line; its base/current fixture fails/passes. Focused Android recheck at font scale 1.0 passes: primary and i-address fit on one line, full private address wraps on two, and encrypted content rows remain legible in light/dark. Screenshots and limits: `docs/qa/matrix/runs/2026-10-29-gr4-presentation/QA.local.md`. The existing `identityContentDisplay.unit.test.js` stops before running tests in the unchanged native SVG mock path: `Touchable.Mixin` is undefined. No Jest assertions or infrastructure changed. | Native plaintext/known labels and preservation of old content were not exercised by the available fixtures. Task-owned servers stopped; refreshed devices show unbooted/no open session after an Android shutdown support error. No commit, merge or push. |
| 2026-10-29 | SH-1 device QA: biometric setup and Settings password sheets | `claude/faceid-import-password-titles` `657f1415` (Opus review, Terra 6.1 simulator run, report `/tmp/faceid-qa/report.md`) | iPhone 17 Pro sim, Testnet, disposable wallets, QR scans fed through the Metro debugger: 12-word QR import with Turn on saves Face ID (was Off at base); Skip stays Off; 24-word Back then Skip stays Off; Try again after a forced setup failure keeps Face ID; a forced save failure opens the wallet, then shows "Face ID not turned on" over Home, and password sign-in works. Settings sheets B1-B5 show the approved titles, bodies and buttons, no wallet row, and "Incorrect password." on a wrong password; Face ID turns on and off. Dark B1/B3 readable. iPhone SE (Touch ID) sheet fits with the keyboard up. Signed-out recovery sheet keeps the wallet row. 11 pass, 0 fail. | The 1-second screenshot bursts did not catch the "Setting up Face ID" ring step (A1, A4); the saved flag passed and the ring reads the same value. Real Face ID prompt, Android, and NFC write not tested; owner checks Face ID on the phone. |
| 2026-10-29 | SH-1: Settings password sheets and biometric setup | `claude/faceid-import-password-titles` from `1259721b` | Password titles and primary labels name the action; optional bodies explain the password, and Settings omits the wallet row. DisplaySeed retains it. Setup snapshots the latest biometric choice from a ref, including Retry and Back. A biometric-save failure keeps password sign-in and alerts once after the setup overlay closes. Temporary non-Jest fixtures: 38 pass; both original regressions fail at the base. Design (37 sources), safe-area (5 changed JS files), Babel (5 files), and diff checks pass. ESLint cannot load the existing `import` plugin (`ERR_PACKAGE_PATH_NOT_EXPORTED`, `./lib/util/glob-util`). | Owner runs device QA: QR/NFC imports, Retry, Back with a changed choice, biometric-save failures, and Settings sheets in light/dark at normal/compact sizes. No native render or device run in this task. |
| 2026-10-29 | GR-4 follow-ups device QA and Back guard fix | `claude/gr4-followups` `f49eefc2` (Opus) on `3e4470d1` | Opus review: the removal guard blocked app navigation (claim wallet setup, v1 login return to a service); now only GO_BACK, POP and POP_TO_TOP run the request Back and other removals end the request. 16 static/harness checks pass. Android 360x640 (Terra 6.1, Maestro, run folder `docs/qa/matrix/runs/2026-10-29-gr4-followups`): first-step Back closes the request and the next link opens its own; later-step, sheet and result Back; app Light/Dark/System; other-wallet text and invoice header; signed-out claim reaches unlock. iPhone SE: other-wallet text light/dark, app appearance, invoice Back then a different invoice, contrast spots, one signed data callback. | Not caught: Back during "Preparing response"; invoice Amount step (fixed-amount invoice); iOS swipe-down (the full-screen review has no dismiss gesture). Pre-existing: invoice header Back/Close 40 points (G4-ios-03). |
| 2026-10-29 | GR-4 owner-approved follow-ups 1–4 | `claude/gr4-followups` from `1259721b`; items `92febe76`, `97e88739`, `fad9eb85`, `8916567a`; final Back correction `5444d1eb` | `DeepLink.finishRequest` guards Cancel, completion, navigation removal and unmount once. Detail handlers retain sheet/step Back, processing locks and result actions; skipped Pay with exits through Cancel. Native result Back uses Done while outside taps stay locked. The iOS invoice report has the same missing-removal-cleanup path; native reproduction remains unverified. Nested providers inherit the nearest real parent mode; standalone fallback, explicit sheet overrides and native appearance controls remain. The other-wallet caption uses the quiet details color, fixed 48-point band and optional 32-point Pay with row; no invoice header accessory/spacer. Four contrast fixes use existing text tokens; password bars stay unchanged. Ratios before → after, light/dark: selected check 2.7877 → 4.8333 / 5.8371 → 5.9808; password warning 2.2781 → 5.4584 / 10.6174 → 10.6174; password success 3.0494 → 5.2869 / 9.0716 → 9.2949; input error on page 4.0338 → 5.0216 / 6.8638 → 7.8406 (sheet dark 6.2730 → 7.1656); address type 3.0494 → 5.2869 / 8.2907 → 8.4948. Ratios use source colors and the real background roles, including the composited dark selection fill. Babel and undefined-identifier check (22 JS files), design (38 sources), safe-area checks, completion (11 cases), QA harness, copied consent harness, Back/theme/sheet fixtures and four existing Jest suites (33 tests) pass. Exact commands and output: `/tmp/gr5-validate.cjs`, `/tmp/gr5-validation.log`; contrast: `/tmp/gr5-contrast-check.cjs`. Plain pnpm commands stop at the dependency verifier's no-TTY purge check; matching existing dependencies pass with `--config.verifyDepsBeforeRun=false`. Original consent harness fails only on its removed header icon assertion; `/tmp/gr5-consent-check.cjs` replaces that block with text/target/color/row/header/Back assertions and retains all consent checks. Both original and copied sign/share mutations fail on "handler must reject unapproved items". | GR-4.6 stays open. On iOS/Android normal and compact, check sheets, all Back steps, single-card invoice skip, preparing/sending locks, success/error Done/Close, dismissal/reset followed by a different link, and a new link while review is open. Check System/Light/Dark against the opposite phone setting, native controls/send modal, installed-app visibility, text alignment/clipping and contrast states. One extra Back correction commit follows the four ordered item commits; no rebase. No device, emulator, Metro, real signing/delivery/payment, merge or push action ran. No rendered candidate or native accessibility evidence is claimed. |
| 2026-10-29 | GR-4.6 device QA and reset reveal fix | `claude/gr4-qa-fixes` `3e737b01` (Opus) on `937cefdb` | iPhone 17 Pro C1–C11 and SE N1–N6, R1–R7 passed (2026-10-28). Android 360x640 (AVD Small_360x640, Terra 6.1 via Maestro, run folder `docs/qa/matrix/runs/2026-10-28-gr4`): C1, C3, C4, C7–C10 passed with one signed sign-in and one signed data callback; C2 and C6 blocked by wallet state. G4-and-02 (after a reset the notice was in view but item 1 sat under the footer) fixed: `scrollIntoView(item, anchor)` checks the open item and aligns the notice; run 7 rechecked reset, next approval and first render. Design, safe-area and completion-flow checks and the QA and consent harnesses pass. | Pre-existing on `redesign`, not changed: G4-and-01 Android Back pops the request without clearing it, so the next link reopens it; G4-and-03 seven request containers nest `OnboardingThemeProvider` without `modeOverride` and follow the system scheme, not the app setting. Android normal size not run. Owner decides the follow-ups. |
| 2026-10-28 | GR-4 phase 3: device-QA fixes F1–F6 | `claude/gr4-qa-fixes` from `5bbdb4fb`; six item commits | Open approval items are measured after layout and revealed at a 16-point top inset after approval, Undo or reset; initial review stays still, sheets defer scrolling, and Reduce Motion disables animation. The 48-point icon band stays outside the scroll viewport. Owner-approved exception: headerless invoice fallback increases its rest gap from 16 to 48 points. Claim password reuses `KeyboardAvoidingForm`, keeps Decrypt above the keyboard and scrolls to the field. Wrapped responder labels align with the first line. Backup review uses the shared cue; bottom padding and the alignment spacer do not cause a false cue. Item details omit values that repeat the title. Babel parse (10 JS files), design (37 sources), explicit safe-area check (10 files), completion (11 cases), four existing Jest suites (33 tests), and temporary scroll/keyboard/details fixtures pass. `check:safe-areas --changed` also passes (0 files after commits). `/tmp/gr4-consent-check-qa.cjs` copies the orchestrator harness with native accessibility and animation-frame stubs only; all assertions remain, all PASS lines print, and both gate mutations fail on "handler must reject unapproved items". | GR-4.6 stays open. Device tester must check normal/compact iOS and Android, light/dark, approval/Undo/reset/growth, Reduce Motion, sheet close, icon clipping with and without the installed app, headers, claim keyboard/focus/error/QR return, cue end and item details. No device, Metro, signing, delivery, payment, merge or push action ran. The extra legacy claim checker still expects `claimResult.partialError`, absent at both base and candidate. |
| 2026-10-28 | GR-4 phase 2: item approval one at a time | `claude/gr-item-approval` from `e11d4882`; shared DataApprovalList and styles, DataRequestReview, both data containers, useDataReviewConsent and optional scrollable AcknowledgeSheet content | Built option B from the read-only light/dark references. Footer approves the first unapproved item; Undo, unreadable-data confirmation, reset notice, processing locks and accessible labels are wired. Existing consent keys, payload/session resets and handler gates remain. Temporary component checks cover both real containers, zero/partial approval rejection, Undo, identity reset, unreadable cancel/confirm and stale confirmation, processing, credential loading/error/retry/empty/partial, and invoice header handoff. Removing either handler gate makes its consent assertion fail. Approved-marker contrast is 5.29:1 light and 9.29:1 dark. `node /tmp/gr42-validate.cjs` records exact commands: design (37 sources), safe-area, completion (11 cases), Babel (16 JS files), component checks and focused lint comparison. Existing Jest: 4 suites / 33 tests pass; 2 suites cannot load because their native SVG mock lacks Touchable.Mixin, also seen before part B. No Jest tests were added or changed. The design check replaces its stale checkbox/counter requirement with approval controls and both handler gates. | GR-4.5 built. GR-4.6 remains open for orchestrator device QA; no implementation render, simulator or emulator ran. Normal ESLint has the existing import-plugin export error. Focused lint retains four unchanged unused declarations in IdentityUpdateRequestInfo, confirmed at `e11d4882`; all other touched files pass. No verification, signing, delivery or payment utility changed. Logs: `/tmp/gr42-validation-summary.log`, `/tmp/gr42-consent-final.log`, `/tmp/gr42-jest-final.log`, `/tmp/gr42-eslint-final.log`. |
| 2026-10-28 | GR-4 A3: restore review hierarchy | `claude/gr-item-approval`; DESIGN.md | Restored the five-point request-review order before the owner-approval paragraph. The card carries points 1 to 3; the requester sheet carries point 4. Documentation diff check passes. | No runtime change. |
| 2026-10-28 | GR-4 A2: restore invoice app handoff | `claude/gr-item-approval`; GenericRequestHome, InvoiceInfo, InvoicePayFlow and SendWizardHeader | The installed-app callback reaches the invoice header through an optional accessory. Its 44-point target sits directly left of Close. Headerless invoice states retain the top-right icon. DESIGN.md records both positions. Babel parse and diff checks pass. | Device QA remains open; payment and handoff logic are unchanged. |
| 2026-10-28 | GR-4 A1: restore high-risk case copy | `claude/gr-item-approval` from `e11d4882`; HighRiskStep and IdentityUpdateRequestInfo | Restored the case-specific compact-card caption and quiet note from `buildScreenCopy`. Copy says VerusID. Focused loss-of-control, revocation, content-clear and external-primary/recovery checks pass; Babel parse passes. Risk classification, acknowledgement sheet and step order are unchanged. | Orchestrator device QA remains open (GR-4.6). |
| 2026-10-28 | GR-4 phase 1: request card on every review | `claude/gr-request-card` from `0aaf9468`, implementation `0ed71e76`; shared RequestCard, RequestCardCompact, RequestName, DeepLinkRequesterSheet and useRequestRequester | Read the approved round-5 light/dark PNGs and source values. Built card, merged sheet, icon and screen copy. Existing component Jest before/after: 2 suites, 4 tests pass; no tests added or changed. `corepack pnpm --config.verifyDepsBeforeRun=false check:design` (37 sources) and `check:safe-areas --changed` (35 files) pass. Babel transform passes for all 36 touched JS files. Completion check: 11 cases pass. Delegated signer: 7 cases pass with the temporary recursive Babel loader; its direct Node command fails on an extensionless import. Exact commands and logs: `/tmp/gr4-validate.cjs`, `/tmp/gr4-validation-summary.log`. Consent, signing, selection, delivery and payment logic are unchanged. | GR-4.5 phase 2 open. GR-4.6 device QA is owned by the orchestrator. No native rendering or device operation ran. Normal ESLint fails on the existing import-plugin package export error. Focused lint has no new errors: its 5 unused helpers also occur at the base. Direct delivery/delegated checks fail on extensionless imports; recursive loading lets delegated pass, while delivery then reaches a pre-existing native TypeScript loading error. The claim check expects `claimResult.partialError`, absent at the base and candidate. No test assertions were weakened. |
| 2026-10-27 | TX-1.BATCH5 + QA | `claude/batch5-int` `8c2afaa2` (L1 `d6a8d033`, L2 `d11ae1b2`, R1 `55460313`, F1 `213008a4`, F2 `2a144900`, S7 `ba6e6f11`, S8 `a9b0fd36`) | Orchestrator review of every diff; Babel parse, design and safe-area checks pass. F1 data shapes and server funding from an unconfirmed output proven on the local VRSCTEST daemon. Device QA (Sonnet testers, `docs/qa/matrix/runs/2026-10-27-batch5/logs/`): iPhone SE all checks pass, incl. 15/3/1 and burst sends chained on unconfirmed change; Android 360x640 passes after S7/S8, incl. chained token sends and response-delivery failure. | Open: unlock took 12–140 s on the starved Android emulator (wallet without private card; SE 3–5 s) — check on a real Android phone. P3s: one bad-signature request showed "Request not valid" once (unconfirmed), Add custom asset tabs share typed text (pre-existing), pending rows refresh after about 40 s. |
| 2026-10-27 | TX-1.BATCH4 + QA | `claude/batch4-int` `06be164c` (S1 `d30ee935`, S2 `636782a3`, S3 `51e19445`, S4 `2d34b55c`, S5 `644bdd0b`, S6 `c58bcea5`) | Orchestrator review of every diff; Babel parse of 59 changed files and design check pass. Device QA (Sonnet testers): batch 4 checks on iPhone 17 Pro (`docs/qa/matrix/runs/2026-10-27-night2/logs/ios-b4/QA.md`), small-device night run on iPhone SE and Android 360x640 (same run folder). QA found the Convert hint, app-encryption result title and doubled fee-loading text; S5/S6 fixed them and the SE follow-up check passed. Every send, claim, revoke and recover matched the chain. | Small-screen layout findings and the investigations (slow unlock, second send, response timing) are in the run's MORNING_REPORT.html for the owner. |
| 2026-10-27 | TX-1.BATCH3 follow-up: stand-alone impact chips | `claude/batch3-fixes` from `f83b9047`; `AmountEstimate.js`, `InvoicePayWith.js`, `DESIGN.md` | Amount and Pay with use neutral "Details" for unknown, zero or negative impact. Difference and Price impact keep "None". PriceRouteSheet's suggestion remains unchanged and is gated by the current warning/danger level. Temporary source-expression checks reproduce both zero/negative defects before the change and now pass null, negative, zero, small positive and 0.1/1/5% cases, plus neutral tone and the unchanged "None" formatter. Babel parse (2 files), design check (34 canonical sources) and `git diff --check` pass. | No new rendered or native evidence. Orchestrator owns the open TX-1.BATCH3-QA. |
| 2026-10-27 | TX-1.BATCH3: four batch-2 follow-ups | `claude/batch3-fixes` from `389618d6`; `ConfirmPayStep.js`, `SignedInWalletSheets.js`, `RevokeRecoverStackScreens.js`, `impactFormat.js`, `PriceRouteSheet.js`, `DESIGN.md` | Read the batch-2 iOS/Android QA logs and affected screenshots. Contracts: existing `RequestTitle` and confirm/pay layout; `SelectionSheet`/`SelectionRow` with the unchanged 56-point minimum; existing authority import with focus/removal cleanup; existing Price and route fact rows with the owner-approved "None" rule. No geometry or chip-visibility deviation. Temporary Node fixtures fail on the original code for all four reports and pass after the fixes. They cover selected-row scroll scheduling, search/no results/reopen/deferred selection, authority handoff and cleanup, and Send/invoice zero, negative and positive impact labels. Babel transforms (5 files), design check (34 canonical sources), safe-area check (4 UI files) and diff whitespace pass. Worktree has a real node_modules clone and local iOS/Android API config with skip-worktree set. No simulators or Jest tests run. | Orchestrator owns independent review and TX-1.BATCH3-QA. New rendered and native evidence remains open; batch-2 screenshots establish the original defects only. |
| 2026-10-26 | TX-1.BATCH2: scoped night-run UI fixes and idle discovery diagnosis | `claude/batch2-fixes` from `839e94c8`; `SignedInAssetHeader.js`, `cardPresentation.js`, `SignedInWalletSheets.js`, `impactFormat.js`, `RevokeRecoverIdentityForm.js`, `SendWizardSuccess.js`, `ConfirmPayStep.js`, `DESIGN.md` | Read F-and-04, F-ios-22, F-ios-23, F-and-42 and F-and-25 and their screenshots. `CoinCardPickerSheet` already has no pending line. Babel parse, design check, safe-area check and temporary Node component/logic fixtures pass. The fixtures fail on the original revision for small differences, mixed network lists, the currency sheet shell and the self-send caption. The fixtures do not prove native layout. Discovery runs on every accepted `SET_BALANCES`; Home focus and pull can refresh expired balances, while idle polling runs every 300 s with about 45 s jitter. Address-balance cache age is 5 s. No polling change. | Orchestrator owns the open TX-1.BATCH2-QA matrix. If discovery must be faster, choose an arrival signal or a targeted visible-Home refresh policy with a network-load budget. |
| 2026-10-26 | ID-1.MANUAL-ROW: Link VerusID shows "Enter VerusID manually" only when the automatic lookup fails; the list drops VerusIDs that no longer use the wallet address | `claude/link-verusid-manual-row` from `ae800e71`; `LinkExistingVerusIdSheet.js`, `IdentityPickerSheet.js`, `IdentityPickerSheet.unit.test.js` (fixture), `DESIGN.md` | Owner request: on mainnet the row made no sense because the lookup works. Read-only RPC: `getidentitieswithaddress` answers on `api.verus.services` and `api.verustest.net` (identity index on). VRPC keys hold one R-address, so the lookup covers every VerusID the manual step could link. Rule now as in the revoke and recover picker: the row shows on "lookup unavailable" or "lookup failed", not while loading, not with results or an empty result. `IdentityPickerSheet` reserves the 62-point row only while the row or the manual step shows (`onManualRoomChange`), so the manual step keeps its old height. Found on the way: the lookup asks for history (`unspent: false`); for `RWCqoWfS…` the index returns 16 VerusIDs, 6 of them (for example crumble, grumble) no longer use the address but are active, so the list showed them and a tap failed the ownership check. Discovery now keeps a VerusID only if its current primary addresses hold the wallet address. iOS 17 Pro task sim (clone of GiftList QA, deleted after), Metro 8193 from the worktree, disposable testnet wallet "GiftList QA", dark: VerusID tab empty result (no row), 2 real IDs (no row), index-off and failed lookups simulated through the Metro debugger (row shows, opens the manual step, Back returns), sign-in request from the deeplink harness: picker list (no row, 62 points shorter), index-off (row, sheet 62 taller), manual step (same height as before); stale IDs before and after the filter (address set in memory, nothing linked). Two picker test fixtures had an empty `primaryaddresses` for an ID found by the wallet address, which real data cannot produce; they now hold the wallet address. Related Jest suites pass (3 suites, 9 tests), `check:design`, `check:safe-areas`, Babel parse, `git diff --check`. Evidence (ignored): `docs/qa/link-verusid-manual-row/`. | Not run: light mode, iPhone SE, Android, a real mainnet wallet with VerusIDs (owner phone), the prefilled manual step from a failed passthrough link. A wallet without VerusIDs now sees only "No VerusIDs were found for this wallet." with no next action. |
| 2026-10-26 | RX-2.REQUEST-CLOSE: close button on Request and Request ready | `claude/receive-request-close` from `b24dd110`; `ProgressHeader.js` (`onClose`, `closeLabel`), `ReceivePaymentRequestFlow.js`, `ReceiveAssetDetails.js`, `DESIGN.md` | Owner asked for the same close button on the Request steps. `ProgressHeader` shows `HeaderCloseButton` in its right slot when it gets `onClose`, mirrored with the back arrow. Close cancels a pending request and lets the route removal through; Back, the swipe gesture and Done keep their old behavior. iOS 26.5, Metro 8097 from the worktree. "Verus Private Send QA" (iPhone 17 Pro, disposable Testnet wallet "BGR QA"): Home → Receive assets → Verus Testnet → Transparent → Request amount → Close returns to Home from Request (keyboard up) and from Request ready; from the asset screen, Close returns to the asset screen; Back from Request returns to the address, Back and the edge swipe from Request ready return to Request with the amount kept; Done returns to the address; light and dark. View tree: Back [16,78][60,122], Close [342,78][386,122] on a 402-point window. "Verus Sync Compact QA" (iPhone SE, disposable Testnet wallet "BGR SE", Touch ID worked again): both steps in light and dark, Close returns to Home. Checks: `check:design`, `check:safe-areas` (3 files), Babel parse (3 files), `git diff --check`. Evidence (ignored): `docs/qa/receive-request-close/`. | Not run: Android, VoiceOver, Close while "Creating payment request" shows (creation finished in under a second). |
| 2026-10-26 | RX-2.CLOSE: close button on Receive | `claude/receive-close` from `12f07b15`; new `HeaderCloseButton.js`, `ReceiveAssetDetails.js`, `DESIGN.md` | Owner asked for a close button at the top right, as in Send and Convert, because two Back taps were needed. Exemplar: `SendWizardHeader` close (22-point `close`, `textPrimary`) in the 44-point target of `OnboardingBackButton`. Close pops the Receive routes on top of the main stack, so it returns to the screen that opened Receive. iOS 26.5, Metro 8097 from the worktree. "Verus Private Send QA" (iPhone 17 Pro, disposable Testnet wallet "BGR QA"): Home → Receive assets → Verus Testnet → Transparent → Close returns to Home in one tap; Back still returns to the list; Request amount hides the stack header, and Back from it shows Close again; from the asset screen, Receive → Close returns to the asset screen; light and dark. View tree: Back 44 × 44 at x 16, Close 44 × 44 ending 16 points from the right edge. "Verus Sync Compact QA" (iPhone SE, new disposable Testnet wallet "RC SE"): light and dark, Close returns to Home without the list showing in the animation. Checks: `check:design`, `check:safe-areas` (2 files), Babel parse (2 files), `git diff --check`. Evidence (ignored): `docs/qa/receive-close/`. | Not run: Android, VoiceOver, the "Choose a Card" and error states (same header). The Request steps keep their own header without Close. |
| 2026-10-26 | TX-1.BATCH1: identity fee from an R-address, convert below fees, node rejection text, no preflight after a send, Close only after "Status unknown", own-address notice, invoice paid before | `claude/send-batch1` from `05b70ac3` (with `claude/identity-fee-r-address`); `SendWizardConfirm.js`, `SendWizardNavigator.js`, `InvoicePayFlow.js`, `InvoiceInfo.js`, new `paidInvoiceStorage.js`, `updateIdentity.js`, `ConfirmPayStep.js`, `UpdateIdentityForm.js`, `DESIGN.md` | Night-run issues 5–9 and 11, owner decisions of 2026-10-26 (light own-address warning; invoice warning that still allows paying; Close only after "Status unknown"). Identity fee cause reproduced with real chain data: a token passing through to change added a zero delta. Device QA on the iPhone 17 Pro simulator and the Pixel 8: every check passed, including a real identity update paid from the R-address, invoice paid before and "may have been paid", conversions on the private testnet with no "Method not found", and the node rejection text on the public testnet. | P3: Sent after an own-address send says "You sent 0.0011" while only the fee left; the identity-update pay step keeps its "Select a payment source" line after the fee shows; one slow invoice reopen under heavy host load (unconfirmed). The invoice record is per device. |
| 2026-10-26 | TX-1.OFFLINE-HISTORY: offline send, status unknown, history amounts and fees, connection card | `claude/offline-and-history-fixes` from `e3d7b53b`; `vrpcInterface.js`, `vrpc/requests/send.js`, `SendWizardConfirm.js`, `standardizeTxObj.js`, `vrpc/updates.js`, `Home.js`, `SignedInWalletHome.js`, new `ConnectionNotice.js`, `Overview.js`, `SignedInAssetHeader.js`, `web3Interface.js`, ETH and ERC-20 balance requests, `LinkExistingVerusIdSheet.js`, new `connectionErrors.js` and `runRefreshUpdates.js` | Night run issues 1–4: an offline send hung 70–103 s, the sent amount included the fee, the own change address showed in To, a token send read "Sent −0.0002", and refresh spun forever. Two device rounds on the iPhone 17 Pro simulator and the Pixel 8, with a local failure proxy (hang, drop, held broadcast): every check passed, and history matched the chain for every send checked. Found on the way: the ethers 6.15 FallbackProvider keeps a failed first network check, so Ethereum never recovered after an offline start; the iOS swipe closed the whole wizard during a broadcast. Both fixed. | Owner approved the connection card on 2026-10-26; it is in `DESIGN.md` (Home notification card, Connection card). Owner chose Close only after "Status unknown" (not built yet). Open: small devices; after "Status unknown", Back lets the user edit into a locked Confirm (TX-1.A19 lock); the offline message on Confirm stays after the connection returns (P3). |
| 2026-10-25 | SH-1.RECOVERY-FACEID-LOOP: signed-out "View recovery secrets" asks for Face ID once | `claude/recovery-faceid-loop` from `3fe438cb`; `DisplaySeed.js`, `DESIGN.md` | Owner saw Face ID repeat without end on the phone. Cause: iOS makes the app "inactive" while its Face ID sheet is open; `DisplaySeed` locked on every non-active state, so it closed the unlock sheet, dropped the result (new session token) and reopened the sheet on "active", which started Face ID again. Fix: ignore "inactive" while `isBiometricPromptOpen()`, and accept a result that arrives before "active" (reject only in the background). iOS 26.5 "Verus GR3 QA", Metro 8093, GR3 Test 2 (testnet, Face ID); the Face ID read was wrapped through the JS debugger to send "inactive", then "active" (no app code). Before: about one read per second (12 in the first 13 s, 30 before the probe stopped it), screen stuck on "Secrets are locked". After: 1 read, then the concealed secrets, with "active" before or 1.5 s after the result. Background → active: privacy cover, then one read and unlocked. "Inactive" without a Face ID sheet still locks and asks once on return. Cancelled read: password form with Face ID and Unlock, no repeat; Face ID retry unlocks. `check:design`, `check:safe-areas` (1 file), Babel parse, `git diff --check`. | A real Face ID sheet on the phone; Android (no "inactive" state there, so the old loop cannot occur). |
| 2026-10-25 | SH-1.UNLOCK-CANCEL-COPY: a cancelled "Use Face ID" says "Face ID was cancelled." | `claude/faceid-cancel-copy` from `eafb7012`; `UnlockWalletSheet.js`, `DESIGN.md` | Owner accepted the shorter line. The iOS keychain cancel (`-128`, errSecUserCanceled) and the Android `E_BIOMETRIC_AUTH_CANCELLED` now show "<biometry name> was cancelled." after a tap on "Use Face ID". iOS 26.5 "Verus GR3 QA", Metro 8092 from the worktree, Testnet `GR3 Test 2`, a temporary rejecting Face ID read through the JS debugger (no code change): automatic prompt cancelled shows the form with no line; button cancel shows "Face ID was cancelled."; a non-cancel error (`-25293`) keeps "Biometric unlock is unavailable. Enter your password to continue." Babel parse. | Real cancel on the phone (Verus Dev build from this branch), Android. |
| 2026-10-25 | SH-1.UNLOCK-FACEID: Face ID unlock opens on the loader, no password form behind the prompt | `claude/faceid-unlock-loader` from `cd4c9890`; `UnlockWalletSheet.js`, `DESIGN.md` | Cause: the sheet showed the form until the unlock started, which was only after the biometric read returned. New state: a biometric wallet shows `WalletUnlockLoadingContent` from the first frame until the read and the unlock end; the form shows after a failed, cancelled or unavailable read and then takes focus; "Use Face ID" checks support first, then shows the loader; the row uses `BiometricAffordanceIcon`; the sheet resets in `onClosed`, so a reopened sheet starts right. iOS 26.5 "Verus GR3 QA", Metro 8091 from the worktree, Testnet, disposable `GR3 Test 2` (Face ID) and `PI QA iOS` (password). The simulator returns the biometric read at once without a prompt, so the old build showed no flash there; with a temporary 1.5 s delay added to the read through the JS debugger (no code change), `redesign` showed the form and "Use Face ID" for the whole wait, the branch showed only the loader, then Home. A temporary rejecting read (cancel stand-in): loader, then the form with the Face ID icon and the keyboard; "Use Face ID" showed the loader, then the existing error. Face ID unenrolled: the form with "Use biometrics" and the keyboard; the retry keeps the keyboard and shows the error. Retry after enrolling unlocked to Home. Password wallet unchanged (form and keyboard at once; wrong password shows "Incorrect password." and refocuses). Light and dark. Checks: Babel parse, `check-design-contract`, `check-safe-area` on the file. | Real Face ID prompt on the phone (next phone build), Android biometric prompt, request unlock through `WalletUnlockCoordinator` (same component, not run). Existing copy after a cancelled "Use Face ID": "Biometric unlock is unavailable. Enter your password to continue." is wrong for a cancel (not changed). |
| 2026-10-25 | AL-1.CARD-SHEET-TIDY: no count line, no repeated network, 6 rows fit on the SE | `claude/card-sheet-tidy` from `7f0d95ef`; `CoinCardPickerSheet.js`, `GiftCardCurrencyPickerSheet.js`, `DESIGN.md` | Owner asked to drop "3 cards available", fix the repeated "Verus Testnet" and fit 6 rows on the SE. Both sheets drop the count line (the search field still announces results). Network line only when the list has more than one network, never when it equals the row name; the gift amount drops its ticker. Card rows without the network line are 60 points. Below 7 items the sheet may grow past 76%, up to 16 points under the top safe area. Chrome follows the measured layout: 74 points for Choose a card (`SemiModal` 10-point top padding included) plus 8 of margin; 132 for Choose currencies without the field, plus 8. iOS 26.5, task-only simulators "VM Cards Pro" and "VM Cards SE", Metro 8115 from the worktree, a temporary QA screen (removed, not committed) that renders the real sheets with made-up Testnet cards and currencies: 3, 6, 6 on two networks and 7 cards; 1, 6, 6 on two networks and 7 currencies; light on both sizes, dark for 3 and 6 cards and 1 and 6 currencies. SE before: 6 cards showed 4.5 rows and 6 currencies 5 rows; after: all 6 show in both, also with two networks (the sheet grows). 7 items keep the field and scroll at 76%. `check:design`, `check:safe-areas`, Babel parse, `git diff --check`. Evidence (ignored): `/tmp/vm-card-sheet/shots/`. | Not run: a real wallet (the data was made up), Android. |
| 2026-10-25 | IMG-1.ZSECRET-LABELS: shorter button labels on the Z recovery secret intro | `claude/zsecret-labels` from `7f0d95ef`; `ZSeedSetupFlow.js` | Owner: both labels were too long; the secondary one was cut off on every phone, the primary one on the SE. "Create new Secret Recovery Phrase" is now "Create new phrase"; "Import Secret Recovery Phrase or spending key" is now "Import phrase or key". The terms match the warning notice ("Secret Recovery Phrase or spending key") and the import field label. iOS 26.5 task simulator "Verus Labels SE" (iPhone SE), Metro 8098 from the worktree, a new disposable Testnet wallet with no funds: Settings, Profile, Z recovery secret, "Use another secret": both labels on one line in light and dark; "Import phrase or key" opens "Import Z secret", "Create new phrase" opens "Recovery phrase", Back returns to the intro. | Android open. Not changed: the secondary button is 52 points high and the primary 56 (both 44 on the SE); the import field label sits directly under the body text. |
| 2026-10-24 | AL-1.SEARCH-MIN-SHEETS: search and filter chips show from 7 items in six more places; the controls reset when they hide | `claude/search-min-sheets` from `137af32e`; `CoinCardPickerSheet.js`, `IdentityPickerSheet.js`, `LinkExistingVerusIdSheet.js`, `AddressBookSheet.js`, `SendWizardRecipient.js`, `GiftCardCurrencyPickerSheet.js`, `GiftCardFund.js`, `AddressBook.js`, `InvoicePaymentOptions.js`, `ManageAssets.js`, `DESIGN.md` | Owner approved on 2026-10-24. Count = the whole list before search and filters. Hidden: empty query and default filters, and the state resets when the count drops below 7. Choose a card also hides its chain chips; its chrome height is 114 points (226 or 278 with the controls). Link VerusID counts only after the lookup ends; the link step tells `IdentityPickerSheet`, which reserves the 60 points for the field only while it shows. Saved addresses takes the count from the recipient step (known before the sheet opens) and sizes to its content when the field is hidden. Choose currencies: the list starts 14 points under the subtitle; the opening control hint is now "Opens the currency list." Address book uses 7 instead of 6. Pay with uses 7 instead of 5 on `cards`, which is the whole list. iOS 26.5, task-only simulators "VM Search Pro" (iPhone 17 Pro) and "VM Search SE" (iPhone SE 3rd generation), Metro 8110 from the worktree, new disposable VRSCTEST wallet "Search QA" funded with 2 VRSCTEST from the local daemon; three test IDs got its address as an extra primary address and were restored afterwards. Hidden, real data, light on both sizes and dark on the Pro: Choose a card (3 cards), Link VerusID (3 and 1 candidates, in the VerusID tab and in the sign-in picker, with the manual step and the keyboard), Saved addresses (3), Choose currencies (1), Address book (3). Shown, real data on the Pro: Address book and Saved addresses with 7 entries. Shown with a temporary, reverted limit of 1: Choose a card (type chip works), Link VerusID (sheet 60 points taller), Choose currencies, Saved addresses. Reset: Address book with search "Bob" or the Verus filter, then a delete (7 to 6): controls hide, all 6 rows show; adding the 7th brings the controls back with All and an empty field. Manage assets with a temporary limit of 2: on Hidden, removing Testnet Ethereum hides the controls; adding it back shows them with All selected. `check:design`, `check:safe-areas`, Babel parse, `git diff --check`. Evidence (ignored): `/tmp/vm-search-min-sheets/`. | Not run: Android, a real "Pay with" (the harness cannot make burn invoices; source only), a real wallet with 7 cards, 7 VerusIDs or 7 currencies, the reset on Choose a card, Link, Saved addresses and Choose currencies (their count cannot change while the sheet is open; source only). With 6 cards on the iPhone SE, the sheet (76% cap) shows about 5 rows; the other rows scroll. The Link list keeps its six-row height. `check:search-fields` fails on the existing hand-rolled input in `AddAssetByIdentifier.js:205`. |
| 2026-10-24 | IMG-1: one picture system (line glyphs) for empty states and icon-led steps | `claude/imagery-glyphs` from `2709273e` (`3d551fba`, `redesign` `137af32e` merged in); new `EmptyState.js`, `StepGlyph.js`, `glyph.styles.js`; `GiftCardServiceOverview.js`, `SignedInVerusIdService.js`, `AddressBook.js`, `ImportNfc.js`, `ZSeedSetupFlow.js`, `SpendableKeyRequestInfo.js`, `UseBiometrics.js`, `ShieldedAddressSetup.js`; three `empty-*.png` removed; `DESIGN.md` (Imagery); `check-design-contract.js` | Owner chose option A of the imagery review: Lucide glyphs, stroke 1.8. Empty and failed lists (Gift cards, VerusID, Address book) use `EmptyState`: 64-point glyph in `textSubtle` (`Gift`, `AtSign`, `BookUser`; `CircleAlert` for a load error), `titleSheet` title, optional line, one action. Load errors no longer repeat the title in a line. VerusID drops "VerusID explained" (the header ⓘ opens the same sheet). Address book gets a title. Icon-led steps use `StepGlyph` (72 points, `textPrimary`): Face ID and Shielded address unchanged; Z recovery secret `ShieldEllipsis`, Decrypt spendable key `KeyRound`, NFC import `Nfc`. NFC import moves from the centred Paper layout (blue title, upper-case button) to the signed-out step layout with `AppTextInput`, `AppButton` and a footer above the keyboard. iOS 26.5 task simulators "Verus Imagery QA" (iPhone 17 Pro) and "Verus Imagery SE", Metro 8097 from the worktree, a new disposable Testnet wallet with no funds: before and after in light and dark for every state; errors and the encrypted NFC state forced with a QA-only switch that is not committed; a claim link with a random key and no funds built in the app for Decrypt spendable key. `check:design` and safe-area checks pass. `check:spendable-key-review` and `check:search-fields` fail the same way on `redesign` (not this change). | Android open. Real NFC card read and decrypt open. `nfcImportSubmission.unit.test.js` already fails to load on `redesign` (its `react-native` mock has no `Platform` or `StyleSheet`); it also expects the old Title Case labels. Existing, not changed: Z recovery secret buttons truncate their labels. |
| 2026-10-24 | AL-1.MANAGE-SEARCH-MIN: Manage assets shows search and tabs from 7 assets | `claude/manage-assets-search` from `5935370c`; `ManageAssets.js`, `manageAssets.styles.js`, `DESIGN.md` | Owner approved on 2026-10-24: below 7 assets, hide `AppSearchField` and the All / On Home / Hidden tabs on Manage assets; count = "Your assets" + "New assets found" (not the tab, not the search text); Add asset unchanged. Hidden: effective query `''` and filter `'all'`, so a user on Hidden or with typed text is not left in a filtered list (empty text cannot say "No matching assets" or "No hidden assets"). No header: the "Your assets" title starts 24 points under the header (6 points of list padding on top of the title's 18). iOS 26.5, two task-only simulators (iPhone 17 Pro and iPhone SE 3rd generation, disposable VRSCTEST wallets, Metro from the worktree), light and dark: with the committed 7, a 2-asset wallet shows no field and no tabs and the list starts at the same place on both. The testnet catalogue has 2 assets (Verus Testnet, Testnet Ethereum; Add asset lists both as Added), so 7 was not reachable. With a temporary, reverted threshold of 2: field, tabs, search ("eth", "zzz"), Hidden and the Remove sheet work on both sizes; removing Testnet Ethereum while on Hidden (count 2 to 1) drops the controls and shows Verus Testnet, not "No hidden assets"; adding it again brings the controls back with Hidden still selected. `check:design`, `check:safe-areas --changed`, Babel parse. Evidence (ignored): `/tmp/vm-manage-search/`. | Not run: a real wallet with 7 assets, Android, "New assets found" rows (they come from balance lookups; late ones can add the controls while the screen is open). `check:search-fields` fails on the existing hand-rolled input in `AddAssetByIdentifier.js:205`. |
| 2026-10-24 | TX-1.SEARCH-MIN-ITEMS and RX-2.LIST-TITLE: search from 7 items; Receive assets title in the header | `claude/search-threshold` from `2709273e` (`5935370c`); `AppSearchField.js` (`APP_SEARCH_MIN_ITEMS`), `ReceiveAssetsList.js`, `receive.styles.js`, `SendWizardSelectSource.js`, `SendWizardSelectTarget.js`, `DESIGN.md` | Owner approved both recommendations. The count is the whole list before the search text; while Receive loads, the coin count decides. iOS 26.5, Metro 8091 from the worktree, same simulators and disposable Testnet wallets as TX-1.ASSET-ROW-SIZES ("BGR QA" on the iPhone 17 Pro, "BGR SE" on the iPhone SE). Real data: Receive (2 assets) and Select asset (1 asset) show no field; Convert to (more than 7 currencies) keeps it; light and dark on both sizes. View tree: the Receive title is centered in the header; the first Receive row starts 12 points under the header, so its content starts 24 points under it. Back from the address screen returns to the list with the title; Back from the list returns to the wallet. Temporary, reverted limit of 1: Receive and Select asset show the field 24 points under the header and 14 points above the rows, as before; typing "eth" leaves Testnet Ethereum; restoring 7 with "eth" still typed hides the field and shows both rows. Checks: `check:design`, `check:safe-areas --changed` (5 files), Babel parse (5 files), `git diff --check`. Evidence (ignored): `docs/qa/picker-row-sizes/st-*`. | Not run: Android, a real wallet with 7 or more assets, the Receive loading state. The Receive header title sits 14 points higher than the Send wizard title: Receive uses the shared stack header (as Settings pages do), the wizard its own taller header with the progress bar. |
| 2026-10-24 | TX-1.CONVERT-GROUP-LABELS: smaller Convert to group titles | `claude/convert-section-labels` from `fde73efa`; `SendWizardSelectTarget.js`, `DESIGN.md` | Owner asked for "a little bit smaller" labels in capitals. "POPULAR CONVERSIONS", "PRE-LAUNCH" and "MORE CONVERSIONS" now use `labelSm` (13/18 semibold) with the 0.5 tracking and capitals kept; before they were 14/19. Same simulators, wallets and Metro port as TX-1.ASSET-ROW-SIZES: Convert to in light and dark on the iPhone 17 Pro and the iPhone SE. Checks: `check:design`, `check:safe-areas --changed`, Babel parse, `git diff --check`. Evidence (ignored): `docs/qa/picker-row-sizes/csl-*`. | Android not run. |
| 2026-10-24 | TX-1.ASSET-ROW-SIZES: asset list rows after Receive, Send and Convert take the wallet row sizes | `claude/picker-row-sizes` from `cc7c96a7` (`83d06313`); `receive.styles.js`, `ReceiveAssetsList.js` (skeleton), `SendWizardSelectSource.js`, `SendWizardSelectTarget.js`, `DESIGN.md` | Owner asked for the wallet sizes on these lists, Convert to included. Exemplar: `SignedInWalletHome.js` rows (`4da25b17`). iOS 26.5, Metro 8091 from the worktree: "Verus Private Send QA" (iPhone 17 Pro) with disposable testnet wallet "BGR QA" and "Verus Sync Compact QA" (iPhone SE) with "BGR SE", Testnet profile; each got 0.3 VRSCTEST from the local VRSCTEST daemon so Send and Convert open. After: Receive assets (with "N/A" and $0.00), Select asset from Send and from Convert, Convert to (Popular, Pre-launch with "Launches in about 2 years", More) in light and dark on both sizes. View tree: Receive rows are 68 points high on both, as on the wallet screen. Before (old styles restored in the worktree for the shots, then put back): Receive, Select asset and Convert to on both sizes. The red dev toast "no runners?!" on Convert to also shows on the old build. Checks: `check:design`, `check:safe-areas --changed` (4 files), Babel parse (4 files), `git diff --check`. ESLint does not load (known config failure). Evidence (ignored): `docs/qa/picker-row-sizes/`. | Not run: Android, the Receive skeleton (loading is too short to catch), "· N Cards" on Select asset (no wallet with funds on two cards), hidden balances, long names. |
| 2026-10-24 | Owner feedback from the phone build: arrow back on Receive and the VerusID page, no gift card intro, card rail snap | `claude/back-gift-rail` from `250d242d`; `header.js` (`createRedesignedHeaderOptions` draws `OnboardingBackButton`), `ReceiveAssetsList.js`, `ReceiveAssetDetails.js`, `SignedInVerusIdDetails.js`, `GiftCardService.js`, `GiftCardServiceOverview.js`, `GiftCardServiceIntroSlider.js` (deleted), `SignedInAssetHeader.js`, `DESIGN.md`, design check (`headerBackTitle` rule) | Owner approved the three recommendations on 2026-10-24. Rail cause found with temporary, removed logs: when a pan ends, `react-native-gesture-handler` resets its iOS recognizer and reports END → BEGAN with 0 pointers (`RNPanHandler.m` `reset`); `useAnimatedGestureHandler` ran `onStart` for it, which cancelled the snap and left the cards where the finger lifted (seen on `250d242d`: the rail stopped at 0.75 (logged) and about 1.15 (screenshot) while the selection moved). Fix: `onStart` ignores a BEGAN that does not come from UNDETERMINED; the snap is a spring that starts at the finger speed; a flick of 500 pt/s or more changes the card; past the first or last card the rail stretches up to a quarter card and springs back. iOS 26.5, Metro 8089 from the worktree: "Verus Private Send QA" (iPhone 17 Pro, own app data) with new disposable testnet wallet "BGR QA" (custom seed, Face ID, Z card added, so VRSCTEST has 2 cards) and "Verus Sync Compact QA" (iPhone SE) with disposable "BGR SE". Rail: swipe to the next card, back, and a drag past the first card all end centered (video frames and screenshots). Receive list and details: arrow back, Back works (details → list → Home), light and dark, SE dark. Gift cards on a wallet without cards: list empty state at once (light, dark; SE light, dark); Create and + open the sheet; Not now keeps the list; I understand opens Create gift card; later creates and creates after an app restart skip the sheet. Settings sub-page and asset screen headers unchanged. Checks: `check:design` (32 sources; the new rule fails on a probe file), `check:safe-areas --changed` (7 files), Babel parse (8 files), focused ESLint (only existing unused imports in `header.js`), `git diff --check`. Evidence (ignored): `docs/qa/back-gift-rail/`. | Not run: Android, a real-finger flick (Maestro swipes reach about 220 pt/s), the 3-card wrap-around rail after the fix, the VerusID page (no linked VerusID in the test wallets; same shared header), a Release build. The arrow sits 26 points from the edge as in Settings; Gift Cards and Address Book draw theirs at 22 and the asset screen at 18. |
| 2026-10-24 | RX-1.GENERIC-REQUEST: Receive payment requests use GenericRequest | `claude/receive-generic-request` from `250d242d` (`89d39f0e`); `receiveInvoice.js` | Owner asked for the modern link; older wallets that cannot read GenericRequest are accepted. `generateReceiveInvoice` now wraps the same `VerusPayInvoiceDetails` in an unsigned `GenericRequest` (testnet flag on testnet) and returns `toWalletDeeplinkUri()`; no network call. A temporary (deleted) Jest check of the real function: 8 of 8 pass (testnet and mainnet flags, 1.5 → 150000000, fiat amount, 1% and default 0.5% slippage, PBaaS network, VerusID destination, `isRequestRequiredSignature` false). iOS 26.5 "Verus Alerts QA", Metro 8095 from the worktree, new disposable testnet wallet "rgrqa2" (no funds): Receive → Verus Testnet → Request amount 0,25 with conversions → Request ready; the QR decodes (CIDetector) to `verus://1/…` (88 characters): one invoice detail, unsigned, testnet on request and detail, 25000000, VRSCTEST, destination = the wallet R-address, conversion with 500000 slippage. The share preview reads "Please pay me 0.25 VRSCTEST with ver…". `simctl openurl` of the decoded link opens Pay with (slip "Unsigned", 0.25 VRSCTEST, To the address), then "No way to pay this invoice"; X returns to Home. Babel parse, no-undef/unused ESLint, `git diff --check`, `check:design`. Evidence (ignored): `docs/qa/receive-generic-request/`. | Not run: a real payment of the new link, Android, a camera scan, a PBaaS or VerusID card on a device. The old `Coin/ReceiveCoin/ReceiveCoin.js` (hidden while `ENABLE_SIGNED_IN_REDESIGN` is on) still builds v3 links. A first disposable wallet "rgrqa" on the same simulator has an unknown password (agent-device typing). |
| 2026-10-23 | AL-1.SYSTEM-POPUPS: last reachable native alerts become the app alert sheet | `claude/system-popups` from `0c84d7a6` (`9b895646`); `sagas/deeplink.js`, `vrpcInterface.js`, `authDataStorage.js`, `agama-wallet-lib/keys.js` | Reach traced in source: 50 native calls, about 44 unreachable with the redesign on, v1 login kept. iOS 26.5 "Verus GR3 QA" (402 x 874), Metro 8090 from the worktree, bundle checked for the new texts. Valu question through a temporary, reverted "Valu installed" patch and a test link that prefers Valu Mobile: sheet, "Not now" and an outside tap continue in Verus Mobile (the altered test link then fails its signer check, as expected), "Open Valu Mobile" tries the Valu link (not installed, so the existing "Cannot open request" sheet shows). Start-up error through a temporary, reverted throw: sheet after the start cover, light and dark, Close closes it. Key warning through a temporary, reverted forced check: sheet after a Face ID unlock of disposable "GR3 Test 2" (testnet), so the on-demand `require` loads. Babel parse, focused ESLint (one existing `KEY` undefined in `authDataStorage.js`), `check:design`; 16 related Jest suites: the same 4 suites and 23 tests fail on `redesign` without the change. Evidence (ignored): `docs/qa/system-popups/`. | Unlock edge cases are source-only (the unlock sheet blocks them). Android not run. The key warning repeats on every key derivation, as the old box did. |
| 2026-10-23 | GR-3.CLAIM-ANIMATION and GR-3.CLAIM-RESULT: "Claiming funds" animation A and the claim result copy | `claude/claim-animation` from `d04ab115` (`redesign` `58e29f07` merged in); new `ClaimingFundsView.js`; `SpendableKeyRequestInfo.js`, `SecureLoading.js` (`illustration`, `contentStyle`, `statusStyle`), `ticketOutline.js` (corner and notch), `GiftCardFixedCard.js` (exports the material), `spendableKeyRequestInfo.styles.js`, `DESIGN.md` | Design contract: approved mockup A (`/tmp/vm-mock-claim`), `SecureLoadingView`, wallet setup E check, Sent step. iOS 26.5 "Verus GR3 Compact" (iPhone SE), public testnet, Metro 8083, disposable wallet "Claim QA" (fresh seed, green icon, Touch ID) funded with 2 VRSCTEST from the local daemon: four real gift card claims of 0.0499 VRSCTEST through Cancel gift card → Review redemption → Claim (light, dark, Reduce Motion, and one on the merged build without a hold). Loop, 15-s line (a temporary, reverted 20-s hold), hand-off and result in light and dark; the check stays clear on the green icon; a real 2-s broadcast fades the coin that had just left the card; Reduce Motion shows only the dots and fades. Result: one transaction (real) in light and dark; several transactions, partial failure and network error through a temporary, reverted fake-result patch. Normal size ("Verus Sync QA", 402 x 874): loop through a temporary, reverted harness on the landing screen. Babel parse, minimal ESLint, `check:design`, `check:safe-areas --changed`, `git diff --check`, `genericResponseNetwork` test pass. Evidence (ignored): `docs/qa/claim-animation/`. | Android not run. Not seen on a device: a real partial failure or multi-chain claim, a VerusID claim, a wallet without an icon, a currency without a logo. In the debug build a short blank shows while the result renders. The VRSCTEST logo's dark disc stays as `AssetCoinLogo` draws it on every dark surface. |
| 2026-10-23 | Stepped tasks: step titles in the header (wallet setup, wallet import, gift card fund) | `claude/step-titles` from `1bec9667`; `ProgressHeader` (`rightAction`), `CompactSetupHeader`, new `setupStepTitles.js`, new shared `HeaderContextBand` (Send/Convert `WizardContextBand` now draws on it), `signedOutFlow.styles.js` (`afterHeaderTitle`), `tokens.js` (`stepTopWithHeaderTitle`), `CreateProfile`, `ChooseName`, `CreatePassword`, `UseBiometrics`, `BiometricAffordanceIcon`, `SeedIntro`, `SeedWords`, `ShieldedAddressSetup`, `ImportSeed`, `ImportText`, `ImportWallet`, `ZSeedSetupFlow`, `GiftCardFund`, `DESIGN.md`, design check | Owner approved the direction, the titles and gift card option A from the HTML mockups. Icon-led screens (Face ID, shielded address, NFC, Z secret intro) keep their large title with an empty header title. Repeats removed: placeholders that restated their label, "Enable Face ID" (now "Turn on"), the shielded title and switch label, the import title "Word N of 24" over the same field label. Real taps on two task-owned iOS 26.5 simulators, Metro from the worktree on port 8086: `Verus Steps Compact` (iPhone SE, fresh install, testnet wallet "Steps SE" from a disposable custom seed) and `Verus Steps QA` (iPhone 17 Pro, clone of `Verus GR3 QA`). SE: name (empty, keyboard), password (empty, typing, mismatch error, info sheet from the header button), Back up, three phrase pages, Verify (empty, keyboard, three words; the chips stay in view), shielded (light, dark), import text (empty, keyboard), gift card Create, Build the gift and Another wallet with the card band (light, dark); dark back-walk of the header titles. Pro: name, password (light, dark, keyboard), Face ID (big title, "Turn on"; light, dark), Back up, phrase page, Verify with keyboard (light, dark), phrase import empty and typing ("Word 1 of 24" once; light, dark), Review phrase (light, dark), restore shielded (light, dark), NFC (header empty, large title kept), gift card Create, Build the gift with VerusID section, Review (light, dark; not funded), Send Amount band unchanged after the extraction. Checks: `check:design` (31 sources), `check:safe-areas --changed` (18 files), Babel parse (20 files), focused ESLint undefined/unused pass (one existing unused import in `GiftCardFund`), `git diff --check`. Evidence: `docs/qa/step-titles/` (ignored; phrase words blurred). | Not run: Android, ZSeedSetupFlow import stage and the signed-in Import wallet stack (same shared forms; source only), the NFC screen under a real read, large text. The SE Verify step scrolls about 16 points with the keyboard open; all chips stay visible. |
| 2026-10-23 | AL-1.ASSET-DETAILS-DONE: Done on the Manage assets details sheet | `claude/bridged-line` after `f7330f8f`; `InfoSheet.js` (optional `header` slot; no other caller passes it), `AssetDetailsSheet.js`, `DESIGN.md` | Same simulators and wallets as TX-1.BRIDGED-LINE. Normal (dark and light) and SE (dark and light): the logo header stays, Balance, Network, Currency ID or Contract address and "Remove from wallet" follow, Done is fixed at the bottom and closes the sheet. "Remove from wallet" still opens "Remove <name>?"; "Not now" keeps the asset (nothing removed). A temporary, reverted patch with four extra rows on the SE: the rows scroll under the fixed header, the bottom cue shows until the end, and Done stays visible. `check:design`, `check:safe-areas`, a Babel parse. Evidence (ignored): `docs/qa/bridged-line/20`–`26`. | On the SE a Verus currency ID wraps to two lines beside Copy; the padding did not change (20 points before and after), so it is probably not new (not checked on the old build). Android not run. |
| 2026-10-23 | TX-1.BRIDGED-LINE: "Bridged from …" line and sheet on the asset screen (variation C) | `claude/bridged-line` from `d04ab115`; new `src/utils/assets/bridgedOrigin.js` (`getBridgedOrigin`), new `BridgedOriginSheet.js`, `SignedInAssetHeader.js`, `DESIGN.md` | Rule from data: the currency is the Ethereum gateway (its `mapped_to` is native ETH) or its system is that gateway; VRSC and Bridge.vETH map the other way and their system is VRSC. A temporary (deleted) Node script on the mainnet `CoinsList`: vUSDC.vETH, DAI.vETH, vETH, tBTC.vETH, MKR.vETH, vUSDT.vETH, EURC.vETH, crvUSD.vETH and scrvUSD.vETH match; VRSC, Bridge.vETH, USDC, ETH, DAI, VRSCTEST, gETH, Pure, vARRR and Bridge.vARRR do not. iOS 26.5 "Verus Alerts QA" (normal) and "Verus Alerts Compact" (SE), new disposable testnet wallets without funds, Custom RPC `api.verustest.net`, Metro 8084: DAI.vETH and MKR.vETH show "Bridged from Sepolia ›"; the sheet shows Original DAI, the contract with Copy (clipboard checked) and the explorer row, which opened `sepolia.etherscan.io` on the DAI token; Done closes it; VRSCTEST, gETH and a Sepolia ERC-20 (DAI) show no line; Home is unchanged; light and dark on both sizes. vETH shows only Original ("gETH", the testnet ETH). A temporary, reverted 13-character total on the SE keeps the line on one line ("Bridged from S… ›") and the tap still opens the sheet. A tap on the ticker opens the sheet; a tap under the identity row does not. `check:design`, `check:safe-areas`, a Babel parse and a minimal ESLint pass. Evidence (ignored): `docs/qa/bridged-line/`. | Not seen on a device: mainnet ("Bridged from Ethereum", rule checked from source and the script), Android. |
| 2026-10-23 | TX-1.PRECONVERT: pre-conversions (mockup A with C's wallet screens) | `claude/preconvert` from `d04ab115`; new `src/utils/preconversion/` (`launchFacts.js`, `prelaunchData.js`, `usePrelaunch.js`), new `Coin/PrelaunchAssetPanel.js`; `wizardUtils.js`, Select target, Amount, `AmountEstimate`, Confirm, `ConfirmFacts`, `ConfirmPreparing`, `TransferSummary`, Sent, Context, Navigator, `usePriceImpact`, `Home.js`, `SignedInWalletHome.js`, `SignedInCoinDetail.js`, `SignedInAssetHeader.js` (`showCards`), `Overview.js` (exported row, `statusLabel`); `DESIGN.md` | iOS 26.5 "Verus GR3 QA" (iPhone 17 Pro), public testnet, profile "GR3 Test 2" (Face ID), Metro 8090 from the worktree. Real: Convert to shows "Pre-launch · SUPERVRSC · Launches in about 2 years" (start block 2,343,500); Amount "You receive · Price set at launch"; Confirm with the own R-address and "Refunds also go here.", Fees 0.00035 VRSCTEST from the real preflight, "At launch, 25 Oct 2028" and the notice; light and dark. Hold sent a signed transaction: `decoderawtransaction` shows `preconvert: true`, 0.1 VRSCTEST to SUPERVRSC, destination the own R-address, transfer fee 0.00025, network fee 0.0001. The network refused it ("16: bad-txns-failed-precheck"); a local node logs "DeFi functions temporarily disabled for security alert by notification oracle. Reserve transfer rejected." With a QA-only proxy that accepted that one transaction and reported it in the mempool, then in a block (STUB): Sent "Pre-conversion sent"; the wallet added SUPERVRSC; Home "0.1 VRSCTEST pre-converted" with "Launches in about 2 years" (also dark and hidden balances); asset screen with Pending, then "Waiting for launch"; Transaction sheet; Launch details ("Holds VRSCTEST 50%, SUPERNET 50%"); "Pre-convert more" opens Amount with SUPERVRSC chosen and Back shows the list. Babel parse, `check:design`, `check:safe-areas`, a no-undef lint, and Node checks of the launch helpers and transfer parsing pass. Evidence (ignored): `docs/qa/preconvert/` (`*-STUB` = proxy stub). | A real pre-conversion on the network (public testnet DeFi is disabled). "Needed to launch" and Maximum were not seen with real data (SUPERVRSC sets neither). PBaaS chain launches and token launches were not tested; the core developers' transfer check accepts only basket pre-conversions on the same chain with native fees through the `sendcurrency` path, while local pre-conversions use the local builder. Not run: iPhone SE, Android. The old hooks lint plugin (2.5.1) reports a false conditional-hook error in `SendWizardConfirm.js` (all hooks run before any return). |
| 2026-10-23 | AL-1.REMOVE-WYRE: Wyre removed from what users can reach | `claude/remove-wyre` from `65f9c7dc`; `ProfileSettings.js`, `assetManagerData.js`, `subWalletStatus.js` | Source: the row showed only on mainnet wallets (`WYRE_ACCESSIBLE && !testAccount`); its text pointed to a Services tile that no longer exists, and turning it on let Manage assets offer Wyre assets whose card was a dead end. Lint (minimal config), `check:design`, `profileDeletion` and `resetPasswordBiometry` tests pass. iOS SE (PTest SE, testnet, Metro 8083): Security & recovery renders top to bottom without the Wyre section. | The mainnet case (row gone, catalogue without Wyre) is source-only: testing needs a mainnet wallet, which QA must not open. Android not run. |
| 2026-10-23 | Claim flow: claim progress and the old VerusID pop-up (ID-2.9) | `claude/claim-flow` from `5ed35597`; `SpendableKeyRequestInfo.js`, `GenericRequestHome.js`, `SecureLoading.js` (exports `SecureLoadingView`), `genericResponseNetwork.unit.test.js` (mock follows the new import), `DESIGN.md` | The broadcast shows the secure task screen ("Claiming funds", "Keep the app open.", the longer line after 15 s, no Cancel); the password-protected scan uses the same request loader as the plain scan; the outside-authority line opens `DeepLinkVerusIdDetailsSheet`. iOS SE (PTest SE, public testnet, Metro 8083): gift card "Sams birthday" redeemed through Cancel gift card → Review redemption → Claim 0.0499 VRSCTEST; "Claiming funds" captured, then "Claim submitted". The sheet opened through the same `openVerusIdDetailsModal` wiring from a temporary, reverted QA link on the claim review (TestBob.antafri@ loaded). Lint (minimal config), `check:design`, `check:safe-areas`; `genericResponseNetwork`, `loginRequestContinuation`, `verusIdCallerSession` pass (`identitySignatureThreshold` fails the same way on `redesign`). Evidence (ignored): `docs/qa/claim-flow/`. | Not seen on a device: a real claim with an outside authority, a password-protected card, dark mode of the claim screens, Android. GR3-D16 (extra "Request complete" sheet after Done) is unchanged. |
| 2026-10-23 | TX-1.ASSET-PENDING follow-up: no double count after a block; recovery secrets title once | `claude/balance-guard-title` from `a700f945`; `vrpc/updates.js` (`updateVrpcBalances`), `vrpc/requests/getAddressBalances.js` (`fresh`), `DisplaySeed.js`, `DESIGN.md` | Cause: the app caches `getaddressbalance` for 5 s and `getaddressmempool` for 10 s, so right after a block a new balance met an older mempool. A 1-s log of `api.verustest.net` around a block showed the server switch balance and mempool together. Fix: while the mempool lists anything, read both again uncached and back to back. A temporary (deleted) Jest check: the stale-mempool case gives 1.1298 on the old code and 1.0798 on the new; empty mempool keeps one cached read; real incoming and outgoing pending stay. iOS SE (PTest SE, public testnet, Metro 8083): a 0.05 VRSCTEST daemon send read by OCR on every pull-to-refresh showed "+0.05 VRSCTEST pending" until the block and then 1.1898 with no line for 25 refreshes (before the fix: double count in 2 of 2 runs). Recovery secrets show the title only in the header, light and dark. Evidence (ignored): `docs/qa/pending-qr/13`–`16`. | Extra uncached requests only while a payment waits. Not run: Android, normal-size iPhone. |
| 2026-10-22 | TX-1.ASSET-PENDING, AL-1.RECOVERY-QR, AL-1.DEAD-SETTINGS | `claude/pending-qr-settings` from `502bf525`; `cardPresentation.js` (`getLedgerTotal`, `getLedgerPending`), `SignedInAssetHeader.js`, `CoinCardPickerSheet.js`, new `DisplaySeed/RecoverySecretQrSheet.js`, `DisplaySeed.js`, `GeneralWalletSettings.js`, `settingsDefaults.js`, `DESIGN.md` | iOS 26.5 "Verus GR3 Compact" (iPhone SE, PTest SE), public testnet with Custom RPC `api.verustest.net`, Metro 8083. General shows neither removed row. Recovery secrets: Primary revealed shows QR and Copy; the QR sheet decodes (macOS CIDetector) to the 24-word phrase; the VRSCTEST private key QR decodes to the shown key; light and dark; background closes the sheet and hides every value. Asset screen: two real 0.05 VRSCTEST sends from the test daemon (`7090e66d…`, `c42a0931…`) show "+0.05 VRSCTEST pending" on the transparent card with the total included, light and dark; the line goes away after confirmation; "Choose a card" shows the same total. `check:design`, `check:safe-areas`, a minimal ESLint pass. Evidence (ignored): `docs/qa/pending-qr/`. | Twice, right after a block, the public testnet API returned the new balance while its mempool still listed the transaction, so the card counted the 0.05 twice and still showed "+0.05 pending" until the next refresh (the doubled total existed before this change; the line now makes it visible). Not run: a Bitcoin or private card with pending funds, an outgoing send, hidden balances, normal-size iPhone, Android. |
| 2026-10-22 | Wallet setup screen (variation E: icon ring + coins fly onto Home), replaces `LoadingModal` in onboarding | `claude/wallet-setup` from `502bf525`; new `src/components/WalletSetup/` (`walletSetupStore.js`, `WalletSetupOverlay.js` at the root, `WalletSetupLogoSlot.js` on Home rows); `createProfileFromSeed` reports and awaits each step (`onStep`), checks a taken name before the key work, exports `getStartingCoinIds`; `CreateProfile.js` drives the screen; DESIGN.md "Wallet setup screen" | Design contract: owner-approved mockup E (two rounds, Sonnet mockups). iOS 26.5 "Verus Alerts QA", public testnet, five disposable testnet wallets created through the real onboarding (no Face ID on the simulator): screen shows, two coins (VRSCTEST, GETH) appear as their keys are made, ring grows, check and "<name> is ready", coins land on the Home rows (Testnet Ethereum, Verus Testnet), Home logos visible after landing; light and dark (custom icon and color); a temporary, reverted QA-only failure after the keys showed "Lima was not created" with Try again and Back, and Try again created the wallet. Videos in `docs/qa/wallet-setup/` (ignored). A read-only review agent found four defects (ring props on the old architecture, step marked shown too early, no fallback close, no alert when the screen never opened); all fixed, and the final light run was recorded after the fixes. Babel parse, `check:design`, `check:safe-areas --changed`, `git diff --check` pass; Jest `createProfileFromSeed`, `profileCreationBiometrics` pass; `walletBackupRequestSession` and `profileCreationSubmission` fail to load, as on `redesign`. | iPhone SE, Android (TalkBack can reach the screen behind; back button), Face ID step, mainnet three-coin landing, import path ("Restoring"), Back on the failure screen, and the wallet backup request (still on `LoadingModal`) not run. |
| 2026-10-22 | GR-3.20: request loading screen for invoice, identity update and v1 login links | `claude/request-loading` from `84a2e37e`; `GenericRequestLoading.js` (title and steps props), `DeepLink.js` (one opening screen and error state for every request type, themed root), `GenericRequestHome.js` (themed root); DESIGN.md "Scanned payments and VerusPay invoices" | Design contract: `GenericRequestLoading` as is, with its own title and steps. iOS 26.5 "Verus Alerts QA", signed out, unsigned 0.01 VRSCTEST invoice link: "Opening invoice" with Read invoice, Select network and Prepare payment (no Verify signer), Cancel; then "Pay invoice". Light and dark. Cancel during loading returned to the sign-in screen. The public testnet server failed the invoice with 401 (placeholder key, environment); a temporary, reverted QA patch held each step 1.5 s and pinned `api.verustest.net` to reach the success path; the failure ends on the existing "Can’t open this invoice" sheet over the new screen. A GenericRequest link still shows "Opening request" with four steps and its error state ("Request expired", Close). Babel parse, `check:design`, `check:safe-areas --changed`, `git diff --check` pass; Jest `genericResponseNetwork` (4 tests) passes. | iPhone SE and Android not run; v1 login loading not run on a device (its error path was restored to the old alert after the device run, checked by source); identity update links are not routed by the link handler today (commented out), so their path was checked by source only; signed invoice not run. |
| 2026-10-22 | Gap 5: Home notification card A and secure task screen A | `claude/signout-card` from `1bdad73c`; `NotificationWidget.js`, `SecureLoading.js` (themed view, `SecureLoading.styles.js` removed), `MainStackScreens.js` and `SignedOutStackScreens.js` (no header, no swipe back), short task messages in the Settings callers; DESIGN.md "Home notification card" and "Secure task screen" | Design contract: Services tile fill and corners plus compact `AppButton` for the card (deviation: page-colored button on the gray card); `GenericRequestLoading` for the screen. iOS 26.5 "Verus GR3 QA" (`GR3 Test 2`, public testnet): the real failed card and a temporary QA "ready" card, light and dark; Lock wallet with a temporary 20 s task shows "Signing out" with the 7-bar loader (light) and the slow line with a temporary 3 s delay (dark). All QA patches reverted. `git diff --check`, `check:design`, `check:safe-areas --changed` pass. | iPhone SE and Android not run; the ready-card celebration is in a separate mockup round. |
| 2026-10-22 | Gap 5 follow-up: one-time celebration on the ready VerusID card (C without border) | `claude/ready-celebration` from `432e43a1`; new `VerusIdReadyCard.js` (Reanimated + react-native-svg: tint bloom, name rise, 12 confetti pieces, 2.2 s); `NotificationWidget.js` (ready cards use it, failed cards keep card A, `celebrated` flag saved on the stored notification); DESIGN.md "Ready card celebration" | Owner chose C from three animated mockups, then removed the traced border after seeing it in the app. Design contract: card A layout and button, card-only material like the gift card. iOS 26.5 "Verus GR3 QA" (`GR3 Test 2`, public testnet) with a temporary QA "ready" notification: plays in light and dark; a relaunch and a tab switch show the still card; Reduce Motion shows a fade only. QA patch reverted and the QA notification removed. `git diff --check`, `check:design`, `check:safe-areas --changed`, Metro bundle pass. | iPhone SE and Android not run; no real provisioning run (the ready state came from the QA notification). |
| 2026-10-22 | AL-1: app alerts as the acknowledgement sheet; old alerts onto their screens; Settings pickers | `claude/old-alerts` from `6452c1d8` | iOS 26.5 "Verus Alerts QA" (new disposable testnet wallet `alertsqa`, no funds): key derivation `SelectionSheet` and its confirmation, outside tap = Not now, NFC backup and keychain confirmations, recovery secrets warning, wrong password inline in the password sheet, slippage confirmation (Not now keeps it off), number sheet range error, display currency sheet, RPC server sheet with an unreachable URL (inline error, no spinner), clear cache confirmation, blocklist source (current pick keeps the list), address actions and Remove confirmation, one-button error sheet through a temporary, reverted QA-only failure in the currency save (it also found and verified the closing-sheet fix), light and dark. iPhone SE "Verus Alerts Compact": the slippage sheet with 44-point buttons, light and dark, through a temporary, reverted QA-only trigger. Wallet creation showed no "Wallet created!" alert. Babel parse, `check:design`, `check:safe-areas` (60 files), iOS bundle build pass. Related Jest suites: the same 28 fail as on `redesign` (existing failures); `profileDeletion`, `passwordMigration`, `authDataStorage`, `fundRawTransactionError`, `convertOrCrossChainSendConfirm` pass after their copy and mock updates. | Android QA; request, invoice and gift card states that need staged failures; legacy-code removal. |
| 2026-10-22 | TX-1.PRIVATE-SEND: real sync and memo field fix | `claude/private-send-memo-input` (`3b5caaa8`) from `redesign` `2be3575c`; `components/MemoSheet.js` | Same simulator, public testnet. The public lightwalletd (`lightwalletd.verustest.net:8125`, `3c7c0fa`) sends a wrong `saplingCommitmentTreeSize` after about block 1,226,200 (0 at 1,230,000; its own GetTreeState gives 3294). So every new testnet private wallet stops at block 1,226,171; this caused the earlier rewind failure. With the same lightwalletd run locally against the test daemon (QA-only endpoint), the new disposable wallet "zsendqc" (same seed) synced to the tip and shows 3 VRSCTEST. Real: Amount "Available: 3"; `testbob.antafri@:private` with Memo; Confirm with Memo and Fees 0.0001 from the real preflight. Found and fixed: the controlled multiline memo field echoed changes with JS on iOS (2,000+ change events for 5 typed letters, app at 170% CPU) and lost typed characters. The field now keeps its own text. After the fix: the memo types in full, Done sets the row, reopen shows the memo, Confirm shows it, app CPU 0% with the sheet open. `check:design`, `check:safe-areas`, Babel parse and `git diff --check` pass. Evidence (ignored): `docs/qa/private-send/build/15`–`19`. | Hold to send fails with "Failed to spend": for VRSCTEST the native module parses the recipient with Zcash testnet rules (`getNetworkParams`), and `isValidAddress` is false for every `zs…` address on VRSCTEST and true on VRSC, the wallet's own address included. No testnet private send is possible until `react-native-verus` is fixed. One of the three `verus.io` servers (77.42.48.61) answers 403, so about one Sapling-parameter download in three fails (QA placed verified files). The card history labels every receive "My transparent address", also on the private card (`Overview.js`). Not run: Success and history for a private txid, memo byte limit, a scanned `zs…` QR, Android, iPhone SE. |
| 2026-10-22 | TX-1.PRIVATE-SEND: private (z) card sends (gap 7) | `claude/private-send` (`11f14998`, `8f52621a`, with `redesign` `6452c1d8` merged in); `wizardUtils.js`, new `privateSend.js`, `components/MemoSheet.js`, `utils/subwallet/privateWallet.js`; Recipient, Confirm, `ConfirmFacts`, Amount, Context, Navigator, Select asset, `SelectionSheets`, `scanRequest.js`, `VerusPay.js`, `SelectionRow` (`disabled`), `SignedInAssetHeader`, `SignedInCoinDetail`, `sendPrivateTransaction.js`; `DESIGN.md` | iOS 26.5 "Verus Private Send QA" (iPhone 17 Pro, task-owned), public testnet with Custom RPC `api.verustest.net`, Metro 8084, disposable wallet "zsendqb" (funded 3 VRSCTEST to its z-address `9e35be4b…eefd` and 2 to its R-address `eb8c9b9a…dec9` from the test daemon). Real: coin card "Syncing 4%…85%" badge in light and dark; the transparent card refuses a `zs…` address with "Only the Private card can send to a private address."; Send to self fills the own R-address and hides Memo. With a reverted JS stub for the private balance (2.5 confirmed, 0.5 pending) and sync percent: syncing card with balance keeps Send off; "Choose a card" shows Private dimmed with "Syncing 42%" and ignores taps; Amount "Available: 2.5" plus "0.5 VRSCTEST can be sent in about 10 minutes."; Recipient accepts a `zs…` address and shows "Memo · Optional"; the Memo sheet ("Only the recipient can read it.", Done) sets the row; Confirm shows To, Memo, Fees 0.0001 (real private preflight) in light and dark; `testbob.antafri@:private` resolves through the real VerusID lookup and passes preflight; an R-address shows the transparent notice above Hold and no Memo row. Babel parse (21 files), `check:design`, `check:safe-areas`, `git diff --check`, 10 temporary Node checks of `privateWallet.js` pass. Evidence (ignored): `docs/qa/private-send/build/` (`*-STUB` = stubbed balance). | No private send was broadcast: the native light-wallet sync never finishes on this simulator. Both test wallets have birthday height 2 (`walletFolder.js` always uses Sapling activation), and the iOS SDK fails every sync near block 1,226,368 with `blockRepositoryRemoveBlockAfterRewind` (lightwalletd and the daemon agree on those blocks; clearing the cache does not help). Not run: hold-to-send, Success and history for a private txid, memo byte limit, a scanned `zs…` QR, Android, iPhone SE. The ESLint config does not load in this repo (plugin `import`); a hooks lint of `SendWizardAmount.js` shows 5 conditional-hook errors that also exist on `redesign`. |
| 2026-10-22 | ID-2.10: VerusID card and actions follow-up | `claude/verusid-actions` from `6de4dff6`; `SignedInActionBar.js` (button row extracted as `SignedInActionButtons`, the bar reuses it), `VerusIdCard.js` (no i-address, name `CopyAction`), `SignedInVerusIdDetails.js` (Receive/Send/Convert), `VerusIdDetailsSheet.js` (i-address row), SendWizard `sourceIdentity` in Convert mode too | iOS 26.5 "Verus GR3 QA" (`GR3 Test 2`, public testnet): page, name copy feedback, Convert (Select asset with only the VerusID's two assets and "From" band), Details with i-address, light and dark. iPhone SE with the same temporary, reverted QA-only list entry: list and page, three buttons fit at 44 points, light and dark. The VerusID was funded again (1.5 VRSCTEST, txid `4580fa69…`) after a daemon send by another thread spent the first 1.5. `git diff --check`, Babel parse, `check:design`, `check:safe-areas --changed`, `SignedInVerusIdLifecycle` 4/4 pass. | Android QA; a conversion from a VerusID card not run (public-testnet DeFi is down). |
| 2026-10-22 | ID-2: VerusID list and page ("D revised") | `claude/verusid-page` from `63a8c0b2`; `SignedInVerusIdService.js`, `SignedInVerusIdDetails.js`, new `VerusIdCard.js`, `VerusIdContentSheet.js`, `VerusIdDetailsSheet.js`, `VerusIdOptionsSheet.js`, `describeIdentityContent.js`, `describeVerusIdState.js`, `getVerusIdFunds.js`; SendWizard `sourceIdentity`; `InfoSheetRow` `accessory`; DESIGN.md "VerusID page" | Design contract: Gift card detail exemplar (fixed object, fact rows, ⋯ sheet), Recipient flat rows, Manage assets rows, InfoSheet; owner-approved deviation: the filled light card and filled list rows. iOS 26.5 "Verus GR3 QA" with the disposable `GR3 Test 2` profile (Face ID) on the public testnet: list, page, funds, both fund taps (Verus Testnet and USD open their asset screen on the VerusID card; Back returns), Send (Select asset with only the two VerusID assets and "From" band), Receive (VerusID card), Content (real text entry), Details, ⋯ and Unlink confirmation (cancelled), light and dark. iPhone SE "Verus GR3 Compact" (`PTest SE`) with a temporary, reverted QA-only list entry: list and page in light and dark. Test funds: 1.5 VRSCTEST + 3 USD from the local testnet daemon to `liveqa09482856.antafri.VRSCTEST@` (txid `fe2b2219…`), USD added in `GR3 Test 2`. `git diff --check`, Babel parse, `check:design` (30 sources), `check:safe-areas --changed` pass; `SignedInVerusIdLifecycle` 4/4 pass after its Unlink entry moved to ⋯ (the test found rows by text; it now uses the accessibility label). | Android QA; Locked and Revoked states not seen on a device (no locked test VerusID); request screens still open the old modal (ID-2.9). |
| 2026-10-22 | CAM-1: camera scanner as a camera window (owner chose variation B, with the torch button) | `claude/camera-scanner` from `77ad814c`; `BarcodeReader.js` (rewritten), new `ScannerScreen.js` and `barcodeReader.styles.js`; `VerusPay.js`, `SendWizardRecipient.js`, `SendWizardNavigator.js` (`wizardTitle`, `wizardOnBack`), `ScanSeed.js`, `RecoverIdentityForm.render.js`, `SpendableKeyRequestInfo.js`; DESIGN.md "Camera scanner" | iOS 17 Pro simulator (no camera): Scan tab "No camera found" light and dark; key import scanner and Back. Android 360x640 (virtual camera, PTest A360 on Testnet): Scan tab live window, blocked state, Open Settings round trip back to live; Send Recipient scanner ("Scan address" header, band, header Back and Android back return to the field, keyboard closed), dark mode; import scanner permission sequence: the system prompt over the dark window, "Allow camera" asks again, a second refusal shows "Open Settings" (fixed during QA: a foreground re-check reset blocked to denied); the camera is released on other tabs. Synthetic, reverted stubs: "Reading code…" state, NFC button, no-camera hint and "Enter address". Checks: Babel parse (12 files), `check:design`, `check:safe-areas --changed`, `git diff --check`. Evidence (ignored): `docs/qa/camera-scanner/`. | Not seen on a device: a real QR read, the torch (no flash on the emulators), iPhone SE, VerusID recovery and claim-password scanners, the iOS swipe-back block on Recipient. A new disposable "Camera QA iOS" Testnet wallet is on the 17 Pro simulator. |
| 2026-10-22 | TX-1.SCAN-SEND and TX-1.INVOICE-PAY: scanned payments and invoices in Send | `claude/scan-send` from `d6d29cba` (`bcf7509c`, `dbb3b031`, `210790dd`, `5f936a6d`); `VerusPay.js`, `QrScanner.js`, SendWizard navigator, context, Select asset, Amount, Confirm, Sent, band, card sheet; new `scanRequest.js`, `invoiceFlow.js`, `InvoicePayFlow.js`, `InvoicePayWith.js`, `InvoiceSlip.js`; `InvoiceInfo.js`, `InvoicePaymentConfiguration.js`, `DeepLink.js`, `DESIGN.md` | Closes gap 2. iOS 26.5 sims with a dev-only QA text field on the Scan tab (not committed; the simulator has no camera) and invoice links through `simctl openurl`, Testnet, Metro 8082. "Verus GR3 QA" (PTest iOS): address → Select asset (Verus assets only, band "To RSfKDp…") → Amount (band "to …") → Confirm without Recipient; Back to Amount; v0 request with amount and note → Confirm at once with the Note row, Back → Amount 0.02, sent (`c53b4296…f283`); request without amount → Amount; ETH address with no ETH balance → "No asset for this address"; mainnet Komodo request → "This request is for mainnet" sheet; Testnet Ethereum removed and re-added from the "Add Testnet Ethereum?" sheet; request naming another network → warning above Hold; unknown code → "Can’t use this QR code". Invoices: conversion invoice → Pay with (slip, Pay directly, four conversion rows) → USD → Confirm (conversion layout, Invoice details sheet) → paid (`926fc73a…b657`) → "Payment sent" → Done home; no-conversion invoice skips Pay with, Back leaves; expired and mainnet invoices → sheets; invoice larger than balance → "No way to pay this invoice"; amount plus fee above balance → shortfall error, Hold off. Dark mode Pay with; "Verus GR3 Compact" (PTest SE): Pay with, conversion Confirm, scan Select asset and Amount fit. Design and safe-area checks pass. Evidence (ignored): `docs/qa/scan-send/build/`. | Not run: Android; signed invoice (Requested by row and requester sheet); two funded cards (Choose a card); any-amount and any-destination invoices; conversion options failure and Try again; a generic request with a step after the invoice; locked-wallet invoice; ETH and BTC requests with balance; Add asset for a funded coin. The test wallets paid 0.02 VRSCTEST and about 0.01 USD to PTest SE. |
| 2026-10-22 | TX-1.INVOICE-PRICE: signed slip, price impact on Pay with, Confirm without "via" | `claude/invoice-price-impact` from `0fd84737`; `InvoiceSlip.js`, `InvoicePayWith.js`, `SendWizardConfirm.js`, `PriceRouteSheet.js` (pay mode, prepared baskets), `ImpactRow.js`, `ConfirmFacts.js`, `AmountEstimate.js`, new `ImpactChip.js`, `impactFormat.js`, `priceImpact.js`, `usePriceImpact.js`, `TransferSummary.js`, `DESIGN.md` | iOS 26.5, public testnet (signatures need a chain where the test signer exists), Metro 8082. "Verus GR3 Compact" (PTest SE): signed Kaiju invoice from `TestBob.antafri@` → slip "Request from / TestBob.antafri.VRSCTEST@", no badge; one "Verus Testnet" row, cheapest basket, "<0.1% more" chip → "Price and route" with five baskets ("Best price", "x% more"), the former "via Kaiju" as "Direct"; choosing Token AMM1 changes the row; Confirm: price line without "via", "Request from", Price impact "<0.1% more ›" → sheet with Market price, Your price, Difference, Route; long receive label wraps. Unsigned invoice: "Unsigned" badge, "To" and the full address. Dark mode Pay with and sheet. Send Convert VRSCTEST → Kaiju: Amount chip and sheet unchanged, Confirm without "via", Price impact row opens the sheet with the route. "Verus GR3 QA" (disposable "PI QA iOS"): Pay with, sheet and Confirm at normal size. Design and safe-area checks pass. Evidence (ignored): `docs/qa/scan-send/build/price-impact/`. | Every conversion from the SE test wallet failed at broadcast with "16: bad-txns-failed-precheck" (Send via Token AMM1, Send Direct, invoice via Token AMM1); the same route from the test daemon succeeds. Cause open; not caused by this branch (it failed on `77ad814c` too). Not run: warning and danger chips with real data, two cards, Android. |
| 2026-10-22 | SV-1.TICKET-SHAPE: gift card and payment slips look alike | `claude/ticket-shape` from `17a5dbd7`; new `src/utils/ticketOutline.js`; `GiftCardFixedCard.js`, `PaymentRequestSlip.js`, `InvoiceSlip.js`, `paymentRequestSlip.styles.js`, `DESIGN.md` | iOS 26.5 "Verus GR3 Compact" (PTest SE), public testnet, Metro 8082. A new gift card "Sams birthday" funded with 0.05 VRSCTEST (`15e07382…`): Pending, then Ready, light and dark; round notches, 20-point unit, 38-point amount. Invoice slips for 0.05 VRSCTEST, signed and unsigned, light and dark; Receive "Request ready" for 25 VRSCTEST. Before shots from `redesign` (Metro 8081) for the gift card and the signed slip. Design check passes. Evidence (ignored): `docs/qa/scan-send/build/ticket-shape/`. | Not run: normal-size iPhone, Android (Android draws the same SVG path). |
| 2026-10-21 | TX-1.TX-DETAIL-SHEET: transaction details as a sheet | `claude/tx-details` from `329d2e22`; new `TransactionDetailsSheet.js`, `Overview.js`, `InfoSheet.js` (`headerAccessory`), `InfoSheetSection.js` (`copy` on `InfoSheetRow`), `deepLinkRequestReview.styles.js`, `DESIGN.md`; `TxDetailsModal.js` removed | Closes gap 1 of the 2026-10-20 audit. A history row opens an `InfoSheet`: "Transaction", date subtitle, Confirmed/Pending badge, the Sent step's `TransferNode`, To, Network fee, Message and Transaction ID rows with `CopyAction`, and "View in explorer" when the coin has an explorer. The native "TxID Copied" alert, the Paper list and the Wyre "Complete this deposit" button are gone. iOS 26.5 sims, PTest iOS on "Verus GR3 QA" (402 pt) and PTest SE on "Verus GR3 Compact" (iPhone SE), Testnet, Metro 8082: sent, received, two-recipient and pending rows (a 0.01 VRSCTEST send to self, `6639256b…`); light and dark; copy put the full 64-character ID on the clipboard; outside tap and Done close the sheet; the next row opens with its own data. On the SE a 13-point address left one letter on a second line; 12/17 fixed it. Design and safe-area checks pass. Evidence (ignored): `docs/qa/tx-details/`. | Not run: Android; the Network fee, Message and explorer rows (no ETH, BTC or private transactions and no explorer on the private testnet). The sheet keeps the state it opened with; a pending transaction shows Confirmed after it is opened again. |
| 2026-10-21 | Manage assets: Remove from wallet and Ignore; smaller iOS 26 switch | `claude/remove-asset` from `29be3fc7`; new `AssetDetailsSheet.js`, `ManageAssets.js`, `AddAssetByIdentifier.js`, `AssetManagementComponents.js`, `manageAssets.styles.js`, `assetManagementService.js`, `assetIdentity.js`, `reducers/assetManagement.js`, `applyNativeSwitchSize.js`, `DESIGN.md` | Closes gap 6 of the 2026-10-20 audit. Owner chose mockup A and removal at any balance (spam currencies). A row tap opens the asset sheet; "Remove from wallet" confirms in `AcknowledgeSheet`, then runs the existing `removeExistingCoin` teardown and stores a per-network `removed` mark that automatic adding and "New assets found" respect; adding the asset again clears it. Review asset for a found currency gains "Ignore". The main coin has no sheet. The iOS 26 switch is scaled to 51 x 22.7 pt (owner found 63 x 28 too large). iOS 26.5 sim "Verus GR3 QA" (PTest iOS, Testnet): sheet, Not now, removal of VRSC-USD (balance 0.19987077) with the row gone at once, no return in "New assets found" after more than ten minutes and an app restart, Ignore on found KMD (gone, still gone after restart), VRSC-USD added again through Add custom asset with its balance, main-coin row opens nothing; light and dark; switches measure 51.0 x 22.7 pt in Manage assets (right edge 381.7 pt) and General settings (380 pt), off state clean. Design and safe-area checks pass. Evidence (ignored): `docs/qa/remove-asset/`. | Not run: Android (the emulator's System UI stopped responding; host swap was full), iPhone SE, the removal error path, an ERC-20 removal. The test wallet keeps KMD ignored. |
| 2026-10-21 | TX-1.FEE-CHOICE: device QA | `claude/fee-choice` `65e5b039` (includes `redesign` `2957628d` via `c8375787`) | Sonnet 5.5 on iOS sims "Verus GR3 QA" (402 pt, PTest iOS) and "Verus GR3 Compact" (iPhone SE, PTest SE), Metro 8083, Sepolia. Rounds P/E/R/S/T/F: Network fee row, Slow/Normal/Fast sheet, Custom fee (errors, low and high warnings, keyboard), reset to Normal per Confirm, MAX, light/dark. Real sends 0.001 gETH Slow/Fast/Custom (`0xab0f4789…`, `0x735d71da…`, `0xaafc8275…`) and 0.01 gETH Normal (`0xf97916ff…`): on-chain maxFeePerGas/maxPriorityFeePerGas match the chosen tier or custom values. Bridge both ways (VRSCTEST to Ethereum, gETH to Verus) keeps "Fees ›". QA found F7, F8, D1, D2, D3; fixed in `433033f4`, `59e2d637`, `65e5b039` and re-verified. Sepolia charged 204,600 gas for the first send to an empty address; the estimated gas limit handled it. On Sepolia Fast equals Normal (uniform 1 gwei tips). | ERC-20 (no Sepolia token), BTC (no testnet coin; owner deferred), Android 360dp and the "Try again" footer remain untested. Results in `docs/qa/fee-choice/ios/results.local.md` (local). |
| 2026-10-21 | TX-1.FEE-CHOICE: SE D3 field reachability | `claude/fee-choice` from `c8375787`; `NetworkFeeSheet` | Move the warning and summary below the fields in scroll content. Keep only Use this fee in the safe footer. Retain top/end focused-field scrolling and layout/content-size callbacks; warning changes also trigger reveal. Remove the unused footer wrapper/style. Shared selection/scroll changes from `59e2d637` remain in use for reveal, native indicators and tier subtitle width; no shared files change. SE source estimate at 375x667, keyboard 235 and top inset 20: maxHeight 392; shell/body/header overhead 94; action 56; scroll viewport 242, versus 168 with the summary pinned or 142 with a warning too. A field is 108 (19 label + 8 gap + 56 input + 7 gap + 18 helper/error). Base plus the full Priority box ends at 211, or 229 with a two-line base error. Priority/helper, one-line warning, summary and bottom padding need 212 at scroll end. Non-Jest source/layout checks reproduce 3 failures before and pass all 6 after. The same five existing Jest suites pass before and after: 81 tests. Design (30 sources), safe-area (one JS file), repo-config Babel parse (one file), and whitespace checks pass. | Estimates and source checks only. Supplied T6, T2 and S4 screenshots inspected read-only; no new native/rendered evidence. Orchestrator owns SE and larger-phone light/dark focus, warning/error transitions, tap reachability and Back/dismiss/reopen QA. Metro 8083 and simulators left untouched. No push or merge. TX-1.FEE-CHOICE stays open. |
| 2026-10-21 | TX-1.FEE-CHOICE: high custom fee warning | `claude/fee-choice-high-fee` from `59e2d637`; `NetworkFeeSheet`, `networkFeeUtils`, `DESIGN.md` | Keep the existing Custom footer warning slot, caption, semantic warning color, fee summary and enabled valid-fee action. Show "This fee is much higher than Fast." only for a valid custom fee above twice Fast. ETH compares `min(maxFeePerGas, baseFeePerGas + maxPriorityFeePerGas)` for both choices with the quote's base fee. BTC compares sat/vB. All comparison arithmetic uses BigInt. Invalid inputs, field errors and fallback quotes show no warning. Low and high warnings share one slot; Confirm is unchanged. The same five existing Jest suites pass before and after: 81 tests. Design (30 sources), safe-area (two JS files), repo-config Babel parse (two files), and whitespace checks pass. Temporary Node comparison checks pass all 29 cases, including exact/above-threshold boundaries, both ETH caps, large integer precision, high Max base alone, BTC rates, invalid fields and missing tiers. Temporary check removed before commit. | Source and Node helper evidence only. No new rendered, native, live-provider or chain evidence. Owner must check ETH/ERC-20 and BTC in light/dark, normal/compact sizes, keyboard open/closed, high/low/error/fallback states, enabled Use this fee, Back/dismiss/reopen, and absence of the warning on Confirm. No Metro, device, push or merge actions. TX-1.FEE-CHOICE stays open. |
| 2026-10-21 | TX-1.FEE-CHOICE: SE D1/D2 layout fixes | `claude/fee-choice` from `433033f4`; `NetworkFeeSheet`, shared selection/scroll primitives and selection styles | Keep the canonical sheet, `AppTextInput`, safe action stack and 56-point row minimum. Custom pins the warning and summary outside the scrolling fields. Focus, input, viewport and content-size changes reveal the active field. Only this form requests the native indicator while typing, so the fade cannot cover helpers. Opt-in tier rows retain the subtitle's intrinsic width; complete fee amounts can wrap. Shared defaults and `keyboardDismissMode="on-drag"` stay unchanged. Temporary synthetic component checks against the base: 30 pass/22 fail; candidate: 52 pass/0 fail. The same five existing Jest suites pass before and after: 81 tests. Design (30 sources), safe-area (four changed JS files), repo-config Babel parse (four files), and whitespace checks pass. Temporary check removed before commit. | Source and synthetic component evidence only. The supplied five QA screenshots establish the defects; no new native/rendered verification. Owner must check SE 375x667 in both themes: Priority `0.0001`/`abc`, base/rate focus, helper/error/warning/summary/action visibility, all six tier arrival subtitles and full amounts, Back/dismiss/reopen. Metro 8083 and attached simulators are left untouched. No push or merge. |
| 2026-10-21 | TX-1.FEE-CHOICE: F7/F8 device-QA fixes | `claude/fee-choice` from `bc3d8045`; Confirm, `networkFeeUtils`, `NetworkFeeSheet` | Confirm uses `previewNetworkFee` with the current fee and the last matching review after failed preflight. ETH uses estimated gas; BTC uses estimated byte size. Fee caption and arrival require a computable fee. Balance, MAX and submission guards are unchanged. Non-empty invalid ETH fields show their own `AppTextInput` error; empty fields stay silent. Floor error and low-fee warning remain. Temporary Node source-expression and synthetic React checks: 17 pass/21 fail before, 38 pass/0 fail after. Existing Jest baseline across two runs and final run pass the selected five suites: `electrumTransactionFlow` (23), `ethSendResponseLoss` (12), `erc20BridgePreflight` (39), `traditionalCryptoSend` (3), `traditionalCryptoSendConfirm` (4), 81 tests before and after. Design (30 sources), safe-area (3 JS files), repo-config Babel parse (3 files), and whitespace checks pass. Temporary checks removed before commit. | No new rendered/native or chain evidence. `agent-device open` returned `DEVICE_IN_USE` for the attached simulator; its existing session was preserved. Metro 8083 serves this worktree and stays running. Orchestrator must recheck F7/F8 on device, including light/dark and compact layouts. No push or merge. |
| 2026-10-20 | TX-1.FEE-CHOICE: owner-approved variation A | `claude/fee-choice` from `e8992c94`; Confirm, `NetworkFeeSheet`, `useNetworkFee`, fee helpers, shared selection/input primitives, ETH/ERC-20 plain preflight/send, Electrum size metadata, BTC rate sources, `DESIGN.md` | Contract: A0/A1/A2 mockups, canonical `FlatRow`/`SelectionSheet`/`SelectionRow`, `AppTextInput`, `useSheetDismissal`, `SkeletonLoader`, and Address Book keyboard-aware form composition. Plain ETH/ERC-20/BTC only; Normal is local to each send. ETH display uses estimated gas times capped base-plus-priority; balance/MAX retains the maximum, and signing retains the exact gas limit and both confirmed prices. BTC uses validated integer rates from mempool.space then blockchain.com, with timeouts, the existing rate limit, and Custom/retry recovery. Preflight changes retain the review and reject stale results and Hold callbacks. Base source fixtures reproduce the doubled ETH fee and undefined BTC expected fee. Temporary non-Jest checks pass: 69 fee/rate/custom/preflight cases; 20 offline signed ETH/ERC-20 envelope and rejection checks; 37 synthetic Confirm cases; 15 synthetic sheet cases. Required existing Jest suites pass on base and candidate: 5 suites, 81 tests each. Repo-config Babel parse passes for all 20 changed/new JS files; design (30 canonical sources), safe-area (all 20 JS files), and whitespace checks pass. Temporary scripts removed before commit. Review round 1 on `16f16c83`: F1 removes all per-tier preflights; sheet values use `previewNetworkFee` from the review gas/byte-size metadata, BTC rows show an approximate value, and missing reviews use the shared skeleton value slot. F2 replaces the extra secondary retry with one normal-press primary "Try again" only for a failed quote without a valid fee; other preflight errors keep the pinned message and Hold stays disabled. F3 uses half the Normal tip for a zero Slow median, with a 1-wei minimum and ordered positive tiers even for all-zero rewards. F4 rounds nonnegative blockchain.com rates up to at least 1 sat/vB before existing ordering/limit validation; mempool.space stays primary. F5 adds 16-point right accessory spacing, disables accessory interaction/accessibility, and includes units in the three Custom field labels. F6 uses the canonical lucide `ChevronLeft` at size 22 in `textPrimary`. Temporary non-Jest Node checks reproduce 14 failing cases before the fixes and pass all 21 cases after, including sheet open/reopen preflight counts, fee selection, quote retry, insufficient funds, valid Custom recovery, local ETH/BTC arithmetic, rate rejection, input labels/spacing, and Back. This round passes the same 5 existing Jest suites (81 tests), design (30 sources), safe-area (7 changed JS files), repo-config Babel parse (all 7), and `git diff --check`. Temporary script removed before commit. | Source, synthetic React and offline signing evidence only. No Metro, simulator, emulator, device, live fee-provider or chain transaction runs. Orchestrator must verify Sepolia ETH and ERC-20, BTC tiers/custom/source failure/retry/MAX, rapid changes, bridge and fixed-fee/Verus regressions, iPhone SE 375x667 and Android 360x640, normal sizes, light/dark, keyboard/back/dismiss/reopen. Review round 1 adds source and synthetic component evidence only; no rendered/device or live-provider runs. Task stays open until device QA. No push, merge or PR. |
| 2026-10-20 | RX-2 Receive restyle | `claude/receive-restyle` from `e8992c94`, uncommitted | Approved A Receive and C paper slip; existing address field kept. One request input step, Note/Conversions sheets, snapshot estimate, SVG slip and normal-flow actions. Design, safe-area (10), parser (10), isolated undefined/unused-name lint, whitespace, Node component fixtures and iOS/Android bundles pass. Configured ESLint stops while loading its import plugin (`ERR_PACKAGE_PATH_NOT_EXPORTED`, `./lib/util/glob-util`). | Orchestrator owns RX-2.5–RX-2.6 device/visual/QR checks. No Metro server, device runtime, staging, commit, push or merge. |
| 2026-10-20 | RX-2 round 2 Android fixes | `claude/receive-restyle` from `f624307d`, uncommitted; `Modal.js`, `ReceiveAssetDetails.js`, `ReceiveSubwalletSheet.js` | Canonical Address book and Conversions reproduce keyboard-hidden actions. Android native dialog resizing replaces the duplicate height avoider; iOS keeps padding avoidance. Note/Conversions light/dark, Done/apply, close/reopen, invalid slippage, request keypad and private-Testnet request result pass on Pixel 8 API 35. Private/gETH middle ellipsis and full Private copy pass. Chooser types, address subtitle, balances, selection, network group and accessibility labels pass. Address book and unlock pass as shared consumers. Design, safe-area, parser, whitespace and Android/iOS production bundles pass. Before/after evidence: `/tmp/rx-fix/`. | Private testnet, slippage editing and night mode restored OFF. No Jest, staging, commit, push, merge, reinstall or Metro restart. iOS/compact runtime, VerusID/multiple transparent cards and six other native-sheet consumers remain unverified at runtime. RX-2.5–RX-2.6 remain open. |
| 2026-10-20 | RX-2 device QA and fixes | `claude/receive-restyle` `9953ff89`, `f624307d`, `17b93ca3`, `d76642e8`, `9b2aedc5` | Sonnet 5.5 device QA against the approved mockups. iOS 17 Pro (PTest iOS): 14/17 pass, then fixes. iPhone SE (PTest SE): SE1–SE8 pass after the width-fitted amount and no slip fade. Android Pixel 8 API 35 (disposable "RX QA Android"): R1–R16, then A1–A5 pass after round 2, including Address book, unlock, VerusID manual link and gift-card currency search as shared-modal consumers. Android 360x640 (PTest A360): C1–C6 pass after the 640-point compact Receive layout and the slip amount fit. Fixed: long amounts, stale slippage error, saved-QR label, Android sheet keyboard, Android long-address ellipsis, chooser labels, dark slip fade, 360 dp address overlap, slip unit larger than the amount. Evidence (ignored): `docs/qa/receive-restyle/`. | Open: RX-2.6 QR decoding with a scanner; VerusID card and multiple transparent cards not available in the test wallets; no fiat price on testnet (chip unverified). App-wide follow-ups, not RX-2: no `keyboardAppearance` for in-app dark mode; iOS 26 `SettingsSwitchRow` switch overruns the content edge; public testnet invoice creation fails (API key), so the private-testnet switch was used. |
| 2026-10-20 | App-wide: iOS keyboard follows the in-app theme | `claude/keyboard-appearance` from `907e7914`; `App.js`, new `src/utils/applyThemedKeyboard.js`, `DESIGN.md` | Closes the RX-2 follow-up "no `keyboardAppearance` for in-app dark mode". One start-up patch gives every iOS `TextInput` (React Native, `AppTextInput`, `AppSearchField`, Paper) `keyboardAppearance` from the theme context unless the field sets its own. iOS 26.5 sim "Verus GR3 QA" (PTest iOS, Testnet): app Dark + phone Light gives a dark keyboard in Send search, Request amount number pad and the Note sheet; app Light + phone Dark gives a light keyboard; app System follows the phone. Evidence (ignored): `docs/qa/keyboard-appearance/`. Design check passes; ESLint does not start in this checkout (existing setup failure). | Android ignores `keyboardAppearance`; Gboard and other keyboards follow their own or the system theme. No legacy Paper field was opened on device; it renders the same React Native `TextInput`. |
| 2026-10-20 | App-wide: iOS 26 switch size; onboarding bottom action above the keyboard | `claude/app-wide-followups` from `1a4232dc`; new `src/utils/applyNativeSwitchSize.js`, `App.js`, `manageAssets.styles.js`; `AndroidKeyboardAvoidingForm.js` moved to shared `src/components/KeyboardAvoidingForm.js` (`WizardUI` uses it); `ChooseName`, `CreatePassword`, `SeedWords`, `ImportText`, `ImportSeed`; `DESIGN.md` | Switch: React Native 0.77 lays out iOS switches as 51 x 31 pt; the iOS 26 switch draws 63 x 28 pt and ran 12 pt past the row edge (measured). A start-up patch gives `Switch` 63 x 28 on iOS 26 or later; Manage assets' fixed 52 pt slot becomes a minimum width. iOS 26.5 sim "Verus GR3 QA": General settings switches end at 380 pt (content edge, was 392 pt); Manage assets ends at 382 pt (search field edge), off state clean; toggling works; light and dark. Keyboard: on Android the onboarding forms had no keyboard avoidance (`KeyboardAvoidingView` with no Android behavior under `adjustPan`), and on windows taller than 667 pt the name and password steps had none on either platform, so Next sat behind the keyboard (reproduced on the unchanged bundle: iPhone 17 Pro name step; Pixel 8 name step, where a tap on Next hit a key). The five steps now use `KeyboardAvoidingForm`; the taller name and password layouts drop the bottom inset while the keyboard shows; the taller password form scrolls; password and verify scroll the field and its error into view above the action. Pixel 8 API 35: Next/Next word/Create wallet/Import 8 dp above the keyboard on name, password, verify and import text; Next tapped with the keyboard open advanced the step; a disposable testnet wallet "KB QA Android" was created end to end. Small_360x640: name and verify pass. iPhone 17 Pro: name and password (with mismatch error) pass; closed-keyboard layout unchanged. Evidence (ignored): `docs/qa/app-wide-followups/`. | Not run on device: Send wizard after the component move (no funded testnet wallet on the emulator; same component and props), iOS verify step (the simulator stopped showing the software keyboard after automated input), iPhone SE. Existing, not changed: Android Import Secret Recovery Phrase entry pans the whole window up so the header sits under the status bar (same on the unchanged bundle). |
| 2026-10-17 | TX-1 round 6 Amount polish: A-35/I-36, I-37, A-36 | `claude/fix-amount-step-polish` from `0ae03b0f`; `SendWizardAmount.js`, `WizardUI.js` | Contract: keep the canonical Send wizard, existing amount field, error slot, semantic theme roles, and normal-flow `WizardFooter`/`SafeBottomActionStack`. When the source pays the Ethereum fee and Available is at or below it, show “Not enough VRSCTEST for the Ethereum network fee (about X VRSCTEST).” as soon as the quote arrives, before amount errors. Disable and dim MAX; its handler leaves the input unchanged. Funded MAX still subtracts the exact fee. Context uses the destination row's `name` and the route's `networkName`, including Ethereum and Bridge.vETH. The network sheet's ticker-based “Receive as …” wording stays unchanged (I-25). Source diagnosis for compact keyboard clipping: caller bottom padding is only 12 points on Amount and 20 on Recipient, with no footer-sized scroll reserve. `WizardFormLayout` now measures its non-shrinking footer and adds its height plus 24 points of keyboard-only end padding after caller styles. Keyboard avoidance, normal-flow Continue, and F14 error-reveal calculation stay unchanged. Temporary non-Jest React checks: baseline 3 pass/6 fail; candidate 9 pass/0 fail for fee boundaries, exact/fiat MAX, copy, other fee currencies, quote failure, measured reserve, keyboard-close reset, and F14 scrolling. Babel parse with repo config (two JS files), design (30 canonical sources), safe-area (two files), option matrix, and whitespace checks pass. Temporary dependency link removed before commit. | Source and synthetic React component evidence only; native clipping cause and rendered result still need device confirmation. Orchestrator owns Android normal/360x640 and iOS, both themes, keyboard open/closed, reachable Available/MAX and estimate card, typing visibility, and Amount/Recipient F14 regression checks. No Metro, device, simulator, emulator, `env/`, `docs/`, push, or merge actions. TX-1.8/TX-1.9 remain open. |
| 2026-10-17 | TX-1 owner-approved wizard header titles | `claude/wizard-header-title` from `78ebe3c7`; header, navigator, five steps, `WizardUI`, `DESIGN.md`, design check | Contract: match `ProgressHeader` title treatment with `titleSheet`, one line, tail ellipsis, header accessibility role, and semantic text color between symmetric 40-point controls/spacer. Titles: Select asset, Convert to, Amount, Recipient, Confirm. Progress stays below the row. Remove large content titles and unused `WizardHeading`; keep Amount asset/network/route context, remove repeated Recipient/Confirm subtitles, and retain missing-selection errors. Content starts at 24 points on normal/compact devices; keep the existing 16-point horizontal inset. Owner approval on 2026-10-17 revises the canonical stepped-task rule; Gift Card fund is not migrated. The design check first rejected its stale headline requirement; it now enforces the approved header-title rule. Design (30 canonical sources), safe-area (eight source files), option matrix, Babel parse (nine changed JS files using repo config), and whitespace checks pass. Exact source comparison confirms `WizardFormLayout` (F14 error scrolling/keyboard handling) and Success are unchanged. Checks use a temporary link to existing local dependencies; no package files change. | Source evidence only. Orchestrator owns Android/iOS light/dark normal/compact rendering, 360dp/375pt title fit, text scaling, Back/close/progress, fallback messages, and F14 keyboard-error checks. No Metro, device, simulator, emulator, push, or merge actions. TX-1.HEADER-TITLE-QA, TX-1.8/TX-1.9 stay open. |
| 2026-10-17 | TX-1 I-18: show received conversion asset on Home | `claude/convert-auto-add-currency` from `78ebe3c7`; Confirm, `wizardUtils.js`, `autoAddConversionAsset.js` | Behavior-only contract: no new UI, copy, or layout. After Success navigation, reuse `addManagedAsset` with `automatic: true` for an own-address VRPC conversion. Require matching route/definition system and source network; exclude exports and preserve Hidden. The submit fixture fails on the baseline and passes five scheduling/failure groups. Twenty-five non-Jest fixture groups cover activation, manual storage equivalence/readback, hidden/active assets, route/network guards, session changes, add failures, own-address matching, and pre-settlement zero balances. Native/authentication, RPC, and storage boundaries use fixtures. Read-only private RPC confirms USD, KMD, and VRSC-USD definitions belong to VRSCTEST. Babel parse (three files), design (30 sources), safe-area (three files), option matrix, and whitespace checks pass. | Orchestrator owns device, live conversion, settlement, and restart proof on private/public Testnet. Home can briefly show `—`/`N/A`, then `0.0000` before payout. Fiat `N/A` can persist for funded assets without a price; this existing presentation is unchanged. No Metro, device, signing, broadcast, merge, push, `env/`, or `docs/` changes. TX-1.8/TX-1.9 stay open. |
| 2026-10-17 | TX-1 A-25/I-26: Ethereum export fee on Amount | `claude/eth-export-fee-early` from `78ebe3c7`; `SendWizardAmount.js`, new `estimateEthereumExportFee.js`, shared parent-fee constant in `getSendCurrencyTransaction.js` and `preflight.js` | Contract: retain the existing Amount estimate rows, Gift Card stepped-task composition, F14 `WizardFormLayout` error slot, `SkeletonLoader`, semantic theme colors, and heading lines. Add one fee row for VRPC Ethereum export routes only. The helper uses preflight's `getCurrencyTransferIntentContext`: currency definitions plus a zero-amount `sendcurrency` simulation with `returntx=true`, source public-hash Ethereum placeholder, and explicit source refund. It validates both quoted fee legs and adds the shared 0.0001 parent fee. Requests debounce 280 ms, time out after 15 s, bind to route/amount, and ignore late replies. Private-chain amounts 0.01/0.05/1 all yield 17.34138058 VRSCTEST including parent; the executed app preflight gives the same “at least” fee with an empty-balance boundary fixture. Mainnet amounts 0.01/0.05/1 all yield 12.15562225 VRSC. A second Ethereum address and Bridge.vETH export have the same fee on each chain. These are current snapshots, not the earlier 20.81 QA price. A private daemon candidate with synthetic funding passes the installed validator; unmodified Confirm fee mapping includes both legs and parent. Temporary non-Jest component fixtures reproduce baseline MAX, then pass loading/value/failure, funds blocking, exact and fiat MAX, late route replies, debounce, token-source fees, small fees, conversion rows, and missing-selection cases. Babel parse with repo config (4 files), design (30 canonical sources), safe-area (4 files), option matrix, and whitespace checks pass. | Source, component fixtures, and read-only daemon evidence only. Orchestrator owns rendered/native checks in both themes and sizes, Back/retry, and live funded review. Basket prices can change before final preflight. No Metro, devices, keys, signing, broadcasts, env/docs edits, merge, or push. TX-1.8/TX-1.9 remain open. |
| 2026-10-17 | A-33: pending token-only funding inputs | `claude/fix-pending-token-spends` from `70bb06c8`; `getAddressUtxos.js`, `getTransaction.js` | Verus 1.2.18 source emits previous outpoints only for a negative native delta. Installed client types mark both fields optional. Private Testnet RPC returns 12 real UTXOs and a USD transaction with two `vin` records (`txid` string, `vout` integer), including one zero-native input. The live address mempool was empty. The Node fixture reproduces the baseline failure, then passes 13 cases: token-only spend leaves 11 UTXOs, duplicate deltas fetch once, all vins are excluded, distinct transactions fetch once each, empty/incoming-only mempools make no raw reads, mined transactions remain usable with a lagging index, and unreadable data fails closed. The shared funding wrapper retains its exclusion count. Babel parse (two files), design (30 sources), and whitespace checks pass. Existing preflight copy and claim/gift-card callers are unchanged. | Source, read-only RPC, and synthetic pending data only. Orchestrator owns A-33 device QA and confirmation/retry checks. No Metro, device, signing, broadcast, merge, or push actions. TX-1.8/TX-1.9 stay open. |
| 2026-10-17 | TX-1 A-34 keyboard-error visibility | `claude/fix-wizard-error-keyboard` from `70bb06c8`; `WizardUI.js`, `SendWizardAmount.js`, `SendWizardRecipient.js` | Contract: retain canonical Gift Card step/action composition and existing wizard styling, `ErrorMessage`, `WizardFooter`, and `SafeBottomActionStack`. Reuse measured stack-header keyboard avoidance. Deliberate deviation: place errors directly after their fields, before secondary controls, with an 8-point error margin; remove the Recipient field's extra bottom gap only during errors. Both steps use the same measured error slot and scroll to `max(0, errorBottom - viewportHeight)` after layout. Pending frame cleanup prevents scrolling after unmount. Supplied Android 214/216 and iOS 308/311/315 captures inspected read-only. A temporary non-Jest component check fails on the baseline and passes on the candidate for error insertion, viewport resize, wrapping, keyboard close, clearing, and unmount. Babel parse (three JS files), design (30 sources), safe-area (three files), option matrix, and whitespace checks pass. Worked assumptions: 360x640 Android, drawable height 616, header 110, keyboard 280, open footer 80 gives a 146-point viewport; 402x874 iPhone 17 Pro, header 148, keyboard 336, footer 80 gives 310. Amount field plus one-line error needs about 108 points; a two-line Recipient field plus one-line error needs about 141. Values are layout examples, not device measurements. | Source and synthetic component evidence only. Orchestrator owns rendered QA, actual keyboard/inset measurements, long/wrapped errors and text scaling, and checks that each field/error pair fits. No Metro, device, simulator, emulator, reload, merge, or push actions. pnpm automatically installed dependencies in this worktree; tracked dependency files stayed unchanged. TX-1.8/TX-1.9 and A34-QA stay open. |
| 2026-10-17 | TX-1 wizard polish: A-26, I-28, A-31, A-30, I-29, A-8 | `claude/fix-wizard-polish` from `5cbbac30`; Confirm, Amount, Recipient, `WizardUI`, `SendWizardHeader` | Design contract: preserve existing Send/Convert styling and typography; use the canonical Gift Card stepped-task composition, existing wizard primitives, semantic spacing, and `SafeBottomActionStack`. Retain the wizard's existing 16-point content inset and custom close header; no broader redesign. Supplied defect shots and canonical Gift Card normal-light/compact-dark captures inspected read-only. Temporary non-Jest source/React fixtures reproduce rejection, self-send, chip, scroll-flow, and mounted-header Back failures on the base. Candidate checks pass. Worked examples with balance 12.29551078, amount 0.01, and source fee 0.0001 show `Balance after: 12.29541078 VRSCTEST` for direct self-send and `Balance after: 12.28541078 VRSCTEST` for conversion-to-self. Babel parse (five files), design (30 canonical sources), safe-area (five files), option matrix, and whitespace checks pass. | Source and synthetic component evidence only. Orchestrator owns new rendered QA in both themes, both platforms, normal/compact sizes, and keyboard/error/Back states. No changes to transaction construction, daemon fee parameters, signing, or preflight. No Metro, devices, broadcast, merge, or push actions. TX-1.8/TX-1.9 remain open. |
| 2026-10-17 | TX-1 Confirm/Success: A-5/A-6/A-7, I-7/I-8/I-12, I-16 rejection text | `claude/fix-wizard-review-success` from `a1e758fd`; `SendWizardConfirm.js`, `SendWizardSuccess.js` | Balance subtracts exact preflight fees only when the fee currency matches the sent currency ID. Direct VRPC uses `fee`/`feeCurr` in coin units; conversion/cross-chain uses `validation.fees` in satoshis, which includes transfer and network fees. The reduction notice sits under the amount. Fees wrap without rounding or ellipsis. Success uses canonical Gift Card `FadedScrollView` plus existing `WizardFooter`/`SafeBottomActionStack`; txid uses middle ellipsis and `CopyAction`. Theme title roles remain. Scoped deviations: retain existing Confirm/result summary styling and 24-point result side inset; no wider redesign. Source fixture execution reproduces the baseline balance defects and passes 9 balance cases, 14 daemon rejection cases, 5 explicit/unknown failure cases, and 4 Success component-shape checks. Babel parse (2 files), design (30 canonical sources), safe-area (2 files), option matrix, and whitespace checks pass. Read-only inspection covered supplied QA screenshots and canonical Gift Card normal-light/compact-dark captures. | Orchestrator owns all new rendered/device evidence: Android/iOS, light/dark, normal/compact, long fees, conversion scrolling/helper/txid, full-ID copy, MAX notice, rejection retry/Back, and unknown-status behavior. No Metro, device, signing, broadcast, merge, or push actions. TX-1.8/TX-1.9 remain open. |
| 2026-10-17 | Amount/Recipient: A-23/I-9, A-9/I-11, A-10/I-10, A-12/I-14, I-13 | `claude/fix-wizard-amount-recipient` from `a1e758fd`: `WizardUI.js`, `SendWizardAmount.js`, `SendWizardRecipient.js`, `AddressBookSheet.js`, `addressBook.js` | Contract: touch Amount/Recipient only; retain Gift Card keyboard/action composition, `SafeBottomActionStack`, `WizardFooter`, `ErrorMessage`, selection sheets, and theme typography. Intentional change: pin validation above Continue and use the measured stack-header height on both platforms. Required states are keyboard open/closed, precision error, identity checking/not-found/retry, late replies after edit/Back, and saved count/list agreement. Temporary non-Jest source fixtures: 12 pass; 9 fail against the base commit. Five keyboard layout/arithmetic checks pass for normal/compact iOS/Android and keyboard dismissal; these are synthetic, not rendered evidence. The existing RPC client produces `getidentity` with params `["nobodyqa123@"]`; both the user-specified request and this exact serialized shape return code -5 (Identity not found) from the private daemon. Babel parse (five JS files), design check (30 canonical sources), safe-area check (five JS files), send-wizard option matrix, and diff whitespace check pass. `pnpm` initially tried automatic installs in this worktree; stopped, then ran checks with `pnpm_config_verify_deps_before_run=false`. No tracked dependency files changed. | Orchestrator owns rendered/device verification in both themes and sizes, including keyboard clearance under Android adjustPan. No Metro, device, simulator, emulator, native changes, signing, or broadcast. Broader TX-1 verification stays open. |
| 2026-10-17 | I-16/A-11: balance after broadcast | `claude/fix-balance-after-broadcast` from `a1e758fd` | Two temporary non-Jest reproductions fail before the fix: confirmed-only VRPC total and frozen wizard balance. Six focused fixture groups pass after the fix: signed native/reserve deltas, live wizard balance, system cache expiry and network/storage races, existing channel/reducer/session guards, empty-Card entry stability, and success-only refresh scheduling. Read-only ptestapi reports Testnet, height 33629, 12.59656078 VRSCTEST, no address mempool entries, and eight UTXOs. Transaction construction and signing stay unchanged. Babel parse, design contract, and safe-area checks pass. | Source, React renderer, mocked network/storage, and read-only RPC evidence only. No Metro or device work. The historical duplicate-input cause is a medium-confidence node/API-view inference, not a reproduced node defect. Orchestrator owns iOS/Android QA; TX-1 runtime boxes stay open. |
| 2026-10-17 | A-18 / I-19 private explorer | `claude/fix-sepolia-provider-explorer` from `a1e758fd`: `testnetEnvironment.js` (`explorerUrl`, null in the private environment), `CoinData.js` and `coin-helpers.js` (VRSCTEST explorer getters) | The private chain has no public explorer; existing explorer guards hide or disable the action when the URL is null. The `no runners?!` warning (A-14 / I-15) comes from rejected Infura/Etherscan keys in the local `env` (Infura HTTP 401, Etherscan invalid key), not from the Sepolia code. A proposed PublicNode read fallback was removed: a new third-party endpoint needs an owner decision. | Owner: provide valid keys or decide on a fallback endpoint. Device QA of the explorer action stays open. |
| 2026-10-17 | A-16/I-20 VRPC history correctness; I-21 investigation | `claude/fix-history-conversions` from `a1e758fd`; VRPC updates, transaction standardization, Overview, and transaction detail Type | Design contract: retain the existing history row and detail slots, controls, and styles; correct conversion text and destination data only. Read-only private Testnet RPC supplies four requested transactions and the combined import. One-off Node checks execute source parsing and press/detail callbacks: 11 regression cases fail on the baseline; all 16 cases pass after the fix. The combined arrival is two outputs in one import transaction, so its aggregation remains. Babel parse (four files), `check:design` (30 canonical sources), and diff whitespace checks pass. | I-21 is unresolved: the C6 press callback and detail data pass on both versions. Stable VRPC keys and immutable sorting remove list identity/state defects but do not prove a native tap fix. Orchestrator owns pending/confirmed, light/dark, normal/compact native QA. No Metro, devices, signing, broadcast, merge, or push actions. TX-1.8/TX-1.9 remain open. |
| 2026-10-17 | I-16: exclude mempool-spent funding inputs | `claude/fix-mempool-spent-utxos` from `a1e758fd`; VRPC UTXO/mempool helpers, cache bypass, preflight, claim and gift-card identity fee funding | Read-only private-chain queries confirm UTXO fields; both mempools were empty. Installed RPC client types and daemon source confirm spending outpoint fields. The fixture failed before the fix and passes after it: 14 eligible real outputs become 13 with one synthetic spend; empty mempool retains all 20 raw outputs. Cache, failure, and preflight-message fixtures pass. Babel parsing and design check pass. | No broadcasts, Metro, or devices. Orchestrator owns consecutive-send and confirmation/retry QA. Discovery observations remain intact. Missing spending outpoints fail closed. TX-1.8/1.9 stay open. |
| 2026-10-17 | A-19: successful Send/Convert cannot return to live Confirm | `claude/fix-send-success-back` from `f22b7ab9`: `SendWizardConfirm.js`, `SendWizardSuccess.js`, `SendWizardNavigator.js`, new `wizardNavigation.js` | React Navigation native 6.0.13 / stack 6.3.4. Shared submit resets the inner stack to Success only. A synchronous latch and the existing context `txResult` block further submit calls and disable the hold button. Success hardware Back consumes the event and runs Done (unchanged: reset to Wallet home). Header Close keeps the shared exit to the opener. The result back arrow stays absent; the inner swipe stays disabled. Temporary non-Jest checks run the source submit callback with mocked send boundaries and the installed StackRouter: four regression cases fail before the fix; six cases pass after it, including definite-failure retry and ambiguous-broadcast blocking. Babel parse (four source files), `check:design` (30 canonical sources), `check:safe-areas --changed`, and `git diff --check` pass. | Source and synthetic navigation evidence only. No Metro, device, emulator, or simulator work. Orchestrator owns native Back/swipe, new-send, conversion, and cross-chain QA. Broader TX-1 remains open. |
| 2026-10-17 | TX-1 correctness: A-15/A-20 conversion estimates | `claude/fix-conversion-estimates` from `f22b7ab9`: `estimateConversion.js`, `SendWizardAmount.js`, `SelectionSheets.js` | Shared RPC helper sends a JSON number, rejects nonfinite or lossy decimal conversion, omits absent `via`/`preconvert`, and retains `preconvert: false`. Amount estimates and best-route choice use only daemon outputs. Failed routes retain selection with the existing error wording; existing skeleton, error, row, theme, and layout styles remain. One-off non-Jest React/RPC fixtures reproduce the old vETH fallback (8.550589563), then check daemon output, partial/all failures, failed-route selection, amount-change cancellation, and 8-decimal serialization. Read-only curl through the installed client serializer: four required routes succeed with names and `preconvert: false`, names with `preconvert` omitted, and currency IDs with `preconvert: false`. Outputs: 0.99973259 USD, 0.99974158 VRSC-USD, 0.00000596 vETH, 0.99926542 VRSCTEST. String control returns -32601. Full responses: untracked `conversion-estimates-qa.local.md`. Babel parse (3 files), design (30 canonical sources), safe-area (2 files), Send wizard option matrix, and diff whitespace checks pass. Review/preflight calculations are unchanged. | Orchestrator owns device QA: success, loading, unavailable estimate, failed-route selection, amount edit/retry, and Back, in light/dark and normal/compact layouts. No Metro, device, signing, broadcast, mainnet, merge, or push actions in this implementation task. TX-1.8/TX-1.9 remain open. |
| 2026-10-17 | TX-1 A-21/A-22: Ethereum export recipient and received-asset label | `claude/fix-eth-export-recipient` from `f22b7ab9`; `wizardUtils.js` and the existing non-Jest option check | Design contract: retain `SelectionSheet` / `SelectionRow`, layout, and dismissal behavior; correct route classification and asset text only. The option matrix reproduced both defects before their fixes, then passed with private/mainnet vETH definitions, renamed Ethereum systems, non-Ethereum systems, and MKR network labels. Live private/mainnet `getcurrency vETH` both report proof protocol 3 and native destination type 9 (`DEST_ETH`). Executed source callbacks accept a valid Ethereum recipient, reject Verus destinations, select ETH/ERC20 self addresses, and build `DEST_ETH`. Existing intent context and validator accept the private-chain zero-amount fee quote and 0.05 unsigned candidate from `sendcurrency` with `returntx=true`: zero inputs, one output, Ethereum recipient. Babel parse and `check:design` pass. | Parent QA owns native recipient, sheet, Back/retry, and success-state checks. No devices, Metro, signing, broadcast, mainnet build, merge, or push in this task. |
| 2026-10-15 | SV-1 second buttons use `secondary` | `claude/sv1-secondary-buttons` from `redesign` (`dbd78021`): `AcknowledgeSheet.js` (the `dismissLabel` button is `variant="secondary"`, 10 points below the primary), `GiftCardServiceOverview.js` (the funding footer's "Fund from another wallet" is `variant="secondary"`, stack gap 10), `DESIGN.md` (a core rule for second buttons; Confirmation; Gift card detail Actions) | The user saw that SV-1 drew "Not now" and "Fund from another wallet" as text buttons, while the app uses the filled `secondary` button for a second action (41 uses, for example `AddressBookEditSheet` "Cancel" with gap 10 and GenericRequest "Leave without sending"; `text` has 12, mostly third-level links such as "Other options"). The SV-1 mockup and DESIGN.md had set `text`. Real taps, Metro from the worktree: `Verus GR3 QA` (`GR3 Test 2`, Testnet, Face ID) and `Verus GR3 Compact` (`SE QA`, Testnet, disposable password). Funding footer ("NFC2 tap test"; new unfunded card "SV1 button QA" on the SE) and share confirmation ("SV1 txid iOS" Share tile; Share before funding on the SE), light and dark, both sizes: the second button is filled (light `#EEF2F8` with a blue label, dark `surfaceMuted` with a white label), about 10 points below the primary, and nothing overlaps on the SE. Not now closes the sheet and the card stays unshared. Checks: `check:design` (30 sources), `check:safe-areas` (2 files), Babel parse, `git diff --check`. Evidence: `docs/qa/sv1-secondary-buttons/` (ignored). | Not run: Android (same component and variant; no platform code). Older screens that still use `text` for a back-out ("Cancel" in `WalletBackupRequestInfo` and one in `SpendableKeyRequestInfo`, the `LoadingModal` cancel) are unchanged. |
| 2026-10-15 | SV-1.15 and SV-1.16: Android txid row and hardware Back on the gift card detail | `claude/sv1-android-back-txid` from `redesign` (`a02f1c10`): `GiftCardServiceOverview.js` only. SV-1.15: the pending txid `Text` drops `selectable` (Android does not ellipsize selectable text; `CopyAction` copies the full ID). SV-1.16: a `useFocusEffect` adds a `BackHandler` listener only while the detail shows and the screen has focus; it calls `setSelectedCardId(null)`, as the arrow does, and returns `true`. | Metro from this worktree; installed debug build `com.verusmobile`; real taps through adb, Testnet, VRSCTEST, disposable password. `Small_360x640` (`AND Small`): hardware Back on the detail → list; Back on the list → Services; detail → QR code → Back → detail → Back → list; a fast double Back from QR → list (before the fix the second Back left the screen, which likely explains the one-off Services-root result); the edge back gesture (gesture navigation) on the detail → list and on the list → Services; Back with the ⋯ sheet open closes only the sheet; the on-screen arrows still work. Card "SV1 txid fix" funded 0.01 (`be520138…`): Pending row shows one monospace line with a middle ellipsis, 17 dp high (light). `Pixel_8_API_35` (`SV1QA`): Back and the edge gesture on the detail → list; list Back → Services; card "SV1 txid P8" funded 0.01 (`26f7f18f…`, 2 confirmations on `api.verustest.net`): one line with a middle ellipsis in dark and light, copy shows the check; the share confirmation closes on Back; after Share the QR screen → Back → detail, a fast double Back → list, two edge gestures → detail → list; with the detail open, Back on the Wallet tab sends the app to the launcher, as it does without the detail. iOS `Verus GR3 QA` (`GR3 Test 2`, Face ID): card "SV1 txid iOS" funded 0.01 (`d4484267…`); the Pending row is still one line with a middle ellipsis (dark). Checks: `check:design` (30 sources), `check:safe-areas` (1 file), Babel parse, `git diff --check`. Evidence: `docs/qa/sv1-android-fixes/` in the worktree `.claude/worktrees/eager-napier-b85de5` (ignored; no QR code). | SV-1.17 was decided in a separate change (keep the behavior). Not changed: on 360×640 the QR screen content is taller than the viewport, so the scroll view clips the QR frame at the top of "Save to photos"; after a scroll the frame and the warning show above the button. The button covers nothing; a fix needs a design choice (a smaller QR on compact heights or a scroll cue). Not run: the txid row in dark on the small AVD and in light on iOS; clipboard content (the copy check was seen). Test cards left: `AND Small` holds "SV1 txid fix" (Ready, not shared), `SV1QA` holds "SV1 txid P8" (Shared, 0.01 still on it), and `GR3 Test 2` holds "SV1 txid iOS" (funded, not shared). |
| 2026-10-15 | SV-1 Android run and a claim by the local VRSCTEST daemon | `redesign` at `3db8f25b` (no source change), Metro from the worktree `claude/sv1-android-qa`, installed debug build `com.verusmobile` | Real taps on the Pixel_8_API_35 emulator (profile `SV1QA`, imported from the designated disposable seed with Testnet selected) and the `Small_360x640` AVD (360×640 dp, profile `AND Small`), Testnet, VRSCTEST, disposable password, Custom RPC `https://api.verustest.net`. Services: tiles 179×140 dp (Pixel 8) and 154×140 dp (small), 20 dp inset, 12 dp gaps, equal columns, captions "Send funds or IDs", "Save addresses", "1 card", "2 cards"; light and dark; both tiles open. Gift card "SV1 Android QA": Not funded (footer, no tiles, ⋯ rows) → Share before funding sheet → funded 0.01 in the app (`96b35453…`) → Pending → Ready (76 dp tiles) → the confirmation closes on Not now, hardware Back and an outside tap → Share → Android sheet → Copy → Shared; a second share skips the sheet. NFC tile on the emulator: "NFC is not supported on this device." Claim by the daemon: the card QR was decoded on the Mac (Vision); the key derived from it gives the funded address (matches the funding output and `getaddressutxos`); the daemon signed a sweep with the key on stdin: `8de181f2…`, 0.0099 to daemon address `RBAn5W…nfTBZC` (`ismine` true). While unconfirmed the card stayed Shared with 0.01; at 1 confirmation it showed Claimed, "Empty", Claimed by `RBAn5W…nfTBZC` (copy gives the full address) and Claimed; the list shows the Claimed badge and filter. External funding: card "SV1 Android ext" funded by daemon `sendtoaddress` 0.02 (`1c86ee5b…`) stayed "Not funded" until confirmed, then went straight to Ready; daemon claim `86201936…` → Claimed by `RVx5aS…DYEfoT`. Small AVD: Not funded, Pending, Ready, Shared, ⋯ sheet, confirmation with Not now, light and dark (`a1d1945f…` funds "SV1 Small QA", left Shared). Filter row: a tap on the left part of "All" after scrolling selects it. `font_scale` 1.3 changes nothing in the app. All transactions checked on the daemon. Evidence: `docs/qa/sv1-android/` (ignored; no QR images). | Open: SV-1.15 (txid row clipped on Android), SV-1.16 (hardware Back from the detail leaves the list), SV-1.17 (Android share sheet always counts as Shared; decision). Seen, not changed: on 360×640 the last fact row sits under the bottom scroll fade at rest (readable after a scroll); the QR screen's "Save to photos" button overlaps the bottom of the QR frame (the code stays whole). Not run: NFC write, a share target other than Copy, password-protected cards, non-native contents, Cancel and Remove, the QR screen in dark. |
| 2026-10-15 | Gift card fixes from SV-1 Track B QA | `claude/gift-card-fund-comma-and-fade-taps` from `redesign` (`1a439685`): `GiftCardFund.js` (amount `onChangeText` runs `sanitizeNumericInput`, the helper Receive already uses, so a comma becomes a dot before validation and before the outputs are built), `ScrollEdgeFade.js` (the `Svg` now sits in a `View` that has `pointerEvents="none"`, the position and the size) | Real taps on `Verus GR3 QA` (`GR3 Test 2`, Testnet, Face ID), Metro from this worktree. Comma: before the fix "0,01" stayed as typed and "Review gift card" stayed disabled; after it the field shows "0.01", the button is enabled and the review step lists VRSCTEST 0.01 (not funded; no transaction sent). Filter row: before the fix a tap at x=24 and x=28 on "All" did nothing ("Ready" stayed selected), also with no scroll, so the invisible left fade (opacity 0) catches the touch; x=60 worked. After the fix a tap at x=24 selects "All", the row still scrolls, the left fade still shows, and a tap on "Pending" under the fade (x=26) selects it. Checks: `check:design` (30 sources), `check:safe-areas` (2 files), Babel parse. | Not run: Android; a vertical `FadedScrollView` with overflow after the change (only the gift card list, which did not overflow, and the fund step were seen); a real comma-locale keyboard (the simulator keypad showed a comma key and the typed comma reached the field). The root cause for the swallowed touch is inferred from the before/after taps, not from a view-hierarchy dump. |
| 2026-10-15 | SV-1 Track B: fixed gift card screen (SV-1.6–1.14) | `claude/sv1-gift-card-detail-7ab6e6` from `redesign` (`87566047`): `GiftCardServiceOverview.js`, new `GiftCardFixedCard.js`, new `src/components/StatusBadge.js` and `statusBadge.styles.js` (exported from `src/styles/index.js`), `GiftCardQrScreen.js`, `giftCardPresentation.js` and its unit test, `giftCard.js` (one message), `DESIGN.md`; `GiftCardFlipCard.js` deleted | Spec change (SV-1.6): the presentation unit test now expects "Claimed", "Shared", "No contents yet" and "Empty" instead of "Redeemed", "Ready to fund" and "Claim completed"; internal `redeemed` names kept. Pending amounts come only from the outputs that `addGiftCardPendingFunding` stores from the pending broadcast; a record without outputs shows its VerusIDs or "No contents yet". Real taps on `Verus GR3 QA` (`GR3 Test 2`, Testnet, Face ID) and `Verus GR3 Compact` (`SE QA`, Testnet, disposable password), Metro from this worktree. Card "SV1 detail QA": Not funded (light) → ⋯ with "Share before funding" → confirmation with the empty-card text; Not now, outside tap and Share each checked (Share opened the system sheet; dismissing it rolled the attempt back, card stayed Not funded) → funded 0.01 VRSCTEST (`96ae4b21…`) → Pending with the dimmed recorded amount, the funding transaction row and copy (light, dark) → Ready (dark) → QR code → funded-card confirmation → Share → Shared (dark) → ⋯ Cancel gift card → existing cancel sheet → claim `918e3b70…` → Claimed with Claimed by (copy verified on the clipboard), Claimed and Created (light, dark). SE card with a long name: Not funded with footer, Fund from another wallet opens the external step, funded 0.01, Ready, confirmation, QR, Shared (light, dark). List: neutral Shared and Claimed badges, summaries without "Shared ·", Shared and Claimed filters (dark). A shared card skips the sheet. Fixed during QA: the QR screen showed "Gift card unavailable" on a first share (it read storage before the share was saved; it now waits while the share is reserved); the funding footer vanished during a share attempt; the card shadow was clipped at the top. Independent review (SV-1.14, report only): nothing blocking; fixed visible "Redeemed" wording, a hidden pending addition on a funded card, plural wording and dead code. Checks: `check:design` (30 sources), `check:safe-areas` (8 files), Babel parse, `git diff --check`, `giftCardPresentation` and `giftCard` unit suites (53 tests), an ESLint undefined/unused pass. Evidence: `docs/qa/sv1-track-b/` (ignored). | Not run: NFC write (no NFC on the simulator), Android, large text size, the native Share sheet completing a real send, Claimed reached through a second profile (this run cancelled the card back to its own wallet). Seen, not changed: the fund amount field rejects a comma decimal from the iOS keypad ("0,01"); the left fade of the filter row swallows taps on the left part of "All" after scrolling. Decisions: a Not funded card shows no share tiles ("Share before funding" in ⋯ uses the system share after the sheet); the card-variant neutral badge uses the mockup's light tint; a shared card that is still empty keeps the funding footer. |
| 2026-10-15 | SV-1 Track A: Services tiles (SV-1.1–1.5) | `claude/sv1-services-tiles-1b8f39` from `redesign` (`87566047`): `SignedInServicesHome.js`, `signedIn.js` (purpose lines replace the two descriptions); deleted `services-gift-card-folded.png` and `services-address-book-folded.png` (nothing else imported them) | iOS simulators `Verus GR3 QA` (402 pt) and `Verus GR3 Compact` (iPhone SE), Metro from the worktree, real taps, Testnet. The tile is local to the Services root, so its styles stay in the screen. The gift card count reads `requestServiceStoredData(GIFT_CARD_SERVICE_ID)` through `normalizeGiftCardServiceData`, as `GiftCardService` does; both counts load on focus. `GR3 Test 2`: dark and light, "3 cards" (the list holds 3 cards); the address line went "Save addresses" → "1 saved" → "2 saved" → "1 saved" → "Save addresses" as test records were added and removed, each on return to the tab. SE: a new disposable Testnet profile `SV1 Tiles QA`, dark and light with no cards and no addresses ("Send funds or IDs", "Save addresses"), then "1 card" after one unfunded card was saved through "Fund from another wallet". Measured tiles: 175×140 (402 pt) and 161×140 (SE); the mockup gives 170.5×140 at 393 pt. Both tiles open their screens. At the largest accessibility text size nothing changes, because `applyGlobalTypography.js` turns off font scaling. Checks: `check:design` (30 sources), `check:safe-areas` on `SignedInServicesHome.js`, a Babel parse (2 files), `git diff --check`. ESLint does not start in this checkout (`eslint-plugin-import` cannot load; environment). Evidence: `docs/qa/sv1-track-a/` (ignored). | Icons use the Lucide default stroke (2), as the sheet action rows do; the mockup draws 1.8. The user kept 2 (2026-10-15). Not run: Android, VoiceOver (labels from source, for example "Gift cards. 3 cards"), the loading state (the line stays empty until the first load ends; too fast to capture), and the load-error path (falls back to the purpose line; source only). The SE keeps `SV1 Tiles QA` with one unfunded card. |
| 2026-10-15 | SV-1 preparation | `claude/sv1-prep` from `redesign` (`c817c795`): `DESIGN.md`, `AcknowledgeSheet.js`, this plan | The user chose the Services tiles and the fixed gift card from HTML mockups (artifact and `docs/qa/sv1/mockup.html`), then corrected the copy button, the sheet action rows, the status dot, and the missing "Not now". DESIGN.md now has the status badge rule, the Confirmation sheet rule, the "Services home" and "Gift card detail" patterns, and four pattern-map rows. `AcknowledgeSheet` takes an optional `dismissLabel` that renders an `AppButton` with `variant="text"`; without it the sheet is unchanged. Checks: `check:design` (30 sources), `check:safe-areas` on `AcknowledgeSheet.js`, a Babel parse, `git diff --check`. | The dismiss button is not rendered yet; Track B renders it on the simulator (SV-1.13). Next: Track A (SV-1.1–1.5) and Track B (SV-1.6–1.14) in parallel. If both merges touch this log, keep both rows. |
| 2026-10-12 | O7 completion feedback | `claude/request-completion-feedback` from `redesign` (`9ea5133d`), merged into `redesign`: `NeutralCheckMark.js` (new), `GenericRequestHome.js`, `DESIGN.md`, one mock line in `genericResponseNetwork.unit.test.js` (the test mocks each component that `GenericRequestHome` imports) | iPhone SE, Metro, real taps, deeplink-sim, screen video frames. The first-pass O7 finding was wrong: a POST sign in shows “Preparing response”, “Sending response” and “Response sent” (the check animates, then holds about a second) before it returns to the wallet. The first-pass screenshots caught only the wallet. Changed: the “Request complete” (no response sent) and “Browser opened” sheets use a neutral mark instead of the green check, because they confirm no delivery. Verified in dark and light mode; the POST sheet keeps the green check. `check:design`, `check:safe-areas`, parse, and the three nearby unit suites pass. The full jest run has 25 failing suites; the ones I read fail on the `react-native-svg` and native-module setup, and the `lucide-react-native` import in `HighRiskStep.js` predates my work. | Not changed: a POST success closes by itself after 0.9 s while the other two wait for Done; the identity-update sheet is a near copy of this sheet; app encryption, data and credential flows share this code path but were not re-recorded; Android not re-run. |
| 2026-10-12 | Small-device follow-up: compact titles, gift-card acknowledgement sheet, unlock and payment fixes | `claude/small-device-followup` from `redesign` (`7148dfc3`), merged into `redesign`: `RequestTitle.js` and `AcknowledgeSheet.js` (new), `BottomSheetModal.js`, `UnlockWalletSheet.js`, `SendModal.render.js`, `GenericRequestHome.js`, `GiftCardServiceIntroSlider.js`, nine request screens and five style files | `Verus GR3 Compact` (iPhone SE), the `Small_360x640` AVD (720×1280 px), Metro, real taps, VRSCTEST daemon, deeplink-sim. Verified: compact titles (26/32) on both devices; sign in, app encryption, identity-update review and high-risk titles fit on one line; gift-card acknowledgement sheet on both; the sync-failed alert shows over the unlock sheet on Android and “No” finishes the unlock; the unlock sheet with the keyboard fits on Android and SE; the payment review no longer adds the status bar inset twice on Android; a failed delivery shows the host on its own line. Checks: `check:design`, `check:safe-areas --changed`, parse, three existing unit suites (8 tests). | Not changed: O5 and O6 are dev-only (the LogBox warning comes from `react-native-tab-view` 3.5.2 under React 18.3; the “Refreshing…” banner is the Fast Refresh indicator); O7 completion feedback needs a design decision; the O8 chevron did not reproduce (the chip is not pressable on data reviews); long VerusID names still truncate. Not run: dark mode on SE, Android payment send, text scaling. |
| 2026-10-12 | Small-device GenericRequest run (iPhone SE and 360×640 dp Android) | `claude/small-device-gr-qa` from `redesign` (`565da5d5`), merged into `redesign`: `BottomSheetModal.js`, `PasswordCheck.js`, `ProvisionIdentityBottomSheet.js`, `AuthenticationRequestInfo.js`, `AppEncryptionRequestInfo.js`, `InvoiceInfo.js`, `InvoicePaymentReview.js`, `InvoicePaymentResult.js`, `SpendableKeyRequestInfo.js` | `Verus GR3 Compact` (iPhone SE, iOS 26.5), a Pixel 8 AVD at 720×1280 px (size override) and a real 720×1280 AVD, Metro, real taps, VRSCTEST daemon, deeplink-sim and the provisioning webhook. Harness-verified: sign in, + app encryption, data packet, + data packet, credential variants, identity update (content add, tx confirmed), invoice (paid 0.01), five delivery modes, six rejections. High-risk updates, claim with no funds, wallet backup and provisioning reviewed only. Fixed: Android tall sheets ran off the screen (identity-update acknowledgement button unreachable; `BottomSheetModal` max height), provisioning and password sheets hid Continue behind the keyboard, five reviews had no scroll cue, a claim ended with a false “No response was sent” sheet. Design, safe-area, parse and completion-flow checks pass. | Open: unlock hangs when the sync-failed alert opens under the unlock sheet (Android), identity-update review and payment review clipping (Android), dev warning toast over Send, “Refreshing…” banner over the title, inconsistent completion feedback. Not run: NFC, funded claim, gift-card creation, registration, Android payments. Local report: `docs/qa/small-device/report.local.md` and `gallery.local.html` (ignored). |
| 2026-10-11 | NFC-1 tap screen (NFC-1.9–1.11) | `codex/nfc-1-claim-from-card`, same commit as NFC-1.1–1.7: `walletBackupNfc.js` (phase runner, error codes, iOS sheet text, session flag), new `nfcTapText.js`, new `components/NfcTap/` (`NfcTapSymbol`, `NfcTapView`, `NfcTapModal`, `NfcTapHost`), new `nfcTap.styles.js`, new `useReduceMotion.js`, `nfcTap` reducer and dispatchers, `VerusMobile.js` (host, security cover), `deeplinkNfc.js`, `WalletBackupRequestInfo.js` and its styles, `ImportNfc.js`, `GiftCardShareController.js`, `GiftCardShareSheet.js`, `GiftCardServiceOverview.js`, `tokens.js` (`primaryBackground`); `deeplinkNfcSubmission.unit.test.js` ported to the tap screen | iOS simulators `Verus GR3 QA` (402 pt) and `Verus GR3 Compact` (iPhone SE), Metro, real taps. NFC came from a fake chip patched into the running debug app through the debugger (`NfcManager` methods replaced in memory; no app code; gone after the app stopped). The fake recorded the iOS sheet calls. Claim read signed out: waiting (“Hold the card here”, waves up), active (“Hold still”, ring), done (check) → “Claim this card” opened by itself; sheet “Hold still.” → “Done.”. Card moved → “Card moved too soon” with Try again and Cancel; sheet error “Card moved too soon.”; Try again → waiting. Wallet-backup card signed out → “Wallet backup found” with Restore wallet; from Login → Other options it closed and opened the restore step, which started its own read. Signed in → “Wallet backup found” with Close only. Restore: no backup (notice), no card (failed), sheet Cancel (back to start, no text), a fresh unencrypted throwaway backup → “Backup found” → “Personalize your wallet” (stopped there; no wallet created). Backup from Settings (GR3 Test 2, encrypted): preparing with grey ring during the multi-minute encryption (JS thread busy, ring kept turning), waiting, active, “Backup written” with the wallet-password text, Done → Security & recovery. Unencrypted: card moved → failed → Try again → written with the no-password text. Request mode (dark, from “Back up first”): failed → Try again went straight to the read after the fix (first run asked the no-password question again) → “Backup written” with Continue → GR3-D17 screen, cancelled. Gift card write (new unfunded draft “NFC2 tap test”): waiting, card moved → failed, Try again → “Gift card written” with Done → card shows “Shared from this wallet”. Light and dark at 402 pt; compact dark (no card found, notice with two actions). Normal-size “Get started” has three rows on the simulator: the NFC support check runs before the fake loads. Fixed during QA: repeated no-password question on Try again; a program error (TypeError) showed its raw text, now the general hint; known card results no longer log as errors. Checks: Babel parse (32 files), `check:design`, `check:safe-areas --changed` (22 files), `git diff --check`; Jest: NFC read (4, ported) and NFC module (33) pass. `nfcImportSubmission` and `walletBackupRequestSession` fail to load before and after (incomplete `react-native` mock). Evidence: `docs/qa/nfc2/` (ignored). | NFC-1.8 on the physical iPhone: real card, real iOS sheet, haptics, timing, security cover. Android not run (5-second hold, centered layout, Cancel button, translucent status bar). NFC-D1–D4 recorded. |
| 2026-10-11 | NFC-1 claim from an NFC card (NFC-1.1–1.7) | `codex/nfc-1-claim-from-card` from `redesign` (`74706a68`), uncommitted: `deeplinkNfc.js`, `walletBackupNfc.js`, new `useNfcSupported.js`, `LoadingModal.js`, `OnboardingStartSheet.js`, `LandingScreen.js`, `OtherOptionsSheet.js`, `Login.js`, `VerusPay.js`, `CreateProfile.js`; test mock in `deeplinkNfcSubmission.unit.test.js` | iOS simulators (`Verus GR3 QA`, `Verus GR3 Compact` iPhone SE), Metro, real taps. The simulator has no NFC, so a temporary, uncommitted stub made `isNfcSupported` true and returned a chosen card result; the stub is removed and no QA code remains. Card link: an unsigned VRSCTEST wallet-backup + spendable-key request with a new throwaway key (address derived with the app's own key code), funded 0.01 (`5b8090f3…`). Signed out with wallets: Other options → “Claim from NFC card” → status modal → “Claim this card” (first time this choice is reachable) → Claim to existing wallet → 0.0099 found after one confirmation → unlock GR3 Test 2 → claim `d6a1b0a8…` (mempool, spends the funding) → balance 5.0289 → 5.0388. Signed in: Scan → button → “Claim this card”; reopening the claimed card showed GR3-D17. No wallets (compact): “Get started” has four rows; Import and Back keep them; the read opens “Create wallet” for the card. Onboarding Scan QR code with the card link (scanner `onScan` called through the debugger; no simulator camera) opens the same request; Cancel returns to Welcome. Messages: wallet-backup card signed in (explanation) and signed out (Continue opens the NFC restore step); “Nothing to claim”; “Card not read”; cancel shows nothing. Light and dark: Other options, status modal, claim choice, Scan button, Get started (compact). The stuck-modal race was reproduced at 0 ms and gone after the fix. A JS reload while signed in closed the debug app once (fits GR3-E2; no crash report). Checks: Babel parse (11 files), `check:design`, `check:safe-areas --changed`, `git diff --check`; Jest: NFC read and NFC backup suites, 37 tests pass. `profileCreationSubmission` and `walletBackupRequestSession` fail to load before and after (no VisionCamera mock; missing `StyleSheet` mock). Evidence: `docs/qa/nfc1/` (ignored). | NFC-1.8 on the physical iPhone with a card (GR-3.9 session): real NFC reads from all three entries, the Scan button over the live camera, the iOS NFC sheet and cancel. Normal-size “Get started” not captured (the normal simulator has wallets). Android not run. GR3-D16 and GR3-D17 recorded for later. |
| 2026-10-10 | GR-3.17 GR-1/GR-2 closure and QA-1 record | `codex/gr3-request-matrix` at `dd3a476f`; local `docs/genericrequest-types-and-chains.html` (ignored) | Runtime gap checks first (iOS `Verus GR3 QA`, profile `GR3 Test 2`; Android emulator, profile `GR3 Android`): credential request with a required signer the wallet does not control showed “Required VerusID unavailable” with Switch wallet and sent nothing; with its own ID it proceeded; the request-details sheet showed the full required ID and closed and reopened; a data-packet request opened while locked showed “Unlock wallet to review”, unlocked with Face ID from the request, kept every item unchecked with “Sign data” disabled, and after consent the harness verified 4 signatures; the iOS picker opened and showed the selected state after the GR3-B9 fix; Android hardware Back on a review returned to Wallet and sent nothing (GR3-D15: request state not cleared). QA-1 for GR-1/GR-2/GR-3: QA-1.1 contracts, commits, and touched paths are in the GR rows above. QA-1.2 light and dark at normal size on the real app; compact from the GR-1 fixtures and GR-3.13; GR-3 compact deferred by the user. QA-1.3 labels and enabled states from the Android accessibility tree (every control labelled, “Sign data” disabled until consent; each checkbox row also exposes an inner unlabelled disabled node, possible duplicate announcement, not confirmed); sheet close/reopen; Android hardware Back; safe areas and scroll cues in screenshots; text scaling has no effect app-wide; reduced motion and full VoiceOver/TalkBack not run. QA-1.4 design, safe-area, parser, and focused Jest checks pass for every GR-3 commit. QA-1.5 GR-1/GR-2 independent design and signing reviews READY (GR-1/GR-2 report); GR-3 changes have no separate independent review. QA-1.6 shared changes rechecked on sign-in, identity update, invoice, and claim in GR-3.16. QA-1.7 screens, callbacks, and transactions recorded separately. QA-1.8 open items have owners: GR3-B8 task, GR-3.9 user device, GR3-B4 and P1 deferred, GR3-D12 and D15 recorded. Protocol map refreshed: nine supported details, unsigned order rules, delivery path, error state, runtime evidence per type, open items; renders at desktop and 375 px width without page overflow, light and dark tokens. | Full VoiceOver/TalkBack walkthrough, reduced motion, and the text-scaling decision stay as QA-1 follow-ups. GR-3 has no separate independent review. GR-3.12, GR-3.13, and GR-3.16 wait for GR-3.9. |
| 2026-10-10 | GR-3.16 matrix rerun and Android smoke | `codex/gr3-request-matrix` at `8270ae32`, fixes in commit `dd3a476f`: `SpendableKeyRequestInfo.js` (claiming spinner) and `IdentityPickerSheet.js` (boolean `accessibilityState`) | iOS `Verus GR3 QA`, profile `GR3 Test 2`, cold launch, real taps. Harness-verified: sign-in + app encryption in POST, fail once (attempt 2), fail always (Leave without sending), redirect (Safari verified, Browser opened sheet), no callback (Request complete); identity update content add `12eecb53…` and content replace with fail once `d33d60ce…` (one transaction, same txid redelivered), both confirmed; high-risk authorities cancelled with no callback; data packet POST and fail always; credential missing; both credential/data-packet orders; sign-in + credentials and sign-in + invoice (`4c74bb97…`) with the GR-3.19 labels; invoice only `2f6e9187…`; six rejected-request cases with no callbacks; provisioning accepted by the webhook, then the expected failure notice (GR3-E1). Claiming state held with a QA-only debugger hold (removed): before/after in light and dark, claim `cfdafdc8…`. Android `Pixel_8_API_35`, debug APK, new disposable profile `GR3 Android`: app encryption POST, sign-in + data packet (“Continue to sign data”), identity update `b2b03cdb…`, credential missing, wrong network and over-length, provisioning accepted, invoice `eeede94a…`, gift-card claim `3e55575c…` with the fixed claiming state in light and dark. GR3-B9 reproduced on Android before the fix and gone after it. GR3-B8 reproduced three times on iOS; a debugger counter showed an identical signed transaction returned as success. Checks: Babel parse, `check:design`, `check:safe-areas --changed`, `git diff --check`; Jest: identity picker and spendable key suites, 38 tests pass. | GR3-B8 triage (outside the redesign). Credential matching and provisioning registration need GR3-E1 cleared. Wallet backup on the physical iPhone (GR-3.9). Compact deferred. Android: GR3-D12 also hits the unlock sheet after a sync failure. |
| 2026-10-10 | GR-3.19 mixed-request next step | `codex/gr3-request-matrix`, commit `8270ae32`: new `genericRequestNextStep.js`; `GenericRequestHome.js`, `AuthenticationRequestInfo.js` | iPhone 17 Pro simulator, VRSCTEST, profile `GR3 Test 2`, real taps. Before: auth + data packet showed “Sign in with VerusID”, then “Sign data” with no hint. After: the same request showed “Continue to sign data” once a VerusID was selected; it opened “Sign data”; signing all four items delivered one response (harness: authentication verified, 4 signatures, 1 attempt) and the app returned to Wallet. Auth + credential: “Continue to share credentials” (about 231 of about 295 points available on iPhone SE, so no truncation) opened “Share credentials” (light and dark); cancelled. Auth + provisioning (local webhook): the label stays “Sign in with VerusID”; cancelled, nothing submitted. Cancel at step 2 sent nothing (harness `waiting`, 0 attempts). A node script on the real helper with real VDXF keys covers 15 mixes (each type, provisioning, skipped backup, auth last, already processed). Checks: Babel parse, `check:design`, `check:safe-areas --changed`, `git diff --check`; Jest: completion and link-failure suites, 11 tests pass. | Invoice, Identity Update, wallet backup and claim labels verified by script only. Compact size not run. |
| 2026-10-10 | GR-3.18 high-risk steps, names, claim review | `codex/gr3-request-matrix`, commit `50727421`: `HighRiskStep.js` + `highRiskStep.styles.js`, `VerusIdContentChangeCard.js` + `verusIdObjectData.styles.js`, `IdentityUpdateRequestInfo.js`, `ProvisionIdentityBottomSheet.js`, `fullyqualifiedname.js`, `SpendableKeyRequestInfo.js` + `spendableKeyRequestInfo.styles.js`, `spendableKey.js` | iPhone 17 Pro simulator, VRSCTEST, new disposable profile `GR3 Test 2` (Face ID), real taps, light and dark. Before/after with deeplink-sim high-risk requests on `liveqa09482856.antafri@` (all cancelled, nothing approved): authorities step shows current and new recovery and revocation IDs in full (was `TestBob....SCTEST@` only); shared-control step shows the added address `RSRGXw62…` (was “Added”); acknowledgement sheet shows names with i-addresses; clear-content cards read “Unnamed key” with the full i-address (was `iDdo...GC45`); “Updating identity” wraps after a dot. Provisioning (local webhook, not submitted; request stayed `qr_generated`): the name preview and the review row wrap after a dot. Gift-card claim: card funded from the daemon with 0.05 VRSCTEST (txid `d7e1b9ca1a0c0b6830c43e65f079cb90bed75dc872cb3499cf34db90585e3562`); the review showed To `GR3 Test 2` / `RXW9b6Pg…` and Network fee 0.0001 VRSCTEST; claim txid `4dacbc0b869dea3b2b2f81bdcb66d76569a25196b87e8f1ca44992c2b8cedb35` pays 0.0499 to `RXW9b6Pg…` with a 0.0001 fee (daemon). Checks: Babel parse, `check:design`, `check:safe-areas --changed`, `git diff --check`; Jest: 6 related suites, 59 tests pass. | Compact size not run. Loss-of-control and multi-address primary changes use the same rows but were not rendered. The identity picker and the “Request from” card still cut long names with an ellipsis (shared components, out of scope). |
| 2026-10-10 | GR-3.15 request error state | `codex/gr3-request-matrix`, commit `39dabf36`: new `genericRequestRejection.js`; `GenericRequestLoading.js`, `DeepLink.js`, `GenericRequestHome.js`, `sagas/deeplink.js`, `AppThemeProvider.js`; error codes in `requestAccounts.js`, `experimentalDeeplinks.js`, `envelopeValidator.js`, `identityUpdateRequestDetailsHandler.js`, `verusPayInvoiceDetailsValidator.js` | iPhone 17 Pro simulator, VRSCTEST, real taps, light and dark. Signed in: wrong-network-flag “Wrong network”, wrong-network-system “Request not valid”, expired-auth “Request expired”, bad-signature “Cannot verify signer”, unknown-detail “Unsupported request”; Close returned to Wallet each time. Signed out: wrong-network-flag “Request not valid”, Close returned to the signed-out home. Over-length: translated alert, and the backdrop now dims the Wallet (light) and the signed-out home (dark). Network failure injected through the Hermes debugger (QA-only switch on the RPC client, removed, app relaunched): signer lookup failure shows “Network unavailable” with Try again; Try again with the failure still on made one new lookup and showed the error again; with the failure off it opened the sign-in review. Identity Update content lookup failure (content-add request, signed out) showed the error from `GenericRequestHome`; Try again opened “Review VerusID changes”; Close returned to the signed-out home with the deeplink cleared. No request was approved. Checks: Babel parse, `check:design`, `check:safe-areas --changed`, `git diff --check`; Jest: 10 related suites, 55 tests pass; a node script on the real translator covers every mapping. | Experimental-off and delegated-signer copy verified by script only. Compact size not run (deferred). The GR3 Test profile password was lost when the machine crashed (it lived only in `/tmp`), so the signed-in checks after the crash ran signed out. |
| 2026-10-10 | GR-3.14 review leftovers | `codex/gr3-request-matrix`, commit `0c75f191`: `GenericRequestHome.js`, `DeepLinkStackScreens.js`, `InvoicePaymentConfiguration.js`, `ContentStep.js` + `verusIdObjectData.styles.js`, `DataRequestReview.js` + `dataRequestInfo.styles.js`, `math.js`, `genericRequestDelivery.js`, sign-in and app-encryption reviews; network test stubs updated; deeplink-sim `high-risk-private-address` variant on `codex/gr3-generators` (uncommitted) | iPhone 17 Pro simulator, real taps, light and dark. Other-app action and sheet rendered with a temporary, uncommitted “Valu installed” stub (removed): action above the review, review starts under it, footer keeps its bottom inset, sheet in both themes, failed handoff shows “Cannot open Valu Mobile”. Without the stub the review is unchanged. D6: app encryption with HTTP POST shows “POST over HTTP” (review and data details sheet); sign-in with an HTTPS callback shows “Secure POST”; the HTTP request was approved and the harness verified the response (1 attempt). D8: data packet “Statement 1” starts about 42 points under “View request details” (was about 110). D9: identity update “Expires 1 hour”, invoice “About 1 hour”; a node script on the real `blocksToTime` covers 0–100000 blocks, other block times, and invalid input. Content step: private-address change (fresh harness address with no spending key; request cancelled) shows the address once, in monospace. Invoice inline payment options still render. Checks: Babel parse, `check:design`, `check:safe-areas --changed`, Jest: Identity Update (1 test), network (4), and completion (9) suites pass; harness typecheck and 155 tests pass. | Credential review shares the D8 component but was not run. |
| 2026-10-10 | GR-3.13 wallet backup redesign | `codex/gr3-request-matrix` after `ee604685`: `WalletBackupRequestInfo.js`, new `walletBackupRequestInfo.styles.js`, `styles/index.js`, `NfcBackup.js`, `DeepLinkReviewScrollView.js` (keyboard props passed through), `walletBackupNfc.js` (one prompt string) | iPhone 17 Pro and compact simulators, real taps, light and dark. Settings path: options, custom password with keyboard and strength hint, brute-force sheet (Medium to High applied after close), no-password confirmation, and the “Backup not written” alert (simulator has no NFC). Request path from an unsigned VRSCTEST wallet-backup link: signed-out unlock step, create-wallet form, shared unlock sheet (“Wallet backup”, testnet wallet only), options. “Claim this card” choice from the same link with a fresh unfunded spendable key, dispatched with `fromNfc: true` (simulated NFC read). With a temporary, uncommitted NFC write stub (removed; served bundle checked): processing state, “Backup written” with Done (request) or Continue (claim follows), Done finished the request on Wallet with the deeplink cleared (GR-3.12 path), Continue opened the claim step, Settings Done returned to Security & recovery with no alert, and a repeated request skipped the backup (completion marker). Compact: no-wallet create form and keyboard. Fixed during the run: spinner wrapper pushed processing text to the screen edge (`AnimatedActivityIndicatorBox` has `flex: 1`); double status-bar inset under the Settings header; footer partly under the keyboard in Settings; iOS strong-password suggestion left an unseen value in field state (now the onboarding `oneTimeCode` settings). Checks: Babel parse, `check:design`, `check:safe-areas --changed` pass; ESLint cannot load (plugin path error, environment). `walletBackupRequestSession.unit.test.js` already failed to load (mock lacks `StyleSheet`) and pins old copy and the old immediate `next`. A full JS reload while signed in crashed the debug app once (GR3-E2). | Real NFC write, write failure, and card checks on the physical iPhone (GR-3.9). Repair the session test for the result step. `SpendableKeyRequestInfo` uses the same spinner wrapper in its claiming state (likely same defect, not run). |
| 2026-10-10 | GR-3.12 legacy completion removed | `codex/gr3-request-matrix` after `b09f9622`: `genericRequestCompletionFlow.js`, `GenericRequestHome.js`, `DeepLinkStackScreens.js`, `styles/index.js`; deleted `GenericRequestComplete.js` and its styles; updated completion test and checks | iPhone 17 Pro simulator, fresh launch with the new bundle, real taps. Baseline first: auth + invoice already used the delivery sheet after the send modal closed (Response sent, harness received; no refused presentation in the iOS log). After the change: invoice-only payment txid `5bf7884ce618c857a50b14b82c810e8956138ea6d2159049ca5589d07d08ffe6` (mempool), Payment submitted → Done → Wallet with no legacy screen, deeplink cleared. Regression: missing credentials still shows “Request complete / No response was sent”; auth + app encryption POST verified by the harness. Checks: completion Jest suite 9/9 and node check 11 cases pass; parse, `check:design`, `check:safe-areas --changed` pass. `check-generic-request-delivery.js` still fails to load on an existing missing module; its legacy-screen assertions are removed. `genericResponseNetwork.unit.test.js` cannot run (stale `react-native` mock) and still expects the removed route; separate task suggested. | Wallet backup and skipped-backup completion on the physical iPhone (GR-3.9); “backup written” result in GR-3.13. |
| 2026-10-10 | GR-3 Phase 2 functional fixes | `codex/gr3-request-matrix`, uncommitted: `SendModal.render.js`, `AppEncryptionRequestInfo.js` + styles, `AuthenticationRequestInfo.js`, `responseDeliverySecurity.js` | iPhone 17 Pro simulator, VRSCTEST, fresh app launch with the fixed bundle (confirmed in the served bundle), real taps only. GR3-B6: invoice modal now has one `RCTTouchHandler` (lldb) and each touch reaches JS once; Payment details, Done and Send work; payment txid `198d753515400cc59f9bede57fa79ac5232e901941ebcd29bb8488f2e44b5254` (daemon mempool, then balance 4.9684); invoice-only still ends on legacy completion (GR-3.12). Revoke modal (same branch) opened with a throwaway authority: one touch handler, single touch events, back press works; nothing submitted. Recover shares the branch; not run. GR3-B3: auth + app encryption, all five delivery modes, harness-verified: POST (1 verified attempt), fail once (Try again, attempt 2), fail always (Try again fails, Leave without sending returns to Wallet), redirect (Browser opened sheet, Done), no callback (Request complete sheet, no callback). Error sheet also checked in dark mode. The new “Preparing response” button state is too short to capture. GR3-B2: reproduced (stale provisioning request on the next link), then fixed: deeplink ID is null after provisioning and the next link opens its own request. GR3-R1: HTTP response POSTs now need `__DEV__` and the env flag; existing unit tests pass. Checks: Babel parse of changed files, `responseDeliverySecurity` and `genericRequestCompletionFlow` suites pass; `genericRequestDelivery` suite fails to load (store import chain, `constants.js:159`, not touched); `check:design` and `check:safe-areas --changed` pass. New notes: a JS reload crashes the debug app while shielded sync runs (`VerusLightClient` sends on the old bridge; GR3-E2); `react-native-tab-view` 3.5.2 logs a dev “key prop spread” error in the send modal. | Phase 3 (GR-3.12 to GR-3.15, GR-3.18, GR-3.19). Android smoke for B6 in Phase 4. Commit when the user asks. |
| 2026-10-10 | GR-3 Phase 2 triage (root causes) | `codex/gr3-request-matrix`, no new code changes | GR3-B6 reproduced on the iPhone 17 Pro simulator with a fresh invoice: a JS hook logged each touch twice inside the invoice send modal and once on the main screen, and lldb showed two `RCTTouchHandler`s in one view chain (modal root and `RNSScreenView`). Cause: the invoice and identity-safety `Root.Navigator` lacks `detachInactiveScreens={false}`, which upstream `ac501c65` added to the other modal navigators. GR3-B3 cause from source and the Phase 1 log: `AppEncryptionRequestInfo` keeps its loading sheet open while the delivery sheet presents. GR3-B2 and GR3-B4 causes confirmed in source. GR3-D12 is an alert rendered under native modals, not the B3 race. GR3-P1 matches upstream behavior. Fixes not yet applied or run. | User agreement on the bug list and scope (GR-3.11); then the functional fixes, each reproduced first. Revoke/Recover identity likely share B6 (not yet run). |
| 2026-10-09 | GR-3 Phase 1 matrix (iOS normal size) | `codex/gr3-request-matrix`, uncommitted fixes in `ProvisionIdentityBottomSheet.js` and `getIdentityContent.js`; deeplink-sim harness fixes uncommitted on `codex/gr3-generators` | iPhone 17 Pro simulator, VRSCTEST. Harness-verified callbacks: authentication + app encryption (all five delivery modes), data packet, credential (matching, partial; missing correctly sends none), both credential/data-packet orders, authentication + data packet, + credential, + invoice. Confirmed VRSCTEST transactions: three identity updates, two invoice payments, gift card fund and spendable-key claim. All six negative cases rejected with no callback. Dark mode renders correctly. Fixed and verified: GR3-B1 (provisioning sheet session context), GR3-B5 (identity content lookup rejected testnet names). Open: GR3-B2 stale deeplink after provisioning, GR3-B3 delivery sheet not presented under the detail screen's processing sheet (stuck dim screen on failure and no-callback), GR3-B4 long FQN request IDs crash parsing under Hermes, GR3-B6 invoice send modal ignores presses. Protocol question GR3-P1 (authentication response request ID). Details: local `gr3-matrix.local.md`, `docs/qa/gr3/phase1/`. | Compact screenshots (needs simulator access approval), physical-iPhone wallet backup and QR scan (GR-3.9), then GR-3.11 triage. |
| 2026-10-09 | GR-3 Phase 0 test bench | `codex/gr3-request-matrix` from `d4e1dbd1`; generators uncommitted on deeplink-sim `codex/gr3-generators` | Fresh iOS debug build from this checkout runs on two clean simulators (iPhone 17 Pro, iPhone SE). A disposable VRSCTEST profile exists with experimental requests on and 5 VRSCTEST funding. The app's key for `v2api.verustest.net` returns HTTP 401, so the profile uses the in-app Custom RPC override `https://api.verustest.net` (GR3-B0). A provisioning link opened with `simctl openurl` reaches the redesigned authentication review. deeplink-sim now generates app-encryption, identity-update, and negative requests (typecheck, 155 tests). Findings and screenshots: local `gr3-matrix.local.md` and `docs/qa/gr3/`. | Phase 0 done. The test VerusID is the reused daemon ID `liveqa09482856.antafri@` (update txid `48a95967…`), linked by discovery. Provisioning stays Blocked (Testnet DeFi outage, GR3-B1). Next: Phase 1 matrix. |
| 2026-10-09 | Upstream sync review fixes | Commit on `codex/sync` after merge `c615aabc` | The review found two dropped upstream warnings. Gift Card detail now shows an "Unfunded gift card" notice before an empty card is shared. It reuses the existing shared-notice block, and the card back keeps one short line. The Identity Update content step restores upstream's caveat that a removal can affect values added in the same update. It shows only for mixed content-map changes and uses the card inset. The legacy convert confirmation suite loads again with one `InvoicePaymentReview` mock. A mutation of the uncertain-broadcast guard fails 3 of its 15 cases. Design (30 sources), safe-area (3 files), no-undef lint, `git diff --check`, and 7 related suites (120 tests) pass. Synthetic iOS fixture captures on the real overview and content step cover unfunded, funded, and shared-empty cards and mixed and private-only content, in light and dark at compact and normal sizes. Captures are local in `docs/qa/merge-review-fixes/screenshots`. | Committed locally; no push. The other review findings remain open: confirm-step state fallback, inline lock explanation, wizard funding-error guide action, share after funding, the Android Media3 pin, and the glog privacy bundle. Android runtime and authenticated journeys remain unverified. |
| 2026-10-09 | Upstream sync with redesign preservation | `codex/sync`, based on `ccc0c256`, merges `dev-asf-parent` through `7d74cd6a` | Updated the four pinned Verus libraries together and integrated RN 0.77.3. Kept local layouts, shared primitives, themes, storage queues, and session guards. Adapted identity state/threshold review, content semantics, gift-card first-funding rules, and uncertain-broadcast protection to the redesign. Both native builds and both production JS bundles pass. Design (30 sources), targeted safe-area (5 files), parser (119 files), and focused flow checks pass. Six corrected/boundary suites pass 96 tests. The APK passes 16 KB ELF/ZIP checks for 34 libraries. Inspected 32 real-component iOS fixture captures across light/dark and normal/compact, plus actual production welcome in both themes. Corrected compact truncation of the new identity status labels. [Local receipt](docs/qa/upstream-sync/qa.local.md); [capture gallery](docs/qa/upstream-sync/gallery.local.html). | Ten imported UI suites are blocked by legacy native/theme mocks; no full-suite pass. Fixture captures do not prove authenticated journeys. Android runtime, live signing/transfers, existing-profile migration, NFC, and full accessibility remain unverified. Earlier GR/TX/RX/ID follow-ups and global QA checkboxes retain their recorded scope. No push. |
| 2026-09-12 | ID-1 final acceptance (scoped local delivery) | Committed as `33865cab` on `codex/id1-redesign` in worktree `/private/tmp/verus-mobile-id1-01a09345`; verified and review-ready, locally integrated into `codex/integrate-generic-request-upstream` | Final verification of the ID-1 candidate. The parent independently ran 10 focused ID-1 suites (63 tests), `git diff --check`, Babel parse for all 9 changed production JS files, design contract (30 canonical sources), safe-area (9 files), search-field (15 files), identity-authority funding (PASS), and GenericRequest completion flow (9 cases). A task-owned iOS release fixture bundle compiled from the actual candidate (26 assets), and synthetic disposable VRSCTEST states were exercised on a normal 402x874 simulator and a compact iPhone SE with light/dark captures, covering no identities, several identities, long names, discovery loading/empty/error, the always-reachable manual fallback, manual validation/lookup/resolved review/failure, processing single-flight with blocked dismissal/Back, pending error/progress/READY actions, details loading/error/long values, separate accessible `CopyAction` nodes and copied feedback, unlink cancellation/failure (unlink remains a local association change only), and the rebuilt final details spot check. Native QA found a manual-row clipping, corrected before the final capture. The same and only independent Astra high-risk reviewer returned READY with all original and follow-up findings closed; the complete before/after state guard was 1,702 files, no exclusions, identical. Parent-owned visual QA applied the canonical SH-1/onboarding patterns at normal/compact and light/dark; because the user required exactly one independent reviewer, no second design-adviser reviewer was added, and the single reviewer explicitly applied `max-product-design-taste` while reviewing the final renders. Proof limits: fixture data and API are synthetic and cannot sign, spend, move funds, expose a real key, or prove live RPC or authenticated-wallet behavior, and callback or session authentication is not transaction or settlement proof; native proof is iOS only. Android runtime, full VoiceOver/TalkBack, exhaustive text scaling/reduced motion, and authenticated disposable-wallet mutation remain explicitly unverified follow-up, not implied passes. Node was 22.18.0 because the requested 22.23.2 was unavailable; checks used the canonical sibling `node_modules`, and no source depends on it. | ID-1.10–1.11 complete for the scoped local delivery. ID-1 is verified and review-ready, committed as `33865cab` and locally integrated into `codex/integrate-generic-request-upstream`; `origin/codex/integrate-generic-request-upstream` remains behind until a separately authorized push. Global QA-1 stays open for the other workstreams. |
| 2026-09-12 | ID-1 final lifecycle corrections (two P2 defects) | Uncommitted local delivery over `a607faf6` on `codex/id1-redesign` in worktree `/private/tmp/verus-mobile-id1-01a09345`; the parent owns the commit and the rendered/native QA | Corrects the two reproduced P2 lifecycle defects from the same independent high-risk reviewer (five earlier findings already closed). (1) The unlink confirmation's delayed `goBack` callback now passes the immutable `requestContext.sessionScope` captured when the unlink started instead of the per-render `renderedSessionScopeRef`, keeping the mounted/focused-route/route-key checks. (2) `SignedInVerusIdService` now owns its READY-resume single-flight flag through the new `createVerusIdResumeOwner` guard (`verusIdFlowGuards.js`), which binds the in-flight flag/token to the session scope and releases the gate synchronously on an account-hash or session-epoch change, so an unresolved run cannot lock later READY actions; stale `catch`/`finally` stay inert. New focused regression coverage exercises the real queued callback and handler with deferred promises (`SignedInVerusIdLifecycle` 4, plus `verusIdFlowGuards` resume-owner cases now 15) and each defect was separately reverted by mutation to confirm the tests fail. The 10 focused ID-1 suites pass (63 tests). Babel parse (5 files), `git diff --check`, design contract (30 canonical sources), `check-safe-areas --changed` (9 files), `check-search-fields --changed` (15 files), `check-generic-request-completion-flow` (9 cases), and `check-identity-authority-funding` pass. HEAD unchanged at `a607faf6`; dependencies resolved through a temporary `NODE_PATH` to the sibling checkout (no source change depends on it). | ID-1.10–1.11 stay open for the parent: rendered light/dark normal/compact empty/error/keyboard/processing captures, the independent design-adviser pass, and the same reviewer's re-closure of these two corrections before acceptance and commit. |
| 2026-09-12 | ID-1 high-risk review corrections | Uncommitted local delivery over `a607faf6` on `codex/id1-redesign` in worktree `/private/tmp/verus-mobile-id1-01a09345`; the parent owns the commit and the rendered/native QA | Correction of the six blocking findings from the single independent high-risk review. New `src/utils/verusid/verusIdFlowGuards.js` holds the shared, tested decisions: candidate origin capture/match, pending-status-sheet dismissal, and the delayed-unlink navigation guard. `LinkExistingVerusIdSheet` binds discovery and manual lookup to the account hash plus login epoch, checks the scope after every await and before linking, and stamps immutable origin metadata on each candidate; `AuthenticationRequestInfo`, `AppEncryptionRequestInfo`, and `SignedInVerusIdService` revalidate the candidate's primary R-address against the current account's VRPC addresses and reject a stale origin. `processVerusId` now takes a backward-compatible optional guard checked after the storage await and before every dispatch/navigation; the signed-in service supplies the captured session plus a synchronous operation token, and retry/READY resume are single-flight with no stale dispatch, navigation, fallback reopen, state clearing, or cross-session error. The queued unlink `goBack` re-checks the originating session and focused route at execution time. A status sheet that becomes READY closes instead of showing false `In progress` copy. The Authentication passthrough fallback and the touched manual routes use the shared manual sheet with a prefilled FQN; no touched ID-1 path opens the legacy SendModal link UI. `IdentityPickerSheet` Back now guards on the synchronous `linkBusyRef`. Focused Jest suites added: `verusIdFlowGuards` (12), `processVerusIdResumeGuard` (4), `id1LinkFailureRouting` (2), and `IdentityPickerSheet` (3, including the ref-guard case confirmed to fail against the prior state-based Back guard). The four new suites plus 11 relevant existing suites pass (15 suites / 79 tests); Babel parse for the changed/new JS files, `git diff --check`, design contract (30 canonical sources), `check-safe-areas` (6 files), `check-search-fields --changed` (14 files), `check-generic-request-completion-flow` (9 cases), and `check-identity-authority-funding` pass. | ID-1.10–1.11 remain open: no rendered or native capture exists for the corrected manual/review/pending/unlink/details states, and the parent must re-run the independent high-risk and design reviews on this corrected candidate before acceptance and commit. This pass added no simulator/fixture files. Verification used a temporary `node_modules` symlink to the sibling checkout because this worktree has no installed dependencies and the sandboxed pnpm store is not writable; no source change depends on it. |
| 2026-09-12 | ID-1 correction adoption and verification pass | Uncommitted local delivery over `a607faf6` on `codex/id1-redesign` in worktree `/private/tmp/verus-mobile-id1-01a09345`; the parent owns the commit and the rendered/native QA | The prior correction candidate was inspected as untrusted work and re-verified against all six blockers; no production source needed changing, only the focused suites were tightened. `verusIdFlowGuards` (12) exhaustively covers stale origin/epoch rejection and the shared-first-address switch, READY/removed status-sheet dismissal, and the four delayed-unlink navigation rejections. `processVerusIdResumeGuard` (6) now also fails if the guard is not re-checked between each `dispatch`/storage await and the navigation, after the pre-navigation guard was confirmed present and then re-confirmed by mutation. `IdentityPickerSheet` (3) covers origin metadata on the discovered candidate, the same-frame Back block, and the blocked backdrop/system close, each proven to fail when its guard is removed. `id1LinkFailureRouting` (2) stays a structural source assertion that the touched consumers do not open the legacy SendModal link UI. Focused correction suites plus the existing ID-1 session/provisioning/notification suites: 10 suites / 62 tests. `git diff --check`, Babel parse on all 14 changed/new JS files, design contract (30 canonical sources), `check-safe-areas` (9 files), `check-search-fields --changed` (14 files), `check-generic-request-completion-flow` (9 cases), and `check-identity-authority-funding` pass. HEAD unchanged at `a607faf6`; dependencies were resolved through a temporary `NODE_PATH` to the sibling checkout (no source change depends on it). | ID-1.10–1.11 stay open for the parent: rendered and native light/dark normal/compact captures, the independent high-risk behavior re-review, and the design-adviser pass on this corrected candidate before acceptance and commit. |
| 2026-09-12 | ID-1 VerusID linking, details, and status implementation | Uncommitted local delivery over `a607faf6` on `codex/id1-redesign` in worktree `/private/tmp/verus-mobile-id1-01a09345`; the parent owns the commit and the rendered/native QA | Manual entry, validation, resolution, review, linking, and failure now live in the shared `LinkExistingVerusIdSheet`, so the touched consumers never open the legacy SendModal link flow; identity resolution is read-only and never requests seeds. Pending status and unlink confirmation are floating shared sheets with refresh/retry primary, removal/unlink secondary, controls disabled while processing, `onClosed` cleanup and navigation, and local-only unlink copy. Signed-in details leads with the name, status, network, and identifiers, keeps warnings and full values, collapses technical sections, uses inline `CopyAction`, and drops the unsupported “No attestations linked” section. `git diff --check` clean; design contract (30 canonical sources), `check-safe-areas` for the 5 changed files, Babel parse (5 changed files), relative-import resolution, `check-generic-request-completion-flow` (9 cases) and `check-identity-authority-funding` pass. | ID-1.10–1.11 remain open: no rendered or native capture exists for the new manual/review/pending/unlink/details states, and no independent design or behavior review has run on this candidate. `corepack pnpm` could not execute in this worktree (no installed `node_modules`), so the check scripts were run directly with `node`. Next: the parent captures iOS/Android light/dark normal/compact states and runs the required reviews before accepting. |
| 2026-09-12 | RX-1 accepted local delivery | Task-owned delivery over `19a5ede5` on `codex/integrate-generic-request-upstream`; exact commit in the local QA receipt | Full-screen request flow with the system decimal amount keypad, native subject/slippage fields, safe footer, preserved invoice/share contracts, and operation-bound cancel/save behavior. 32/32 independent focused checks pass; design (30 canonical sources), safe-area, parser, both native preview bundles and production iOS bundle pass. 196 native gallery captures include 120 static Receive/canonical states plus request, keyboard, error, cancellation, save, copy/selection and scrolled states across iOS/Android normal/compact and light/dark. Native copied change address matches the full fixture value; native QR images decode; QR save succeeds on both platforms. Same high-risk reviewer and design adviser are READY with no unresolved findings; full source guards identical (2,970 files, six generated/cache exclusions). [Screenshot gallery](docs/rx1-qa-20260911/index.html); [QA and commit receipt](docs/rx1-qa-20260911/qa.local.md) | RX-1.8–1.9 complete for disposable-fixture delivery. No personal/mainnet wallet, live RPC, signing, funds movement or settlement proof. Full VoiceOver/TalkBack, exhaustive text scaling and native reduced-motion settings remain QA-1 follow-up; sampled native and shared-source evidence are recorded. |
| 2026-09-11 | RX-1 Receive and payment-request implementation + correction passes | Uncommitted local delivery over `19a5ede5` on `codex/integrate-generic-request-upstream`; the parent commits after acceptance | Full-screen stepped payment-request task, platform monospace addresses, accurate Card/address states, `beforeRemove` parity with header back, stale-completion invalidation and single-flight create/QR-save guards. Corrections after an independent high-risk review: operation-bound QR save completion (a late save cannot mark a newer request saved, attach its failure or clear a newer guard) and a real cancel path while generation is pending (header back and `Cancel` invalidate generation identity before leaving; no stranded loading). Preview fixtures now use distinct per-Card address channels and real system i-addresses, and the harness gives details/wizard a real previous route with an optional chrome-free launch state. 27 focused non-Jest behaviour checks pass, including the real-StackRouter route-removal checks, the deferred-per-save CameraRoll checks, the actual preview fixture dataset and the actual preview invoice stub driving the real encoder/decoder; design check (30 canonical sources), safe-area, Babel parse (5 files) and production iOS bundle (46 assets) pass; both preview bundles compile and the production bundle contains no fixture references. The independent high-risk reviewer passed that candidate with no findings. [Local RX-1 QA](docs/rx1-qa-20260911/qa.local.md); [preview harness](docs/rx1-qa-20260911/index.js) | Superseded by the 2026-09-12 native-QA corrections below. RX-1.8–1.9 stay open. |
| 2026-09-12 | RX-1 native-QA corrections (third pass) | Uncommitted local delivery over `19a5ede5` on `codex/integrate-generic-request-upstream`; the parent commits after acceptance | Two production corrections taken from actual native screenshots: the absent-address row is now a wrapping body sentence with no copy affordance, while real addresses keep identifier typography and the copy control; and the payment-request flow reserves Android keyboard space (`KeyboardAvoidingView` `height` under the manifest's `adjustPan`) so the subject and slippage footers stay reachable, with iOS keeping `padding`. Fixture-only repairs: the preview store now processes `PUSH_MODAL`/`REMOVE_MODAL` through the production modal reducer and seeds `state.modal.stack`, so sheets no longer crash the native modal chain; the list loading scenario now uses the real pre-Card-directory loading contract instead of rendering an empty list; and two new scenarios mount the **real** `GiftCardFund` screen (fund and create modes) with an exact synthetic Card, a real funding coin/VRPC source address/ledger balance, and an origin-scoped inert service-storage stub that cannot read a password or keychain entry. 30 focused non-Jest checks pass, including three new guards each verified to fail against the pre-fix code; design check (30 canonical sources), safe-area checks (3 changed, 8 Transfer), Babel parse (10 files), preview iOS/Android bundles and the production iOS bundle (46 assets, 0 fixture references) pass. [Local RX-1 QA](docs/rx1-qa-20260911/qa.local.md) | RX-1.8–1.9 remain open. Native proof is partial: the parent captured iOS normal and iPhone SE compact surfaces plus Android amount/subject/settings/result and decoded each result QR (one QR per result, 158 characters), but the sheet scenarios and the canonical Gift Card comparison have not been captured on a device yet, and no independent review verdict exists for this corrected candidate. Next: parent re-captures the corrected matrix, compares against the real Gift Card screen, then runs the same report-only reviews and commits. |
| 2026-09-12 | RX-1 native amount keypad (fourth pass) | Uncommitted local delivery over `19a5ede5` on `codex/integrate-generic-request-upstream`; the parent commits after acceptance | User-requested amount change: the custom on-screen `NumericKeypad` is removed from `ReceivePaymentRequestFlow` and replaced by the shared editable `AppTextInput` with `keyboardType="decimal-pad"`/`inputMode="decimal"`, the same native input and keyboard mechanism as the slippage field and canonical `GiftCardFund`. The amount autofocuses on entry and on return, keeps the currency beside the field, the fiat estimate and the fiat/coin switch, and adds `maxLength` plus a plain-decimal guard (`isPlainAmountInput`/`getAmountInputError`) so a pasted `1e5`/`0x10` cannot validate. Amount, currency, switch, estimate, validation and step semantics are unchanged, as are single-flight generation, save binding, cancel and back handling. 32 focused non-Jest checks pass (two new: the plain-decimal guard and the native field shape/paste guard); design check (30 canonical sources), safe-area check (2 changed files), Babel parse (2 files), preview iOS (25 assets) and Android (27 assets) bundles and the production iOS bundle (46 assets, 0 fixture references) pass. [Local RX-1 QA](docs/rx1-qa-20260911/qa.local.md) | RX-1.8–1.9 remain open. Parent still owns the final native amount captures (iOS normal/SE-compact, Android normal, light/dark), the sheet/canonical comparisons, the independent high-risk and design reviews, and the commit. No native evidence was captured in this pass. |
| 2026-09-11 | SH-1 shared selection and information sheets | Local delivery over `51672964` on `codex/integrate-generic-request-upstream`; exact commit in the local QA report | Nine migrated sheets; canonical identity/Card/request-details regression evidence. 133 native gallery entries plus seven before captures cover iOS/Android, light/dark, normal/compact and focused loading/error/keyboard/overflow states. Design, safe-area, parser, focused dismissal/selection checks and production iOS bundle pass. Independent design and behavior reviews are ready, with unchanged repository guards. [Screenshot gallery](docs/sh1-qa-20260911/index.html); [QA report](docs/sh1-qa-20260911/qa.local.md) | SH-1 complete. Screenshots use actual components with synthetic Testnet data. Authenticated wallet journeys and full VoiceOver/TalkBack traversal remain with the owning TX-1/RX-1/ID-1 and QA-1 tasks. Next scoped implementation: remaining TX-1 work when authorized. |
| 2026-09-10 | GR-1 Android QA and layout corrections | Task-owned candidate over `4decf026` | Android native build/entry and 41 fixture screenshots recorded. Corrected tall details-sheet overflow and kept signing errors beside the action. Native iOS/Android light/dark, normal/compact layout and consent/failure checks pass; design, safe-area, parser and iOS bundle checks pass. [Android QA](docs/gr12-android-qa-20260910/qa.local.md); [correction evidence](docs/gr12-ui-fix-20260910/qa.local.md) | Authenticated wallet signing/callbacks and remaining accessibility evidence remain open. The original overflow reproduced on Android; the normal iOS baseline already fit. |
| 2026-09-10 | GR-1 / GR-2 local implementation | Task-owned candidate over `75592c0f` on `codex/integrate-generic-request-upstream` | Shared themed credential/Data Packet review; explicit consent; cached completion retry; authoritative session/lifecycle/expiry guards before signing. Design/safe-area/parser/iOS bundle, focused non-Jest state/delivery checks, and harness contract checks pass. iOS fixture render/interaction evidence and independent review records: [local QA report](gr12-qa.local.md) | GR-1.9–1.10 and GR-2.6 remain open for authenticated native callbacks/mixed-order walkthrough, Android, and remaining accessibility evidence. No mainnet wallet accessed. |
| 2026-09-10 | Initial analysis | `fecfbce4` | Source/routing review; design check passed for 27 canonical sources; no authenticated visual walkthrough | Plan created; implementation tasks remain unchecked |

| 2026-10-17 | I-21, A-29/I-30, A-28 history tap/detail | `claude/fix-history-tap-detail` from `5cbbac30`; `SignedInActionBar.js`, `TxDetailsModal.js` | Native `View` with `pointerEvents="none"` wraps the edge-fade SVG, using the existing `ScrollEdgeFade` pattern. Source layout places the invisible 32-point top fade over the first 60-point row. Installed iOS SVG hit testing lacks the native View pointer-events guard; Android checks it before SVG traversal. Conversion Type bypasses title-case transformation only for conversions. Dark header uses sheet/border/text roles, and Details uses readable enabled/disabled text; light colors and explorer availability stay unchanged. Temporary non-Jest source/component checks: 16 baseline failures, 34/34 candidate passes. Babel parse (three JS files, including the reverted preliminary zIndex change), design (30 sources), and whitespace checks pass. [Layout trace and evidence limits](history-tap-detail-qa.local.md). | High-confidence source diagnosis, not native proof. Supplied screenshots inspected read-only. Orchestrator owns new iOS/Android light/dark normal/compact touch and visual QA. No Metro, reload, device, simulator, emulator, merge, or push actions. Broader TX-1 and QA-1 stay open. |
| 2026-10-17 | TX-1 context band: Amount/Recipient route reminder | `claude/wizard-context-band` from `4da25b17`; new `WizardContextBand.js`, `getWizardContextSummary` in `wizardUtils.js`, `context` slot in `SendWizardHeader.js`, `SendWizardNavigator.js`, `labelSm` in `tokens.js`; old `contextLine` removed from `SendWizardAmount.js` | Contract: reuse `SendWizardHeader`, `AssetCoinLogo`, theme roles and `surfaceMuted`; no card, no eyebrow. Owner chose option C from the HTML review (2026-10-17) and approved the rules: show on Amount and Recipient, not on Confirm or Success (they already show source, target and Destination network); chain only when it is not the coin's own chain; Send to another chain shows the coin alone on Amount (the Network row names the chain) and adds the chain on Recipient. Model check (temporary Node script, Babel with repo config, stubbed CoinDirectory): 13 cases pass for convert same/other chain on both steps, send same/other chain on both steps, no Network row, `[ERC20]` removal, badge rule, missing route. Babel parse (6 files), `check:design` (30 sources), `check:safe-areas --changed`, and `git diff --check` pass. Rendered on iOS 26.5 simulator (Verus GR3 QA, 402x874pt, Testnet profile, PTest iOS wallet): Convert VRSCTEST to GOLD on Amount (keyboard open, estimate loaded) and Recipient; Convert to DAI on Ethereum on Amount in light and dark; Send on Amount with the Network row for Verus Testnet and for Ethereum. A temporary 140-point squeeze (reverted) showed the chain name shortening to "E…" while asset names stayed whole. The accessibility tree exposes one text element, "Send VRSCTEST", after the header. | Not verified: iPhone SE 375pt and Android 360dp (SE simulator has no unlockable wallet; the Android emulator has no testnet wallet), large Dynamic Type (no change seen when set, inconclusive), Send to another chain on Recipient (the Ethereum fee exceeds the 14.18 VRSCTEST balance), light/dark on Recipient, long names on device. Observed: on Amount for a same-chain Send the band repeats the coin named in the Available line; owner decided to keep the band there (2026-10-18). Committed on the task branch. TX-1.8/TX-1.9 remain open. |
| 2026-10-18 | Integration: context band and private-testnet follow-ups into `redesign` | `redesign` `9249b82b4` (merge of `claude/private-testnet-followups` `ca7f8208`, which merged `claude/wizard-context-band` `83933b6f`) | Owner kept the band, including the coin-only band on Amount for a same-chain Send. `check:design` (30 sources) and safe-areas pass on `redesign`. Rendered on iOS 26.5 simulator (Verus GR3 QA, 402x874pt, Testnet profile, private chain, PTest iOS wallet, Metro serving the `redesign` checkout), from the app: Convert VRSCTEST to GOLD 0.05 (route VRSC-KMD-GOLD), Send GOLD 0.01 to self, Convert GOLD to VRSCTEST 0.02 (route VRSC-GOLD), Send VRSCTEST 0.01 to a saved address. The band shows on Amount and Recipient, and not on Confirm or Success. `getrawtransaction` on ptestapi shows all four mined (blocks 35763, 35772, 35772, 35777). Balances in the app match the Confirm previews and chain results (final 14.14044575 VRSCTEST, 0.12996854 GOLD); history lists the conversions, the sends and the conversion proceeds. Dark mode checked on Amount and Recipient (Send VRSCTEST). | Not verified: iPhone SE 375pt, Android 360dp, Send to another chain on Recipient (the Ethereum fee exceeds the balance), long names on device, large Dynamic Type. The app process died once during an agent-device tap on the wallet home (known XCUITest limit there); a relaunch and login restored it. TX-1.CONTEXT-BAND-QA stays open. Pushed to `origin/redesign` (2026-10-18, `593795eb`). |
| 2026-10-18 | TX-1 history: label conversion proceeds | `claude/conversion-proceeds-label` from `593795eb`; `updates.js` (`readImport`, `resolveCurrencyName`, `conversionProceeds`), `standardizeTxObj.js`, `Overview.js`, `TxDetailsModal.js` | Finding: the proceeds of a conversion are paid in a later block by a chain-made import transaction. The address-delta response gives a received output no marker at any verbosity ptestapi accepts (`sent.outputs` exists only on spends), so the transaction itself must be read. Chain data (private chain, `getrawtransaction`): both proceeds transactions (`66f46faf4f5d` block 35765, `5e06971b3fc7` block 35774) have a `crosschainimport` output at index 0 with `sourcesystemid` equal to the wallet's own system; the import's `valuein` lists the source currency and, when the fee uses the received currency, that currency as well. Rule: a received (non-spend) transaction with an import from the wallet's own system is conversion proceeds; the source is the single `valuein` currency other than the received one, else the label is "Conversion proceeds". Imports from another system are not labeled (a bridge arrival has the same shape and the transfer's convert flag is not in the import). Reads are cached by txid and capped at 25 new transactions per update (history refresh runs every 60 s on the Overview). Real `updateVrpcTransactions` run in Node against ptestapi (network wrappers only replaced): VRSCTEST 3 proceeds rows and GOLD 2, each pair matching its sent conversion (USD to VRSCTEST at 33562, VRSC-USD to VRSCTEST at 33572, GOLD to VRSCTEST at 35774, VRSCTEST to GOLD at 34183 and 35765); 0 of 17 plain receipts labeled; a second pass re-reads no receipt already read. Rendered on iOS 26.5 simulator (Testnet profile, private chain, PTest iOS wallet): Verus Testnet history shows "Converted from GOLD" (+0.01998497), the +2000 funding row still reads "My transparent address", the sent row still reads "Convert to VRSCTEST"; the transaction sheet shows Type "Conversion from GOLD" with TxID `5e06971b3fc7…`; GOLD history shows "Converted from VRSCTEST" twice and "Convert to VRSCTEST". Babel parse (4 files), `check:design` (30 sources), `git diff --check` pass. | Not verified: Android; dark mode on the changed rows; cross-system conversions (not labeled by design); a wallet with more than 25 unread receipts on a real device (checked by the capped Node run only); a failed read for 25 or more transactions in a row would hide older rows from lookup until they succeed. No Jest test added (project rule). |
| 2026-10-18 | TX-1 UX round 2: network groups, Amount "say it in money", Recipient rows, Confirm/Sent spine | `claude/send-convert-ux-round-2` from `redesign` `4462c81f`; commits `7249d53f`, `49f7fcbe`, `149814f0`, `6ebb54c0`. New `priceImpact.js`, `usePriceImpact.js`, `useWizardFiat.js`, `components/{AmountEstimate,ImpactRow,ConfirmFacts,TransferSummary,TransferDetailsSheet,impactFormat}.js`; changed `SelectionSheets.js`, `SendWizardAmount/Recipient/Confirm/Success.js`, `SendWizardContext.js`, `WizardUI.js` (`FlatRow`), `wizardUtils.js`, `StatusBadge.js` (danger tone), `DESIGN.md` | Contract: the owner chose network option 1 (groups), Amount option C, Recipient option A, Confirm and Sent option B from the 2026-10-18 HTML mockups. Impact = shortfall against the output per unit of a small sample trade (about one display-currency unit) on the same route, fetched once per route; tiers 0.1/1/5%; the suggestion is verified by a real quote. Checks: Babel parse and an ESLint subset (`no-undef`, `no-unused-vars`, rules-of-hooks) on all changed files, `check:design` (30), `check:safe-areas`, `check:send-wizard-options`, diff whitespace, Metro bundle. Worked example (CPMM, depth 8,000, spot 1.84): 25/250/1,000 give 0.31/3.03/11.11%, suggestion 240 measures 2.9%. Rendered on iOS 26.5 simulator (Verus GR3 QA, 402x874pt, private chain, PTest iOS) by Sonnet 5.5 testers in four passes: run 1 on `7249d53f` 15 PASS, 0 FAIL, 1 BLOCKED (fiat mode); the retest on `49f7fcbe` fixed D1 (suggestion label cut), D2 (keypad after the network sheet; `useFocusEffect` now focuses the field), D6/D7/D10/D11 (copy, notice contrast, money decimals); two more passes on `149814f0` and `6ebb54c0` fixed D3 (recipient name in the receive node: name over "receives", shortened once). Three small private-testnet transactions were sent through Hold to confirm and confirmed on the chain (conversions of 0.05 VRSCTEST to USD and to Bridge.vETH, one 0.01 send). Evidence: `docs/qa/send-convert-ux-round-2/` (`ios`, `ios-retest`, `ios-retest2`, `ios-retest3`, `report.local.html`) | Not verified: iPhone SE and 360dp, fiat mode and fiat captions (no VRSCTEST price on the private chain), exact 0.1/1/5% boundaries, Destination network for a cross-chain conversion, the multi-address Send to self sheet, Bridge transaction sent, long VerusID names, large text. Pre-existing and left alone: "Bridge" ticker shortening in some rows, stale Recipient text after a network change, two taps in the Convert to list while the search keyboard is open, VRSCTEST logo edge in dark mode. Round 3 (2026-10-19, commits `952b7909`, `bb9beb03`, `38ca9b45`, `968ab9e9`): the Via row and the price-impact wording; iOS and Android (fresh disposable "PTest Android" wallet on Pixel_8_API_35, funded with 700 VRSCTEST from "PTest iOS"; one 700 VRSCTEST funding send and two conversions of 0.05 VRSCTEST on the private chain, all confirmed). iOS: 8 PASS, 1 FAIL in the first pass, all PASS after the fixes. Android: 16 PASS, 2 FAIL in the first pass, all PASS after the fixes. Found and fixed: Confirm lost its Price impact row when the already selected basket was picked again (`setRoute` cleared `marketPrice`; now kept for the same route key and re-asserted by `usePriceImpact`); the high-impact block clipped the suggestion row (money line two lines at most, tighter rows); the Android keyboard did not return after a sheet closed (a focus toggle at 0.9 s closed a showing keyboard; `Keyboard.isVisible()` is unreliable because the window pans; final fix toggles focus only after the Via or Network sheet closes and once when Amount opens right after the Convert to network sheet; 5 paths x 2 runs on Android). The Android app had loaded old code from the other dev server until `debug_http_host` was set; that preference was removed again. Evidence: `docs/qa/send-convert-ux-round-2/` (`ios-r3`, `ios-r3b`, `ios-r3c`, `android-r3` to `android-r3d`, `report.local.html`). Merged into `redesign` with `--no-ff` (`38bffae1`) and pushed. Not verified: iPhone SE and 360dp (run later the same day, see the next row), fiat money text, Send to another chain on Confirm, long VerusID names, large text. TX-1.UX2-QA stays open. |
| 2026-10-19 | TX-1 small-device run and pinned Amount estimate | `claude/send-convert-pin-estimate` from `redesign` `38bffae1`; `WizardUI.js` (`pinned` slot in `WizardFormLayout`), `AmountEstimate.js` (pinned block, compact variant, exported `RouteRow`), `SendWizardAmount.js`, `DESIGN.md` | Run first: Sonnet 5.5 testers (medium effort) ran SM-0 to SM-10 on `38bffae1` on the iPhone SE simulator (375x667 pt, "Verus GR3 Compact") and the Android AVD `Small_360x640` (720x1280 at 320 dpi); all passed, one real 0.05 VRSCTEST to GOLD conversion on each (SE tx `6a9bcbe9`, 5 confirmations; Android 360 tx confirmed later in the wallet history). Main finding: with the keypad open the receive row, money line, badge, suggestion and Via row sat below the fold and needed a scroll (SE: 80 to 110 pt scroll area; 360dp: 163 dp for scroll area plus footer). Contract: the owner chose "pin it". The estimate now sits above Continue in a `pinned` slot of the footer, outside the scroll area, on every screen size. On a window of 667 pt or less (`useOnboardingSmallDeviceLayout`): less top spacing above the amount and chip, no unit price line, the impact badge beside "You receive" (logo omitted) so the money line stays on one line, and the Via row in the scroll content while a warning shows. The receive amount shrinks to 80% instead of wrapping. Checks: `check:design`, `check:safe-areas`, Metro bundle on both devices. Rendered (light; dark on SE and 360dp): iPhone SE, Android 360x640, iPhone 17 Pro (402x874 pt): DAI 200 (8.3% warning with suggestion), DAI 68 (3.0%), GOLD 0.05 (Via, Best price), DAI to Ethereum (network fee row), empty field (Market price), invalid amount, tap on the suggestion keeps the keypad, Back from Recipient. Android "0 after backspace" report: reproduced as a caret artifact (text "10", caret one step left, backspace leaves a real "0", "5" then gives "50"), not a product defect; plain backspace to empty and typing again is correct. Evidence: `docs/qa/send-convert-ux-round-2/` (`ios-se`, `android-360`, `pin`). | Not verified: fiat money text, large text, Confirm and Sent after the change (not touched), 360dp light and dark for every state. Left open from the small-device run: Confirm notice under the Hold button and Sent "Transaction ID" under Done on 360dp; MAX pill and "Available" row clipped by an error card on SE; Confirm connector wraps inside "VRSC-KMD-GOLD"; "Bridge" shown for Bridge.vETH; unit chip is dead without a fiat price; the chip and "Available / MAX" can be partly under the pinned block on short screens (reachable by scroll). TX-1.UX2-QA stays open. |
| 2026-10-19 | TX-1 polish round 3: Bridge.vETH name, Sent without stepper, Confirm loading and notices, fee sheet | `claude/send-convert-polish-3` from `redesign` `1c53d32c`; `wizardUtils.js` (`getCurrencyDisplay` fallback), `SendWizardHeader.js` (`showProgress`), `SendWizardNavigator.js`, `FeeBreakdownSheet.js`, `SendWizardConfirm.js`, `SendWizardSuccess.js`, `SendWizardAmount.js`, `WizardUI.js` (`above` slot of `WizardFooter`), `TransferSummary.js` (`loading`, connector lines), new `ConfirmPreparing.js`, `DESIGN.md` | Contract: owner feedback of 2026-10-19. (1) A Bridge keeps its full name: the fallback of `getCurrencyDisplay` cut "Bridge.vETH" at the first dot when the currency was not yet in the coin directory; now "Bridge" keeps its full name. Rendered in the network sheet, context band, receive row, Confirm and Sent. The owner wrote "Bridge.bETH"; the chain name is "Bridge.vETH" and the app uses that. (2) Sent has no progress bar. (3) The fee sheet subtitle is gone. (4) Confirm while preparing draws the review as it will look: real pay node, recipient and "To"; skeleton receive amount, connector, price impact, fees, arrives; button "Preparing…" (disabled). The old centred skeleton and its two lines of text are removed. (5) Confirm warnings and errors sit above Hold (`above` slot); the fact list uses `FadedScrollView`. (6) Sent on a window of 667 pt or less: less top spacing, 48 pt check, 24 pt footer spacing, so the Transaction ID shows above Done on 360dp. (7) The unit chip shows only when the paid asset has a fiat price. (8) The Confirm connector draws the unit price and the route on two lines, so "VRSC-KMD-GOLD" no longer breaks. Checks: `check:design`, `check:safe-areas`, `check:send-wizard-options`, Metro bundle on all three devices. Rendered and exercised (light; dark for the loading state): iPhone SE, Android 360x640 and iPhone 17 Pro, each with a real 0.05 VRSCTEST to GOLD conversion through Hold to confirm to Sent (SE also a 1 VRSCTEST to Bridge.vETH conversion; the wallet then listed 172.9318 Bridge.vETH under its full name); Android tx `1147ebae…` seen with `convert: true` in the mempool. Evidence: `docs/qa/send-convert-ux-round-2/polish3/`. | Not verified: dark mode of every Confirm and Sent state, Confirm preparing on the slowest networks (a real preflight took under 5 s here), large text, fiat money text. Decision left for the owner: wait on the Recipient button instead of a Confirm skeleton (see the reply). TX-1.UX2-QA stays open. |
| 2026-10-19 | TX-1 declutter Confirm and Sent (owner feedback, second pass) | `claude/send-convert-declutter` from `redesign` `cfd125a6`; `SendWizardConfirm.js`, `SendWizardSuccess.js`, `SendWizardNavigator.js` (`headerShown: false` on Sent), `ConfirmFacts.js`, `ConfirmPreparing.js`, `TransferSummary.js`, `SendWizardHeader.js`, `wizardUtils.js`, `DESIGN.md`; deleted `TransferDetailsSheet.js` | Contract: owner feedback of 2026-10-19. The recipient shows once on Confirm, in full, in the "To" row; the pay and receive nodes carry only "You pay" and "You receive" and the amounts. "More details" and its sheet are gone (they repeated "To" and "From"). The preflight notice "This conversion involves a centrally controlled currency" is not shown any more (the notices for a missing estimate and for a lower latest estimate stay). Sent has no header at all (no close button, no divider, no progress bar), no "To" row and no "Arrives" row; Done leaves. A long amount uses a 17 pt font so the label and the ticker never clip on 360 dp; the amount and ticker are separate texts. Checks: `check:design`, `check:safe-areas`, `check:send-wizard-options`, Metro bundle on the iPhone SE simulator and the Android 360x640 emulator. Exercised with real 0.05 and 0.058 VRSCTEST to GOLD conversions through Hold to confirm to Sent on both devices (SE tx `4b055d29…`, Android tx `042004ea…`); DAI 200 Confirm on the SE without sending. Evidence: `docs/qa/send-convert-ux-round-2/declutter/`. | Not verified: iPhone 17 Pro for this pass, dark mode of Confirm and Sent, cross-chain Confirm, VerusID recipients. The Amount-step variations are mockups only (`TX-1.AMOUNT-DECLUTTER`). TX-1.UX2-QA stays open. |
| 2026-10-19 | TX-1 Amount declutter: receive line and Price and route chip | `claude/send-convert-price-route-chip` from `redesign` `f46049f5`; `SendWizardAmount.js`, `AmountEstimate.js`, new `PriceRouteSheet.js`, `SelectionSheets.js`, `DESIGN.md` | Contract: owner chose A2. Amount pins one receive line and one tappable percent chip when impact is at least 0.1%, more than one basket exists, or an Ethereum export fee is relevant. Empty/invalid amounts pin nothing; loading uses one skeleton line. The chip replaces the logo, uses neutral/warning/danger at 0.1/1/5%, and opens Price and route. `InfoSheet` supplies the 78% shell, one `SheetScrollView` with the established measured fade/chevron cue, and fixed 56-point secondary Done. Price, sorted basket choices or single Via, Ethereum fee loading/value/unavailable, and the unfilled suggestion action share that scroll body. Route and suggestion callbacks run after closing through `useSheetDismissal`; route side effects, Android refocus, form errors, Continue gating, fiat loss text, and fee quote/MAX logic stay in place. The old Amount Via row, compact badge/logo split, and RouteSheet are removed. Checks: `check:design` (30 canonical sources), `check:safe-areas --changed` (4 files), `check:send-wizard-options`, `git diff --check`, and the complete dev iOS JS bundle pass (49 assets; environment color warnings only). Temporary non-Jest Node fixtures pass 48 cases: thresholds, light/dark props, one-line skeleton, money/fiat/unknown-price data, route and suggestion post-close actions, rapid reopen, fee states, and the overflow cue with 24 baskets. Focused scope/hooks check: three component files pass; Amount reports the same five existing hook diagnostics as the baseline, with unchanged hook order by source inspection. | Device QA (orchestrator, 2026-10-19): two Sonnet 5.5 testers ran `docs/qa/send-convert-ux-round-2/checklist-chip.local.md` on the iPhone SE simulator (375x667 pt), the iPhone 17 Pro simulator (402x874 pt) and the Android `Small_360x640` emulator (360x640 dp), light and dark, evidence in `chip-ios/` and `chip-android/`. All checks CH-0 to CH-15 pass except one defect found on Android and fixed in `0ad7ba3e` (retested on all three devices: pass): with a long ticker (Bridge.vETH) and the chip showing, the receive amount was missing; the amount now keeps its width and the chip wraps under "You receive". Also fixed: the pinned loading skeleton is one row; basket rows in the sheet read their badge in the accessibility label. Real transactions: 0.05 VRSCTEST to GOLD with the non-best basket VRSC-GOLD picked by hand (iOS `fb7ec014…`, Android `583bd6b2…`, both `via` `iECDGNNu…` = VRSC-GOLD on the chain) and one with the default basket (`f0fae884…`, `via` `iMZHZto3…` = VRSC-KMD-GOLD). A temporary local patch with ten baskets showed the sheet scrolling, the fade and chevron cue while rows remain below, no cue at the end, and Done always visible (light and dark, all three devices); the patch was reverted. Confirm keeps its "Arrives" row (owner decision). | Not verified: the sheet's fee skeleton (the quote was cached), the "Details" chip (the private chain always has a market price), VoiceOver speech, large text, fiat money text. Known and left: the suggestion row appears only from 5% impact (existing rule in `usePriceImpact.js`); the SE sheet opens with the basket rows below the fold (the cue shows); with an Ethereum fee error banner on SE the "Available / MAX" row is half cut (existing); the pinned row grows about 12 pt when the chip wraps; an intermittent Android keypad/resize race after a sheet closes (3 of about 20 closes; the keypad is up but the window does not resize; hiding and re-focusing fixes it). TX-1.UX2-QA stays open. |
| 2026-10-19 | TX-1 small buttons, neutral voice, Android keyboard avoidance | `claude/small-device-buttons-keyboard` from `redesign` `f31ab023`; shared buttons and height hook, NFC action reserve, Unlock loading reserve, `WizardUI`, new `AndroidKeyboardAvoidingForm`, Price and route, `DESIGN.md` | Contract: preserve canonical `AppButton`, `GradientButton`, `WizardFooter`, `SafeBottomActionStack`, typography, header, and Sent composition. Primary/secondary explicit and default heights resolve centrally to 44 on small windows; text/tonal stay unchanged. Paper Button does not forward hitSlop to its touchable, so compact actions use a Paper ripple wrapper with 2-point vertical hitSlop. Footer top padding changes 16 to 8, bottom spacing unchanged. Installed RN is 0.77.3: a source-executed fixture reproduces zero overlap after hide resets bottom while the frame is still contracted; a later restored layout can repair it, so persistence of the observed native fault is not proved. Android now measures only a full-height outer onLayout frame and applies overlap to an inner view, retaining the same header offset. Keyboard events update synchronously, last event wins; no delayed native reads or resync timer. Amount's Android refocus stays intact. Temporary non-Jest component checks pass 80 size cases, hitSlop/press/disabled checks, 20 batched hide/show cycles, event ordering, layout/header changes, open-keyboard Recipient mount, cleanup, and iOS padding/footer structure. Required design, safe-area, option-matrix, whitespace and complete Android development bundle checks pass. Button and string inventories are in `button-audit.local.md`. | Source/component fixtures and bundle only. No simulator, emulator, Metro server, push, or merge. Testers own rendered/device proof. Frees 20 dp (12 button + 8 footer). Worked 360x640 example: header origin 142, keyboard top 360, wrapped pin about 62, footer 60 leave about 96 dp for content; Available/MAX ends about 123 dp with the fiat unit chip, leaving about 27 dp short. Without that chip it ends about 91 dp. Network/error rows add height. These are source estimates, not device measurements. TX-1.SMALL-BUTTONS-KEYBOARD-QA stays open. |
| 2026-10-19 | TX-1.PRICE-ROUTE-DENSE: variation A and suggestions from 1% impact | `claude/price-route-sheet-dense`, based on `claude/small-device-buttons-keyboard`; `PriceRouteSheet.js`, compact `SelectionRow`, shared information-sheet styles, typography roles, `SheetScrollView` frame sizing, `usePriceImpact.js`, `DESIGN.md`, `TYPOGRAPHY.md` | Contract: owner-approved A. Basket choices come first with no sentence or section titles. Rows use the approved 48/40/52-point deviations. Only the basket list scrolls; the shared measured cue stays in it. Facts, the suggestion, and secondary Done stay fixed. Done follows the shared 44/56-point rule. Route and suggestion choices retain `useSheetDismissal` and all Amount callbacks. WARNING suggestions start from 1% impact and aim to halve it; DANGER keeps the 3% target. Both retain the 300 ms debounce, real candidate quote, measured percent, lower-impact gate, and stale-response cleanup. Checks passed: `corepack pnpm check:design` (30 sources), `corepack pnpm check:safe-areas --changed` (8 files), `corepack pnpm check:send-wizard-options`, `git diff --check`, Babel parse (9 changed/new JS files), and the complete Android development JS bundle (55 assets; environment color warnings only). Temporary non-Jest Node fixtures verify warning arithmetic (100 at 4.3% gives 48; 50 at 1.2% gives 24), 1/5% boundaries, measured lower/equal/higher/unavailable results, debounce replacement and cleanup, post-close callback order, and unchanged default selection/information styles in both themes. Source height sums: SE two baskets 350.5 versus 351 pt; DAI 200 334 versus 334; Ethereum 20 322 versus 322; 17 Pro two baskets 362.5 versus 363. Ten SE baskets use a 269.5-point viewport for 516 points of list content within a 520-point shell. These are source calculations, not device measurements. Bundle outputs and temporary fixtures removed. | Not verified: native layout, light/dark rendering, many-basket scrolling and cue, text scaling, live RPC suggestions, Android sheet-close/refocus. No simulator, emulator, dev server, push, or merge. Device QA pending (orchestrator) |
| 2026-10-19 | TX-1 history: remove conversion labels, neutral row | `claude/neutral-history-list` from `4462c81f`; `updates.js`, `standardizeTxObj.js`, `Overview.js`, `TxDetailsModal.js`, `DESIGN.md` | Owner decision: drop conversion recognition ("Convert to X", "Converted from X") and adopt option A of the history mockup. Removed: the per-receipt import reads, the per-spend reserve-transfer reads, the currency-name lookups, the `conversion` and `conversionProceeds` fields, the two subtitle overrides in `Overview.js`, and the sheet Type wording. Kept from `b3a1deb5`: grouping by txid, pending and mempool timestamps, the `keyExtractor`, and the `sent.outputs` guard. The history update now makes no per-transaction reads. Row: a 32-point `surfaceMuted` circle with a 16-point `textSecondary` arrow (down incoming, up outgoing); green only on an incoming amount; Pending uses the warning `StatusBadge` in place of the date; layout, chevron and skeleton unchanged. Rendered on iOS 26.5 simulator (Testnet profile, private chain, PTest iOS wallet, Metro serving this checkout): light, plain sends, and the received +0.01998497 row (the former "Converted from GOLD") now reads "My transparent address" with a gray arrow and a green amount; a real send of 0.0001 VRSCTEST showed the Pending badge on the top row; dark, the same pending row and the received row; the transaction sheet shows Type "Incoming" for the former proceeds row. Babel parse (4 files) and `check:design` (30 sources) pass. | Not verified: Android; iPhone SE 375pt and 360dp (row metrics are unchanged; only the date line can now be a badge); a pending row in a confirmed-then-pending sequence beyond the one send observed; ESLint cannot load in this repo (existing failure). No Jest test added (project rule). Not pushed. |
| 2026-10-20 | TX-1.PRICE-ROUTE-DENSE and TX-1.SMALL-BUTTONS-KEYBOARD device QA; Android keyboard container fix | `claude/price-route-sheet-dense` `62f958af` (contains `claude/small-device-buttons-keyboard`); `AndroidKeyboardAvoidingForm.js`, `MainActivity.java` | iOS (iPhone SE and iPhone 17 Pro simulators, VRSCTEST, branch bundle on port 8082): sheet A checks SA-0 to SA-12 and the small-device button checks pass (local evidence in `docs/qa/send-convert-ux-round-2/sheeta-ios`, `small3-ios`). Android (AVD `Small_360x640`, 720x1280 at 320 dpi): the hardening commit `faf564ce` failed 40 of 40 loop cycles, with Continue behind the keypad. Cause, read from logcat of the container: `Keyboard.metrics()` returns null on Android in this app, so the timed re-read cleared the stored keyboard frame 60 ms after every event, the padding fell to 0, and Continue stayed behind the keypad. The same clear ran in `af4e2c17` whenever the header offset changed after the keyboard showed (80 to 142 in the logs). That is the probable cause of the earlier 4 failures in 54 closes; this link is inferred, not proved. Fix `62f958af`: the container keeps only the frames from `keyboardDidShow` events, a module-level copy serves a form that mounts while the keyboard is open, the header offset is read through a ref, and no timer re-reads remain. `MainActivity` again leaves the first show to React Native and re-sends only when the IME inset changes while it stays visible (the second event, 275 dp then 231 dp 39 ms later, is visible in the logs). After the fix, measured from screenshots on Android 360x640: Continue at 666 to 754 px directly above the keypad in 25 of 25 close-and-reopen cycles (10 of them with six CPU-burning host processes, load average 16), 18 of 18 sheet closes (second basket, best basket, Done), 3 of 3 Amount-to-Recipient round trips and every first Amount entry after login (3 fresh logins); with the text keyboard on Recipient, Continue sits at 578 to 666 px above it. Sheet on Android 360: GOLD 0.05 with two baskets (basket rows first, three fact rows, Done 88 px = 44 dp); DAI 200 sheet 334 dp with the red Difference, Route Bridge.vETH and "Use 68 VRSCTEST instead 3.0% less", which applies 68 and shows the amber 3.0% chip with the keypad back; DAI 100 (4.3%) suggests 48 at 2.1% less; DAI 35 (1.5%) suggests 17 at 0.7% less; DAI 20 (0.8%) shows no suggestion; ten baskets (temporary patch, reverted): only the list scrolls, the fade and chevron show then disappear at the end, facts and Done stay fixed, dragging on the facts moves nothing; dark mode checked. Checks: `check:design` (30 sources), `check:safe-areas --changed`, Babel parse. Process note: the first Android tester left a detached Python loop running after its agent was stopped (found and killed); testers must use bounded loops with an early stop. | Not re-run on Android after the fix: Ethereum network sheet (Network fee row), Confirm/Sent regression (Arrives row, Sent without header), hold-to-confirm (no transaction sent this round), cold starts, address-book Add sheet cycles, Change password with the keyboard. Open: the label "Res..." in Change password on Android, "Lock wallet" stays 56 pt on the SE, five "We could not..." strings in `ReceivePaymentRequestFlow.js` and GenericRequest screens. No real transaction in this round. |
| 2026-10-20 | TX-1 copy: impersonal failure messages and a wider primary button in the Settings footer | `claude/neutral-copy-labels` from `redesign` `a08f6755`; `ReceivePaymentRequestFlow.js`, `GenericRequestHome.js`, `ConfirmPayStep.js`, `SettingsScaffold.js` | Owner request, 2026-10-20 ("fix the label strings", no test run). Five "We could not..." messages now follow the DESIGN.md Voice rule: "The payment request could not be created", "The share sheet could not be opened", "The QR image could not be saved", and "The response could not be sent to ..." (two places). "Reset password" cut off to "Res..." in the Change password footer: the first cause (the compact-button wrapper) went away in `9bee3cbd` and read in full on iPhone SE. Measured from Inter SemiBold 17 px: the label is 127.2 dp and a half-width button on a 360 dp window leaves 129 dp (Paper text-mode margin 12 dp each side), so it fits by about 2 dp and Android can still cut it. `SettingsActionFooter` now gives the primary button `flex: 1.6` against 1 for the secondary (360 dp: about 118 dp secondary, 188 dp primary; "Cancel" needs 79 dp). `check:design` (30 sources), `check:safe-areas --changed` and Babel parse pass. Not rendered on a device in this round. | Look at Change password, Delete wallet, Coin settings and Display seed footers on Android 360 dp and iPhone SE when the next device pass runs. "Lock wallet" stays 56 pt on the SE. |
| 2026-10-23 | RG-1 say each fact once: shared result, check, copy | `claude/result-guard` from `redesign` `d04ab115`, merged with `redesign` `58e29f07`; new `src/components/TransactionResult.js`, `SendWizardSuccess.js`, `GiftCardFund.js`, `scripts/check-design-contract.js`, `HighRiskStep.js`, `ConfirmPayStep.js`, `GenericRequestHome.js`, `DeepLink.js`, `DESIGN.md` | iOS sims (iPhone SE 18.6, iPhone 17 Pro 26.5), disposable VRSCTEST wallet: real Send result before/after pixel-identical in light and dark; pre-conversion Sent (SUPERVRSC) identical through a temporary reverted QA patch, because testnet rejects the broadcast; real gift card funding result in light and dark at both sizes; signature-threshold step and failure result via temporary fixtures. `check:design` flags only `SpendableKeyRequestInfo.js` (claim branch). Evidence in `docs/qa/result-guard/` (ignored) | RG-1.6 claim result move after the claim merge; RG-1.7 Android |
| 2026-10-23 | RG-1.6 claim result on `TransactionResult` | `claude/result-guard` with `redesign` `c04cc956` merged (claim animation, step titles); `TransactionResult.js` (description, itemized blocks, explorer row, caption list, warning, `above`), `SpendableKeyRequestInfo.js`, `spendableKeyRequestInfo.styles.js`, `DESIGN.md` | iPhone SE (iOS 18.6) and iPhone 17 Pro (iOS 26.5), new disposable VRSCTEST wallet "Guard RG" funded with 1 VRSCTEST from the local daemon: real gift card claims of 0.0499 VRSCTEST (Cancel gift card, Review redemption, Claim) on both sizes, light and dark. Compared with the approved claim screenshots (`docs/qa/claim-animation/12`-`15`): same rows and spacing; only the title size (Sent step 28/36) and the footer bottom spacing differ. Several transactions and partial failure through a temporary, reverted fake-result patch on both sizes, light and dark. Real Send result on SE pixel-identical to the phase-1 component and to `redesign` except the status-bar clock; real gift card funding on both sizes. `check:design` passes with no hits; safe-area, bundle, `git diff --check`, `genericResponseNetwork` and `genericRequestCompletionFlow` pass. Evidence (ignored): `docs/qa/result-guard/phase2/` | RG-1.7 Android; a real multi-chain or partial claim and a VerusID claim are not seen on a device |
| 2026-10-24 | Wallet setup: Face ID sheet without the privacy cover; coins land on moving rows | `claude/setup-landing` from `redesign` `250d242d`. Cause (phone run 2026-10-24): iOS keeps all Face ID wallet passwords in one keychain item, so adding a wallet reads it with Face ID when another Face ID wallet exists, and the app showed its privacy cover on every iOS "inactive". New `utils/keychain/biometricPrompt.js` (`withBiometricPrompt`, `isBiometricPromptOpen`); the four iOS biometric reads in `keychain.js` run through it; `VerusMobile.js` skips the cover while a prompt is open and covers on "background" (except with a send modal). `WalletSetupOverlay.js`: flight starts after two equal measurements 150 ms apart (first one 150 ms before the 1.1 s hold ends), rows measured every 100 ms in flight and the end point steered (160 ms), coin moves by a 0–1 progress times a movable end point; the landing worklet captures only the coin id (it captured the coin, whose presentation holds live `CoinDirectory` records, so in development Reanimated froze them: 104 "Tried to modify key" warnings per run). `WalletSetupLogoSlot.js` fades the row logo in (150 ms), then the coin fades. DESIGN.md "Wallet setup screen" | New simulator "Verus Landing QA" (iPhone 17 Pro, iOS 26.5), worktree Metro 8083; the setup screen was driven through the JS debugger with stand-in Home targets (no app code). Rows moved 40 pt at 250 ms into the flight: the follow-up measurement caught it and both coins stopped on the new centres (35, 222) and (35, 291) pt, path continuous, no stall. Rows still: (35, 182) and (35, 251) = target centres. Reanimated warnings 104 before the id fix, 0 after. App-state events sent through the debugger: prompt open + inactive → setup screen stays; no prompt + inactive → cover (old behaviour); prompt open + background → cover; active → cover gone. Babel parse (6 files), `check:design`, `check:safe-areas` (3 files), `git diff --check`; Jest keychain/biometric suites 6/6 (57 tests) pass. ESLint does not load (plugin `import` export error). | A real Face ID sheet (the simulator returned the protected item without one), a real Home landing and the logo fade on a real Home, the phone, Android, dark mode, iPhone SE. |
| 2026-10-26 | SV-1.LIST-ROWS: gift card list option C | `claude/gift-card-list` from `redesign` `e3d7b53b`; `GiftCardServiceOverview.js` (rows, Claimed group, skeleton), `DESIGN.md` | New task sims "Verus GiftList QA" (iPhone 17 Pro) and "Verus GiftList SE" (iPhone SE 3rd gen), iOS 26.5, slimmed with simslim (`--except photos`), Metro 8192. Disposable testnet wallet "GiftList QA" (key from the local VRSCTEST daemon). Seven real cards: one not funded, two Ready and one Shared (funded from the daemon), three claimed back to the wallet in the app. Checked: All, Ready and Claimed filters; Claimed title hidden in the Claimed filter; a claimed row opens its card and Back returns; light and dark on both sizes; SE scroll and bottom fade. Design and safe-area checks pass. Evidence (ignored): `docs/qa/gift-card-list/`. | Not run: Android, a Pending row (badge unchanged), the loading skeleton on a device. |
| 2026-11-03 | TX-1.ASSET-STACK-ORDER: picker keyboard overflow and opening scroll | `claude/asset-stack-order` from `69a52d25`; `CoinCardPickerSheet.js` | See the scoped follow-up below. Source-driven fixtures reproduce overflow on `ec3089de` and `69a52d25`; corrected Yoga geometry and measured scroll bounds pass. Required design, safe-area and iOS production bundle checks pass. | iOS device QA passed on Pro and SE, light and dark (run `docs/qa/matrix/runs/2026-11-03-stack-order/`). Android open. |

Append one row per coherent delivery. Link safe local QA notes or durable evidence
where appropriate, and distinguish worktree verification from integration into
the target branch. Never check an item solely because a design image or source
patch exists.

### Resume note

- Branches: `redesign` is the integration branch. It started on 2026-10-10 at
  `8a80f4d6`, the tip of `codex/gr3-request-matrix`, which contains all earlier
  redesign branches. Start each new task branch from `redesign`. Merge it back
  with `git merge --no-ff` after its checks pass and this plan is current.
- NFC-1 (2026-10-11) restores reading a Verus NFC card in three places and
  adds the NFC tap screen to every NFC read and write (one commit). The GR-3.9
  phone session waits for it, so one session covers both.
- ID-1 is complete and locally integrated. The implementation and its
  high-risk review corrections (including the two final P2 lifecycle defects)
  are committed as `33865cab` on `codex/id1-redesign` and locally integrated
  into `codex/integrate-generic-request-upstream`; the matching origin branch
  remains behind until a separately authorized push. ID-1.10–1.11 are complete:
  rendered light/dark normal/compact empty/error/keyboard/processing states were
  captured on iOS fixtures, and the single independent high-risk reviewer
  (which also applied `max-product-design-taste` while reviewing the final
  renders) returned READY with all findings closed. Android, authenticated
  real-wallet, and full accessibility proof remain explicitly open, not
  implied.
- Last completed action: ID-1 finalization — the parent ran the focused ID-1
  checks, captured and verified the iOS fixture states, and obtained the single
  independent high-risk READY, then committed the verified candidate as
  `33865cab` and locally integrated it into
  `codex/integrate-generic-request-upstream`. RX-1 remains an accepted local
  delivery with the native system amount keypad, 196 native screenshots, 32
  passing focused checks, and ready independent high-risk/design reviews.
  RX-1.1–1.9 are
  complete for the scoped disposable-fixture delivery. The gallery and exact
  commit receipt are in `docs/rx1-qa-20260911`; no push or publication is part of
  this delivery.
- Next action: resume remaining TX-1 work when authorized. TX-1.6 retains
  authenticated back-navigation walkthroughs. Global QA-1 retains broader
  authenticated/runtime and accessibility proof beyond RX-1's sampled native
  and source verification; see the RX-1 QA report for exact limits.
- GR-1/GR-2 runtime follow-up is closed (GR-3.17, 2026-10-10). Recorded
  accessibility follow-ups remain: full VoiceOver/TalkBack walkthrough, reduced
  motion, and the app-wide text-scaling decision.
- Previously recorded GR runtime gap: the normal simulator has competing preview-app deeplink handlers;
  the compact simulator reaches the actual Testnet unlock sheet but its selected
  disposable profile could not be unlocked with the available setup. Isolated
  native fixtures verify rendering and interaction, not wallet signing or live
  callback delivery. No personal/mainnet wallet was unlocked.
- Owners: the GR-1/GR-2 follow-up task retains its runtime gaps; the next TX-1
  task owns the remaining Send/Convert work. ID-1 retains its explicit proof
  limits: iOS-only native evidence, with Android runtime, authenticated
  real-wallet, signing/funds, live RPC, and full accessibility proof still open.


### TX-1.AMOUNT-KEYPAD — compact Amount and shared stepper (2026-10-30)

Owner-approved reference: `artifacts/space-review-2026-10-30/v2/interactive.local.html`.
Implementation branch: `codex/compact-amount-keypad`, from `redesign` at
`0c63f8109888da6b4515c2e41706203d2ca07f4a`.

- [x] Share compact header geometry between ProgressHeader and SendWizardHeader.
- [x] Integrate native AmountInput, app-owned AmountKeypad, stable route context,
  pinned receive content, and the existing safe Continue action.
- [x] Integrate compact Price and route typography and rows, fixed facts,
  suggestion, and secondary Done, with existing quote and selection callbacks.
- [x] Use compact errors and the approved address-based balance message.
- [x] Complete scoped source checks and native normal/compact light/dark QA.
- [x] Attach before/after evidence and an inventory of later keypad candidates.

Evidence: `artifacts/compact-amount-keypad-2026-10-30/report.local.html`.
Native before captures use the branch base on a 402x874 iOS simulator.
Native after captures cover that size, a 375x667 iPhone SE, and 360x640 Android.
Light/dark Amount and balance errors passed on all three sizes. iOS also
covered same-chain conversion, basket selection persistence, sheet closure,
Recipient Back, and cross-chain conversion with a live source-paid fee block.
Network changes retained the value and its y=218 position on normal iOS.
The SE profile was created from a disposable Testnet fixture and Touch ID
unlock passed after relaunch. Delete hold/release and 18-decimal text retention
passed natively; asset precision validation remained active.

The 20 public text-edit checks pass. Separately, 17 named MAX, amount/precision,
export-fee, route, quote, and Continue expressions match the base in a local
source audit. The shared design guard now checks the
approved 3-point progress track through its shared metrics. The existing route
matrix loader needed bindings for the base's Buffer, ethers and address-type
imports; its expected option cases were retained. No funds are broadcast by
this UI QA round. Design, explicit safe-area, parser, route-matrix, and both
production-platform bundle checks passed. The report lists later keypad
candidates. Native high-impact suggestions, fiat switching without an available
VRSCTEST rate, full assistive-technology/text-scaling checks, and the complete
shared-header consumer matrix remain unverified. Android automation ended with
an adb helper timeout after the recorded Amount/error/MAX checks. A single
recommended adb restart failed; no further Android UI actions were attempted.

### TX-1.STEPPER-DIVIDER — shared stepper follow-up (2026-10-30)

- [x] Remove the divider below the progress track from the shared header style.
- [x] Audit all existing top progress bars and their wrapper consumers.
- [x] Spot-check the shared headers in native normal/compact and light/dark states.

Source audit: the only top progress-track renderers are `ProgressHeader` and
`SendWizardHeader`. Both consume `progressHeader.styles.js`. Wallet/profile
setup, seed import/create and shielded setup use the `CompactSetupHeader`
wrapper. Receive requests, invoices, gift-card funding, recovery/revocation,
and scanners use one of the two shared headers. GenericRequest identity-update
steps retain their separate approved request layout, without a top progress
track. Loading checklists, activity rings and hold-button progress are status
indicators rather than navigation steppers. No consumer migration is required
for this divider removal.

Evidence: `artifacts/stepper-divider-2026-10-30/audit.local.md`. Native setup
headers were checked at 402x874 and 375x667; Send Amount was checked at
375x667. Light and dark were observed, but the complete consumer/platform
matrix was not rerun. Design, scoped safe-area, parser and whitespace checks
pass. The later development reload hit an iOS runner watchdog, so further
runtime verification stopped. Existing local work remains separate.

### Shared input alignment and focus follow-up (2026-10-30)

Evidence, 2026-11-03: Max approved the outline-only field (D2 dark / L2 light). Both `input` fills are transparent; idle/focus borders, placeholders, and address actions use the approved cool colours. The caret uses `link`, and the Manage assets network picker uses `inputBorder`. Consumer source audit, Babel parse, and `check:design` pass. Device QA follows separately.

Branch: `codex/input-baseline-and-wallet-icon`, from `redesign` at `f154138b7`.
Owner correction: keep the wallet avatar's size; change its alignment only.

- [x] Reproduce the iOS editing baseline shift before changing the shared input.
- [x] Remove forced paragraph height from iOS single-line editable inputs only.
- [x] Lighten idle input borders and strengthen the single focus border in both themes.
- [x] Center the 56-point avatar beside the 48-point Personalize wallet input.
- [x] Check representative native light/dark, normal/compact and keyboard states.

Evidence: `docs/qa/compact-inputs/input-baseline-20261030/QA.local.md` and
its native captures. The native fixture renders production controls with
synthetic VRSCTEST state. Before the fix, editing moved the Inter name down
1 point and the Menlo address suffix down about 1.67 points. After the fix,
both sampled normal-size dark comparisons have no vertical shift. The SE
light address sample has a 0.5-point upward raster difference. It no longer
has the downward editing shift. The avatar moved up 4 points. Its diameter
stayed 56 points, and its icon stayed 28 points.

Native checks cover 402x874 and 375x667 iOS plus 360x640 Android. They include
idle/editing addresses, Personalize alignment, iOS duplicate-name validation,
avatar picker return, the valid name callback and Back, a two-line memo with
Done/reopen, password visibility, and search clearing. Both theme border
states were inspected. Token contrast against the input fill is at least
3.04:1 idle and 9.30:1 focused. Design (37 canonical sources), scoped safe-area,
four-file parser, whitespace, and both production JS bundle checks pass.

These are native component-fixture checks. They do not prove real wallet
creation, signing, QR camera scanning, physical iPhone rendering, or a full
accessibility/text-scaling pass. No personal wallet was opened. No commit,
merge, or push was performed during implementation. The owner then authorized
the scoped commit, merge into `redesign`, and push. Physical-device installation
is outside this integration.


### Address chooser wording (2026-10-30)

Owner requested the changes directly on `redesign`. The existing source,
Receive, invoice-payment, and asset selectors now use "Choose an address"
without an instructional subtitle. Related search, fallback, error, and
accessibility copy uses address. Source counts stay accurate as "sources".
Gift cards and NFC cards retain their names. The source data, balances,
selection callbacks and dismissal behavior stay unchanged. Receive fallback
actions keep a 24-point gap after removing their repeated descriptions.

Native component fixtures from this checkout passed on iOS 18.6 at 402x874
and 375x667. Source, Receive, and asset-search choosers were inspected in both
themes. The title stays on one line. Selection applies after dismissal; reopen
retains the selected VerusID. A syncing private source stays disabled. Search
shows the new empty message. Receive's chooser fallback and no-address state
were also inspected. Evidence: `docs/qa/address-chooser-20261030/QA.local.md`
and the PNG captures in that ignored directory.

Design (37 sources), scoped safe-area (13 JS files), Babel parse (13 JS files),
search-field (1262 files), and whitespace checks pass. These are native
component fixtures with synthetic VRSCTEST data. They do not prove an
authenticated wallet or invoice-payment journey. Android, physical devices,
full screen-reader use and text scaling remain unverified. The complete
production iOS bundle request timed out on the existing Metro after 60 seconds;
the separate fixture bundle built successfully. No new Jest tests or
dependencies were added. Implementation ended uncommitted; the owner later
authorized commit, push, and installation on the development iPhone.

### GR-4.NO-LEFT-BAR — content value blocks (2026-11-02)

- [x] Remove the content value-block bar and indent; preserve vertical spacing
  and all other card presentation. Remove the unused encryption warning style.
- [x] Record the rule in DESIGN.md and guard left/start border declarations
  with explicit structural exceptions. Run parser, design, mutation, safe-area,
  component-fixture, existing Jest and whitespace checks. Record the baseline
  Jest failure separately from the candidate.
- [ ] Owner device QA: added (one unlabeled block), appended (Existing + Add
  value), removed (actions 3/4: struck Active + description), removed without
  metadata, and private/encrypted changes; light and dark. No replacement bar
  or indent; stacked value blocks remain separate.
  Agent iOS QA 2026-11-02: added, appended, replace and clear pass in light
  and dark (iOS 26.5 sim). Private/encrypted, no-metadata removal and Android
  stay open.


### SH-1.TEXT-ACTIONS — shared link and action roles (2026-11-02)

Branch: `claude/text-action-link`, from `redesign` at `69de19d6`.
Owner chose option B of the text-action audit. This scope changes text actions
and their documented roles. It does not change transaction or consent logic.

- [x] Add light/dark `link`, shared TextAction, small context actions and MAX chips.
- [x] Migrate the audited actions and reachable legacy text buttons. Keep the
  Login video exception, canonical sheet rows and the stated exclusions.
- [x] Standardize secondary action roles and request-review Cancel fills.
- [x] Update DESIGN.md, TYPOGRAPHY.md and the direct action-label design guard.
- [x] Run design, safe-area, parser, component, contrast and both production
  JS bundle checks. Keep the component fixtures temporary. Add no Jest tests.
- [ ] Orchestrator device QA: iOS and Android, light/dark, normal/compact,
  pressed/disabled, keyboard, Back and recovery states in the local handoff.

Evidence: `text-action-implementation.local.md` lists each action, source lines,
reachability and the device checklist. Normal link contrast is 4.88:1 or more
in light and 5.22:1 or more in dark on background, sheet, surface,
surfaceRaised and surfaceMuted. Component fixtures cover shared type roles,
icons, callbacks, pressed/disabled state, accessibility roles and hit slop.
The design guard rejects a primary-colored direct action label, while primary
fills and icons pass. It does not infer named stylesheet callers.

Both platform JS bundles pass with this checkout as Metro's project root.
The fresh worktree reuses the existing dependency tree through a local symlink.
A temporary Metro config exposes that dependency directory. pnpm's automatic
install check is disabled for these commands; no package files change.
GiftCardFund Back/Close declarations match the base. Its changes are limited
to the MAX and add-content controls. No simulator, emulator, wallet action,
push or merge ran. Device proof remains separate from source and fixtures.


### TX-1.ASSET-STACK — Final stack and transactions sheet (2026-11-03)

Owner-approved scope: `/tmp/vm-mock-cards/BUILD-ASSET-STACK.md`, Final
`E-r4.html?v=5`, reference states in `ref-final/`, and Jewel palette 1.
Design contract: `DESIGN.md`, Asset screen balances. The approved mockup owns
geometry and materials. Existing CopyAction, PrivacyBlurredText, StatusBadge,
SignedInActionBar, CoinCardPickerSheet and Overview own their behavior.

- [x] Trace subwallets, ledger totals, identity i-addresses, selection and account
  settings. Assign saved slots before `SET_USER_COINS_COMPLETE` publishes cards.
- [x] Implement the fixed safe top row, 6/4-shape stack, hidden-card sum, card
  selection, single-card rule, network rule, flat materials and picker swatches.
- [x] Implement the reusable two-snap non-modal sheet, shared fold progress,
  vertical pan guard, header tap, Reduce Motion, open-list scrolling/refresh,
  Android Back and accessibility alternatives.
- [x] Preserve pre-launch facts, selected-card history, details, action gates,
  and other action-bar consumers.
- [x] Run the final design, safe-area, contrast, parser, logic and bundle checks.
- [x] Owner testers: verify iOS normal/SE and Android, both themes, all approved
  states, edge Back, Android Back, list refresh, row taps, color restore and
  large text (2026-11-03 device QA row).
- [ ] Open: VoiceOver/TalkBack, real-finger motion and Release-build motion,
  hidden balances on a real Android phone, and color relink after an ID unlink.

Allowed choice: open-list drag does not close the sheet. Only its header does,
so native pull-to-refresh has no closing gesture competitor. No new libraries,
Jest tests, ESLint fixes or device runtimes belong to this task.

### TX-1.ASSET-STACK-ORDER — Pins and last used (2026-11-03)

Approved scope: `/tmp/vm-mock-cards/BUILD-STACK-ORDER.md` and Recommended in
`O-order.html?rule=rec`. Contract: `DESIGN.md`, Asset screen balances.

- [x] Trace stable subwallet IDs, every active-card setter and settings storage.
- [x] Save ordered pins, last-used ID and selected ID per account and coin.
  Restore the saved front through Home's existing opening rule.
- [x] Apply Main, pins, last used and confirmed-balance order at caps 6 and 4.
  Keep Private's default pin distinct from an explicit empty pin list.
- [x] Add PINNED / OTHERS groups, separate 44-point pin buttons and the inline
  limit note. Preserve rows, search, chips, swatches and current-row scrolling.
- [x] Run design, safe-area, Babel, iOS bundle and temporary non-Jest checks.
- [x] Owner testers, iOS: iPhone 17 Pro (cap 6) and iPhone SE (cap 4), both
  themes: order rule with real and 20 fake VerusIDs, last used after picking
  from "N more", pins and limit notes (3 / 1), unpin rules, pin versus row
  taps, long names, leave/reopen, sign-out/sign-in and cold restart.
- [ ] Owner testers, Android: the same checks on a normal and a small device.

Evidence: temporary source fixtures in `/tmp/stack-order-check/` reproduce the
old hidden-card behavior. The new rule passes 482,617 randomized checks at
caps 6 and 4. Settings/saga fixtures cover rapid changes, account/coin isolation,
null choices, stale sessions, sign-out, settings reload and failed-save retry.
React picker fixtures cover groups, pin order/limits, filters, frozen balance
order, reopen reset and current-row offsets. Token checks cover pin and notice
contrast. These fixtures do not establish native rendering or accessibility.
No device runtime ran. No new dependencies, Jest tests or design-check changes.

QA follow-up, 2026-11-03 (P2-1 and P3):

- [x] Resolve Main from `MAIN_WALLET`, else the first Transparent card in
  original card order. Apply it to ordering, selection, pin limits and picker
  buttons. Ignore saved Main pins and last-used IDs.
- [x] Let picker amounts use intrinsic width, capped at the existing 108 points.
  Keep the existing 0.72 font-scale floor and 44-point pin targets.

Temporary checks reproduce the dynamic-Transparent last-used failure before the
fix. Both Main variants pass 482,617 randomized checks each at caps 6 and 4,
plus settings/saga and light/dark normal/compact picker fixtures. Native Yoga
geometry passes 72 row cases: short amounts free name space; long amounts get
no less space. Design, safe-area, Babel and iOS production bundle checks pass.
The old picker fixture expected OTHERS without visible pins; it failed on the
starting commit too. Its assertion now follows DESIGN.md (no group title).
No Metro or device actions ran. Device re-checks remain open for Transparent
selection/order/pin exclusion, saved Main IDs, and long names and amounts in
both themes at normal and compact sizes.

QA follow-up, 2026-11-03 (P2 keyboard overflow and P3 opening scroll):

- [x] Let the picker body and list shrink inside the existing keyboard-aware
  modal cap. Keep search and chip heights fixed. Keep list clipping inside the
  sheet's padding. Preserve the shared modal and keyboard dismissal behavior.
- [x] Measure the actual list viewport for scrollability, bounds and fades.
  Use the native indicator below the canonical 128-point fade cutoff.
- [x] Open at the top when the current row is pinned and PINNED fits. Otherwise
  leave the current row below the full top fade and clamp to the list bounds.
- [x] Run the temporary fixtures and required static/bundle checks.
- [x] Owner testers, iOS: SE S7 and the Pro keyboard/note re-check passed in
  both themes (search, clear, chips, pin/unpin, note, no results, last row,
  keyboard close and reopen; opening with a pinned front, a middle and an end
  row). Focusing search no longer moves the list to the top (`c1364d56`; the
  keyboard resize had reset the scroll). Open P3s: with the keyboard up, the
  first chip tap only dismisses the keyboard (older than this branch; the chip
  rows have no `keyboardShouldPersistTaps`); right after the keyboard opens at
  a scrolled position, the list shows no bottom fade until the next scroll.

Cause: the modal already adjusts its percentage cap above the keyboard, but
the picker body and fixed-height list did not shrink. The child list therefore
extended past the sheet, and scrollability used its requested full-window
height. The same source-executed picker/Yoga fixture reproduces overflow on
`ec3089de` and `69a52d25`; the layout defect predates this branch. Groups and
the limit note make it easier to trigger. Opening scroll also placed the current
row directly under the top fade before this branch.

Evidence: `/tmp/stack-order-check/picker.cjs` and `picker-sheet-layout.cpp`
exercise the real component's styles through installed native Yoga with controlled
keyboard frames. Both Main variants pass 112 keyboard geometry/scroll cases and
21 opening cases each, plus the existing picker fixtures. Four opening cases
defer animation frames to check resize and rapid close/reopen. The existing invariant,
settings/saga, 72 row-layout and parser checks pass. These checks establish
source behavior and controlled layout geometry, not simulator rendering,
keyboard animation, native text sizing or accessibility. Device QA stays open.


### ID-3.UPSTREAM-SYNC — Phase 1 (2026-11-04)

- [x] Merge all 12 upstream stages through `0a99f88a` with true merge history.
  Use an ours merge for the cosmetic button commit.
- [x] Keep upstream registration and management engines and SDK `5ddc4b8b`.
  Keep commitment and registration as two separate approvals. Keep manual linking.
- [x] Mount registration, management, results, and Link under `IdentityTab`.
  The list + offers Register and Link. Page options offer Transfer, Modify,
  and Unlink. Home registration notices open the VerusID tab.
- [x] Adapt provisioning, verified revoke/recover, upload, tagged-invoice,
  durable gift/claim, and deeplink callers. Preserve redesign VRPC funding,
  pending-balance, private retry, history, and token-fee behavior.
- [x] Run static contracts, upstream and redesign suites, baseline comparison,
  and iOS/Android production bundles. Keep upstream test sources unchanged.
  Test fixture compatibility failures remain. See `idreg-sync.local.md` for
  exact counts and reasons. A passing bundle does not prove wallet execution.
- [ ] Phase 2: redesign the new upstream screens under the approved design work.
  Phase 2a registration is implemented on `claude/idreg-ui-reg`. Phase 2b
  Transfer/Modify/Link is a separate task. Device verification remains open.
- [ ] Phase 3: verify complete wallet flows, interrupted operations, retry,
  confirmation, Back, and reload on devices. No device or Metro server ran in phase 1.

Design contract: keep the existing VerusID list, options rows, request cards,
review rows, and Revoke/Recover scaffolds. No restyling. New navigation entries,
fee facts, invoice Tag, and unknown-broadcast copy use those components.
The unused upstream content-review style module is omitted. It has no consumer
in the retained redesign. Shared button exports and the upstream Button wrapper
are available without changing existing buttons.

Full stage decisions, funds-path decisions, checks, and open gaps are in the
uncommitted `idreg-sync.local.md` merge log.


### ID-3.MANAGEMENT-UI — Phase 2b (2026-11-04)

- [x] Read the approved management specification and light/dark references.
  Record the small design contract in `idreg-ui-mgmt.local.md`.
- [x] Use the three-row options sheet, one-screen Transfer, Modify option B,
  information sheets, hold review, shared results and full-page Link.
  Preserve engine functions, session guards, consent, unknown broadcast and
  local unlink retry. Registration screens stay outside this scope.
- [x] Clear active and available subwallets on sign out. Keep explicit-choice
  preferences and reconcile removed cards to null. Run the three lifecycle suites.
- [x] Finish static, component, suite and production-bundle checks. Record exact
  results and fixture limitations before handoff.
- [ ] Orchestrator device QA: normal/compact iOS and Android, light/dark;
  loading, field and keyboard states, chosen-step Back, deselection reset,
  no diff, stale review/reload, consent/hold, interrupted/unknown send, unlink
  retry, Link search/partial failures/manual fallback/refresh failure.

Design contract: operate mode. Approved TS/TU/LK and MB frames are the visual
exemplars. Reuse ProgressHeader, outline fields, selection and info sheets,
Send hold, safe footers, SkeletonLoader and TransactionResult. Use theme and
typography roles, 20-point content inset and 24-point top inset. Native rendered
proof belongs to the orchestrator under the task's explicit no-device rule.


Phase 2b evidence: design (39 sources, 17 materials), safe-area (13 JS files),
parser/Babel, staged whitespace, 59 synthetic public-component/reducer checks,
and iOS/Android production bundles pass. All six management/link engine modules
are byte-identical to the base. Six management engine suites pass 266 tests;
the management screen suite cannot load its native SVG mock (base: 47 tests).
Link engine passes 37; Link screen has the same new SVG load block (base: 13).
The complete requested run has 8 suites pass / 5 fail, 316 tests pass / 20 fail,
and 3 load errors. Existing action-controller assertions account for 15 failures.
Subwallet lifecycle has 5 assertion mismatches: null/Total reconciliation and
its additional explicit-choice map. Carousel now passes all 8 tests; the old
coin-menu fixture still cannot load native Gesture Handler. Tests are unchanged.
No Metro server, simulator, device, signing or broadcast ran. Native rendering,
keyboard, accessibility and live Transfer + unlink remain orchestrator gates.
Detailed mapping, exact commands and hard-to-reach states: `idreg-ui-mgmt.local.md`.

V2 decision, 2026-11-04: Max approved visible checkboxes for Link, gift-card
VerusID choices and Modify sections. All use the shared multi-select rule in
`DESIGN.md`. Busy rows keep their boxes. Linked rows show `Linked` once, at
full opacity, with the name at 0.6. The five approved V2/M2/G2 mockups were
inspected. Native normal/compact and light/dark QA remains with the orchestrator.
V2 checks: design (39 sources, 17 materials), safe-area (3 JS files), Babel
and 48 controlled React row scenarios pass. Single-choice output matches the
base after resolving styles. Three existing Jest suites stop before tests run
on native mock imports (`Mixin`, `Platform.OS`). ESLint stops on the existing
`eslint-plugin-import` package-export error. No tests were added or changed.

### ID-3.REG — New VerusID, phase 2a (2026-11-04)

Design contract: owner-approved R1–R9, V3a–V3d, V1c/e/f/g/h and NS1–NS8;
the approved spec wins over superseded filled fields and pre-hold shortfalls.
Reuse the V3 `AppTextInput` accessory, ProgressHeader, InfoSheet, SelectionSheet,
AppSearchField, StatusBadge, Send hold button, SafeBottomActionStack,
TransactionResult and VerusIdCard. Keep normal/compact and light/dark behavior.

- [x] Combine create and the two payment approvals in the registration UI.
  Preserve upstream routes, engine calls, approval tokens, one-confirmation
  gating, reconciliation, identical-byte retries, deletion and manual linking.
- [x] Add the V3 namespace segment, cached SDK-filtered local namespace list,
  search, prices, unavailable reasons, no-market group, fiat and prepared-job Save.
- [x] Add saved/pending registration rows to the VerusID tab. Preserve the
  upstream persistent Home card. Replace native registration alerts with app sheets.
- [x] Use DAI.vETH in Bridge.vETH for the shared testnet native dollar route.
  Keep mainnet configuration and the existing testnet-price setting gate.
- [x] Run registration suites, design/safe-area/parser/source checks and both
  production bundles. Preserve upstream tests. Record test-fixture failures.
- [ ] Orchestrator: native iOS/Android light/dark normal/compact QA. Verify
  keyboard and namespace sheet sizing, both real approvals, one confirmation,
  changed price, insufficient funds, save/restart, Back, unknown delivery,
  expired/spent jobs, all deletion kinds and manual linking.

Evidence: `idreg-reg.local.md` records exact commands, frame mapping, results
and limits. Core engine suites retain 268 passes. Storage retains 78 passes and
the existing ServicesHome/IdentityTab route assertion failure. UI component and
presentation suites pass; the screen suite cannot load with its old incomplete
React Native SVG mock. The notification mock load failure already exists on the
base. Source-derived light/dark normal/compact renders are in the ignored
`artifacts/idreg-reg/` folder. These are not native-device proof. Engine,
dispatcher, channel, VRPC, storage, management/Link screens and tests are unchanged.

### ID-3.FIX4 — Device QA follow-up (2026-11-04)

- [x] Reveal the focused registration/Modify input and its supporting line above
  the existing keyboard footer. Scope the measured scroll behavior to these forms.
- [x] Reuse VerusID dot wrapping in job, funding and management text. Match saved
  draft accessibility to its visible status and Continue action.
- [x] Show the saved job during a reconcile lock. Retry passive checks while
  locked and open the second hold review when ready. Keep engine approval gates.
- [x] Map only transport failures to Send/Convert connection copy and Try again.
  Preserve domain, safety and unknown-delivery messages.
- [x] Run design, safe-area, parser and iOS/Android production bundle checks.
- [ ] Device tester: verify light/dark on iPhone 17 Pro, iPhone SE, Pixel 9 and
  Android 360×640. Follow the per-item steps in `idreg-fix4.local.md`.

Evidence: 13 controlled React component/scroll scenarios pass. Base checks
reproduce missing focus reveal, missing namespace breaks, the stale saved-draft
label, the error-only locked opening and raw transport text. Design, safe-area,
parser and both production bundles pass. These checks do not prove native
keyboard geometry, text wrapping, accessibility or live payment transitions.
No simulator, emulator or Metro server runs in this batch. The engine, RPC,
funds paths and saved-job deletion code remain unchanged.

### ID-3.POLISH — Owner screenshot follow-up (2026-11-04)

Branch: `claude/idreg-polish-fixes`, from `af661851`.
Design contract: operate mode. Keep the registration field and filled-row
exemplars. Reuse AppTextInput, AppButton, createAlert, AcknowledgeSheet,
TransactionResult, TextAction and VerusIdName. Keep the 1-point field outline,
36-point Continue pill and 44-point targets. The owner-approved destructive
button is the only new visual rule. Device rendering belongs to the orchestrator.

- [x] Let the namespace divider follow the actual field outline in every state.
- [x] Link on one tap. Keep the operation guard, button loading, errors and Not now.
- [x] Add destructive button tokens and the shared variant. Apply it to the
  named data-deletion confirmations. Preserve cancel order and dismissal.
- [x] Center Continue with the text block and trash action. Keep the existing
  VerusIdName dot breaks. Check waiting rows and rows without a delete action.
- [x] Run design, safe-area, parser, component and base-comparison checks.
- [ ] Orchestrator device QA: light/dark, normal/compact. Check field idle,
  focus and taken states; link busy, failure and retry; destructive normal,
  pressed and disabled states; long-name Continue and waiting rows, with and
  without trash. Check the VerusID tab row.

Evidence: the component suite retains 10 passes. The screen suite has the same
SVG/native-mock load error on base and candidate. A focused UI suite passes 13
checks; 10 fail on the archived base. The two updated one-tap link tests pass
with temporary native mock repairs and fail on base. Two additional local
checks pass for failure/retry and Not now. These checks use controlled React
components; they do not prove native layout or a real wallet link. Design,
safe-area and parser checks pass. The engine, SDK and RPC sources are unchanged.

### ID-3.POLISH-2 — Eight owner-approved fixes (2026-11-04)

Branch: `claude/idreg-polish-fixes`, from `ccbb4ed4`.
Contract: approved I1 prose and N1 behavior with final V1 rows. Keep the existing
InfoSheet/SelectionSheet shells, SelectionRow and registration result card.
Use titleRow/bodySm, textPrimary/textSecondary and 4/20-point prose spacing.
V1 uses quietValue for bodySm/textSecondary prices and caption/textSubtle fiat.
Token namespaces show only the number. The root keeps its ticker. Zero is Free.
Device rendering and the Android PC build belong to the orchestrator.

- [x] Add InfoSheetTopic for registration, management and Link prose. Keep data
  rows and existing explanation text unchanged. Record I1 in DESIGN.md.
- [x] Hide namespaces with reasons. Keep transient retry context, visible-only
  search counts, hidden permanent-match feedback and data order.
- [x] Apply the final V1 row layout through a backward-compatible quietValue
  option. Remove token units; keep the root ticker, fiat and referral subtitle.
- [x] Hide the result card's network only when its name ends in that network.
  Remove the unpaid-draft delete question from the body. Keep paid warnings.
- [x] Use primary for Unlink and remove its red option-row treatment. Keep
  Submit revocation and Delete wallet destructive. Correct DESIGN.md.
- [x] Opt out of predictive back on the Android application tag. Keep targetSdk
  36. Add the removal-condition comment and parse the manifest.
- [x] Convert registration USD display prices through cached GENERAL USD/fiat
  pairs. Use the app formatter and the selected currency's small-value case.
  Hide missing conversion rates. Preserve USD output and all price fetches.
- [x] Run design, safe-area, Babel, XML, whitespace and controlled checks.
- [ ] Orchestrator: native normal/compact light/dark QA of prose scroll/Done,
  namespace search/selection/retry, result names, deletion and Unlink sheets,
  display-currency changes/missing rates, and Android Back after a PC build.

Evidence: 60 temporary Node/React/source checks pass; 36 fail on the base.
They cover a synthetic 301-row list with 142 refusals, search precedence/reset,
V1 and unchanged ordinary SelectionRow styles, currency/rate changes in every
registration fiat consumer, USD parity, EUR formatting, missing/invalid pairs,
paid/unpaid messages, result suffixes, copy values, Unlink styling and manifest
scope. The shared data rows, on-chain readers and price-loading effect remain
byte-identical. This is controlled evidence, not native rendering or a live
catalogue/rate-cache inspection. No Jest tests were added or changed. No device,
Metro, Android build, signing or broadcast ran.

### ID-3.K2 — Name-check error placement (2026-11-04)

Contract: operate mode. Use the approved K2 mockup and existing V3 NameField.
Reuse AppTextInput, caption/dangerText, TextAction and the polite status row.
Keep the outline/divider rule, action-error footer and both footer buttons.

- [x] Show every previewError below the name field with one Try again action.
  Use the shorter approved connection copy here only. Keep other error messages.
- [x] Keep the existing previewAttempt retry path and transport-error clearing.
- [x] Run design, changed-file safe-area, Babel, whitespace and controlled checks.
  Read the connection, other-error, taken, available and checking copy.
- [ ] Orchestrator device QA: iOS/Android, light/dark, normal/compact, keyboard
  open/closed. Check field visibility, retry, status announcements and action errors.

Evidence: 32 temporary React/source checks pass; 11 fail on base e8f39d04.
They cover status content, one field retry, caption tokens, busy disabling,
taken-only invalid state, outline-driven divider, retry callbacks and both
footer buttons. Token contrast is 5.022:1 light and 7.841:1 dark. This is
controlled evidence, not native layout or screen-reader proof. No device,
Metro, engine, SDK, storage or RPC changes. Details: idreg-k2.local.md.

### HOME.NOTICE-A — Smaller notices and Private sync (2026-11-04)

Branch: `claude/home-notice-a`, from `bc6602db`. The owner chose look A of the
notice-size mockups. Reuse the existing cards, theme roles and AppButton.

- [x] Apply 16-point corners, 12/14-point padding, 14/20 text, 18-point close
  glyphs and 8-point card gaps. Keep existing copy and notification behavior.
- [x] Keep notice buttons at 32 points on SE, with 48-point effective targets.
  Keep the ordinary small-window action rule unchanged.
- [x] Add Private sync after assets found and before empty. Use the lowest
  known active private-card percent below 99. Dismiss it in memory only.
- [x] Update DESIGN.md and run scoped design, safe-area and bundle checks.
  Compare the requested Jest failure with the clean base.
- [x] Inspect native component fixtures in light/dark on normal iPhone and SE.
- [x] Orchestrator: verify full-wallet dismissal/reopen and Android normal/small.
  iOS (iPhone 17 Pro light/dark, SE light) and Android (normal light/dark, small
  light) passed on 2026-11-04 with real wallets and Metro state fixtures. Close
  hides sync across a tab switch and a new percent; it returns after lock and
  unlock. Notice buttons stay 32 points on SE and the small phone.
- [ ] VoiceOver/TalkBack progress speech. Native reports "Private card sync",
  progress bar, 42 percent; spoken output and update silence are not checked.

Evidence: native fixtures use this worktree's components and an isolated Metro
server. They do not unlock or use a wallet. Measured normal-card heights:
offline 64, unreachable/found/empty 86, sync 92 points. SE keeps 32-point
buttons; unreachable wraps to 106 points. Controlled selection checks cover
priority, minimum percent, unknown/complete values, inactive coins, network,
private-card presence and dismissal. The existing Jest suite fails on both
base and candidate before running tests: vector-icons native-module import.
Full-wallet, Android and screen-reader results remain separate from fixtures.

### TX-1.HIDDEN-BALANCES — Transaction amounts and phone preference (2026-11-05)

Owner decisions: blur transaction money amounts and keep the hidden/shown
choice after restart. Scope: history rows, transaction details and persistence.
Exemplar: `SignedInAssetHeader` total/fiat. Primitive: `PrivacyBlurredText`.
Keep the existing type, colors and layout. No deliberate design deviation.

- [x] Cover Overview and pre-launch rows, including pending and waiting rows.
- [x] Blur amount, fiat and fee in the transaction sheet. Replace hidden
  accessibility amounts with "Balance hidden". Keep identifiers readable.
- [x] Save the phone-level choice at `balancePrivacy:hidden:v1`. Apply it with
  `SET_BALANCE_VISIBILITY` before signed-in navigation can mount. Preserve
  `SET_BALANCE_SHOW` callers, ordered writes and account-change behavior.
- [x] Run frozen install, design/card-color, 11-file parser and whitespace
  checks. Reproduce the missing explicit setter and spoken row amount before
  the fix. Check storage, Redux/saga and 12 component scenarios without Jest.
- [ ] Opus: review and run native iOS normal/SE and Android normal/360x640
  checks in both themes. Check shown/hidden incoming, outgoing, pending,
  failed/in-progress and pre-conversion rows, sheet amount/fiat/fee, long-list
  scrolling, live toggles, Back/reopen and VoiceOver/TalkBack speech.
- [ ] Opus: restart after both choices and rapid taps. Check the first signed-in
  frame, sign-out/account switch, and failed or unavailable storage fallback.

Evidence: temporary non-Jest checks pass. Storage checks cover hidden/shown
restart, missing/malformed/rejected/synchronous/stalled reads, late-read
protection, ordered rapid writes and recovery after a failed write. Redux/saga
checks keep the setting through account actions. Component checks use the
actual blur, transfer-node and information-row components with native host
stubs and theme tokens. They establish props and accessibility labels, not
native blur quality, layout, speech or scrolling. No device or Metro ran.

### ID-3.NIGHT3-A — Registration and Transfer bugs (2026-11-05)

Contract: operate mode. Keep the V3 name field and TS transfer form, shared
outline inputs, semantic error text, existing amber warning and safe footer.
Use a name-only Inter derivative without contextual alternates. Keep glyphs,
metrics and ordinary text unchanged. Device QA is outside this implementation.

- [x] Use boolean getblock verbosity and string heights, including SDK reads.
- [x] Validate typed names locally. Use plain errors, retry only failed checks,
  and mark every name error with the danger outline.
- [x] Add name fonts and shared name rendering for registration, management,
  Link rows, manual Link, selection rows and information sheets.
- [x] Debounce read-only owner checks. Disable blocked Transfer review, discard
  stale results, and put errors below the warning in scroll content.
- [x] Pass design, safe-area, parser, focused lint, controlled form/engine,
  font-shaping and iOS/Android release-bundle checks. Standard ESLint cannot
  load its existing import plugin (ERR_PACKAGE_PATH_NOT_EXPORTED).
- [ ] Native rebuild and normal/compact iOS/Android light/dark QA: font loading,
  name glyphs, field errors/retry, transfer warning/error layout, keyboard,
  correction, Back/reload, and real request/registration/transfer flows.

Evidence: 59 temporary controlled checks, 9 public transfer-engine checks with
real identity primitives and simulated RPC, and 60 font checks pass. The base
fails the name-error outline regression check. Live api.verustest.net rejects
numeric verbosity with -32601 and returns the required fields for true.
Both release bundles pass after the repository's existing postinstall patches.
No Jest tests, devices, signing, broadcasts or mainnet wallet actions ran.

### ID-3.NIGHT3-A — Batch A round 2 (2026-11-05)

Contract: operate mode. Keep the V3 field and TS transfer form. Use
AppAddressInput errorText for recipient input errors and helperText for identity
blocks. Keep both inside VerusIdFormField for measured keyboard reveal. Preserve
the amber warning, action-error position, safe footer and review gates.

This supersedes round 1's name-only font solution and owner-check position.

- [x] Patch all 18 bundled Inter variants in both platform asset folders.
  Remove only the two adjacent-digit x substitution rules. Preserve every
  other calt rule, font name, outline, metric and feature.
- [x] Remove the VerusName assets, native registrations and component opt-ins.
- [x] Put owner-check results under New owner. Use a red outline only for bad
  recipient format or a missing recipient VerusID. Keep action errors below
  the warning and dismiss the keyboard when Review transfer is pressed.
- [x] Retry only unsigned registration SDK reads/builds for
  INVALID_CHAIN_CONTEXT and STALE_CHAIN_CONTEXT, at most twice, after 1.5 s.
  Map both codes to plain words at the shared UI boundary. Never retry a
  signing, broadcast or saved-transaction resend step through this helper.
- [x] Pass design, safe-area, Babel, focused ESLint, plist, both release
  bundles, controlled behavior checks and the full font shaping comparison.
- [x] Rebuild both native apps. Verify names and addresses app-wide, plus
  normal/compact light/dark Transfer keyboard and registration retry states.
- [ ] Follow-up (Batch B): with the keyboard open, the Transfer amber warning
  scrolls behind the safe footer on Android (reachable by scrolling).

Evidence: 20,520 HarfBuzz comparisons cover 228 strings, five feature settings
and every Inter variant. Only digit-x-digit samples differ. All other font
table bytes match, except GSUB and the required checksum. Every remaining GSUB
rule matches. Fifty controlled component/helper checks, ten public transfer
engine checks and 29 retry/boundary checks pass. The default V1 testnet server
returns -5 for the missing test VerusID. Repository ESLint remains blocked by
its existing import-plugin ERR_PACKAGE_PATH_NOT_EXPORTED error.

The owner supplied successful round-1 native iOS QA, including a real VRSCTEST
registration. It is baseline evidence only. Round-2 native rendering, keyboard,
screen-reader and end-to-end behavior remain unverified. The font sample is
rendered with HarfBuzz; it does not prove native font loading. No Jest tests or
dependency changes. The full report stays in verusid-batch-a-round2.local.md.

Device QA 2026-11-05 (native Debug builds of 2b2753c6, Sonnet testers): iOS 17
Pro and SE light/dark pass. Plain x in names everywhere; a second real root
registration (qa7x71658.VRSCTEST@) on the default V1 server passed with no raw
tip errors seen. Owner errors stay under the field above the keyboard. Android
normal and 360x640 pass on V1: Available, all name errors, plain x, Transfer
format/not-found errors (red) and the outside-recovery block (neutral, Review
off). Open: the Android keyboard-open warning position above. Retry banners
were not forced on a device; the retry boundary is checked in code only.

### ID-3.NIGHT3-B — VerusID safety fixes (2026-11-05)

Contract: operate mode. Use the current Transfer identity heading, management
review rows/panels and V3 registration form. Reuse Warning, DetailRow,
CheckOption, AppStatusBadge, SafeBottomActionStack, VerusIdFormField and the
shared fade. Use existing theme/type roles and page insets. Keyboard-open
registration pins a compact exact total and hides Save for later on every
screen size (QA showed the normal-size form cut the price on Pro and Pixel 9).
No new consent cases, engine edits, dependency changes or Jest tests.

- [x] Name the VerusID and network on Modify review. Explain the resulting
  signing policy from verified signing/VRPC wallet addresses. Mark added and
  removed primary, recovery, revocation and private values. Keep unchanged
  values once. Preserve every warning's meaning and the exact upstream
  `needsAcknowledgement` expression and handler gate.
- [x] Clip form content above non-shrinking opaque footers. Keep the shared
  fade with the keyboard. Reveal the field label top and remove the duplicate
  footer-height scroll reserve. Pin every quoted currency above the compact
  first hold. Hide Save for later while the compact keyboard is open.
- [x] Show Not enough funds and block the first hold and its handler for any
  known short currency balance on the selected source and chain. Compare the
  full atomic two-payment quote without rounding. Missing/loading balances
  stay nonblocking. Use Transparent or the same VerusID name in Pay from and
  the error. Preserve the engine guard and later saved-job resumption.
- [x] Add the approved app-data caption once on the create form. Replace the
  Transfer warning fragment and its information topic with the approved words.
  Keep the irreversible-action sentence bold and Transfer logic unchanged.
- [x] Run design, changed-file safe-area, Babel, focused ESLint, temporary
  component/pure-logic checks, and iOS/Android production bundles to /tmp.
- [x] Device QA: light/dark; Pro/SE/Android normal/360x640; keyboard open/closed;
  enough and not enough funds; Modify add-second-address 1-of-2, 2-of-2,
  1-of-3, remove address, change recovery; full Transfer warning above the
  footer; Modify Back on Android. Review screens only, no holds.
- [x] Pin the keyboard-open price and funds badge on every screen size
  (`1fb71284`), after QA showed the Pro price cut in half and the badge hidden.
- [ ] Follow-ups for Batch C: Android New VerusID pans the whole window over the
  status bar when a bottom More options field gets focus (also on `ff2e63e0`);
  "Available" and nearby rows sit in the keyboard-open fade on compact screens;
  Added/Removed labels are quiet; 2-of-2 shows two near-duplicate warnings
  (upstream wording); unknown balance, multi-currency quote, Back/reload on
  create and Transfer, both real holds, screen readers and text scaling.

Evidence: the temporary create-screen check fails on ff2e63e0 because 39 does
not block a 100.0001 first hold, and passes on the candidate. A temporary scroll
hook check fails on the base's field-only reveal and passes with label-first
reveal. Controlled checks cover exact decimal boundaries, multi-currency and
unknown balances, selected source/chain isolation, policy descriptions and
value deltas. The consent expression matches the base byte for byte. Both
release JS bundles pass. Standard ESLint cannot load the existing import plugin
(ERR_PACKAGE_PATH_NOT_EXPORTED); focused core/React rules pass. Candidate
native geometry, Android execution, screen readers, text scaling and real
wallet operations remain open. See verusid-batch-b.local.md for the full matrix.

Device QA evidence (2026-11-05, Sonnet testers): iOS Pro B1–B7 and SE S1–S5
pass on `c36c1fd1` via Metro; Android normal and 360x640 pass on a native build
of `c36c1fd1`, including the funded path (about 104 VRSCTEST, Hold on, no
badge). After `1fb71284`, iOS R1/R2 and Android R3/R4 pass (price, app-data
line and funds badge above Hold while typing). The Android window pan
reproduces on `ff2e63e0`, so it predates this batch. Run folder and HTML
report: `docs/qa/matrix/runs/2026-11-05-batchB/` (local, not in Git).

### ID-3.NIGHT4-A — VerusID and request findings (2026-11-06)

Contract: operate mode. Keep the current VerusID page, Transfer form, request
completion sheets, registration progress, and revocation/recovery review.
Reuse their theme roles, CopyAction, AppStatusBadge, AppButton, shared review
spacing, and safe footers. Keep POST delivery automatic after broadcast and
redirect delivery under Complete. Leave registration prices and gift claims
outside this batch. Device QA runs separately.

- [x] Read accumulated VerusID content for the count and content sheet (item 1).
- [x] Deliver POST identity-update replies after broadcast. Keep delivery retry
  separate from broadcast and preserve redirect consent (item 2).
- [x] Align uncertain registration notices with Check delivery. Retain plain
  server-refusal guidance until the transaction is found (item 3).
- [x] Refuse this wallet's addresses and wholly owned VerusIDs in Transfer form
  checks and preparation. Keep external i-address recipients valid (item 4).
- [x] Restore the revocation review gap. Check recovery's existing gap. Failed
  submissions offer Review again and clear stale consent and errors (items 5–6).
- [x] Give long links a plain refusal without a debug error overlay. Use Wrong
  network for a request whose flag and signed system disagree (items 7–8).
- [x] Name shared credentials and their count after confirmed delivery. Use
  Nothing was sent without a repeated body for an empty response (items 9–10).
- [x] Disable Save for later for a known funding shortfall. Add a durable first
  broadcast time and switch commitment guidance after 3 minutes (items 11–12).
- [x] Ask for a name when a namespace is chosen. Show the exact number of other
  primary addresses on the VerusID page (items 13–14).
- [ ] Later device QA: normal/compact Android, light/dark, Back/reopen, sheet
  dismissal, real POST/redirect delivery, spent inputs and slow confirmations.

Evidence: controlled JavaScript checks cover immediate POST, deferred redirect,
response-only retry, one broadcast, consent/error reset, accumulated content,
network refusals, registration copy and timing. Seventeen public transfer-engine
checks use real identity scripts and transaction parsing with simulated network
reads. Both named QA identities have zero latest content keys and one accumulated
content key in the live VRSCTEST daemon. Design and safe-area checks pass. Focused
lint has no new errors. Standard ESLint stops before linting on the existing
import-plugin ERR_PACKAGE_PATH_NOT_EXPORTED error. Android and iOS release JS
bundles pass with one worker, after stopping the initial parallel runs under
memory pressure. Babel parses all 21 changed JavaScript files. Protected price
functions match the base; the create footer changes only its disabled condition.
No Jest tests, devices, native changes, dependency changes, signing, broadcasts,
merge or push in this task.


### ID-3.REG-R11 — Approved New VerusID flow (2026-11-06)

Contract: operate mode. SPEC.md and the approved R8–R11 boards are the visual
sources. Use RegistrationPage, the shared header and type roles, AppTextInput,
NamespaceSheet, TextAction, CopyAction, status badges, safe footers,
SkeletonLoader, TransactionResult and VerusIdReadyCard. Keep the payment engine's
approval tokens and saved-transaction retries. The owner excludes device runs
from this implementation task.

- [x] Read the full spec, design contract, typography and VerusID plan. Inspect
  the named board images before building their surfaces.
- [x] Create `claude/new-verusid-flow` from local `claude/night4-fixes` at
  `7b089908`. Keep this JS-only. Add no dependency, native or lockfile changes.
- [x] Build Name, Referral, conditional Pay from, Check details for a new
  registration, and Recovery.
  Keep the growing namespace field, conditional network picker, two-currency
  prices, field-local lookup errors, external-control warnings and compact
  keyboard price/funds state. Keep saved jobs resumable.
- [x] Keep both payment holds bound to their shown quote. Reconcile and prepare
  the second payment in place. Check every currency for the fixed payer before
  enabling or approving it. Retain changed-price consent and exact-byte retry.
- [x] Build waiting, slow, ready, changed, shortfall, delivery, unconfirmed,
  name-taken and connection states. Keep engine deletion classifications and
  use the app confirmation sheet. Remove the separate Registrations and
  registration-payment review routes. Keep the unpaid Check details route.
- [x] Build Home stage cards, ready-card celebration/dismissal, tab groups with
  counts and 32-point actions, and the shared created/provisioned Link sheet.
  Preserve the + > Link VerusID list. Close returns to the originating tab.
- [x] Use the actual VerusID name in registration authority facts and the
  VerusID page's self-authority facts.
- [x] Run the required checks. Keep payment-safety assertions intact. Update
  only the approved copy, grouping and navigation expectations.
- [x] Owner decision, 2026-11-06: saved unpaid jobs keep their stored intent.
  Their Check details summary has no Change actions. Keep Delete registration
  in the info sheet, with the unpaid confirmation. A changed quote shows its
  new price and requires a new hold. Add no draft-update engine mutation.
- [ ] Separate device QA: iOS normal/SE and Android normal/360×640, both
  themes, keyboard open/closed, Back, reload, interruption and accessibility.
- [ ] Separate live VRSCTEST QA: both holds, changed quote, every-currency
  shortfall/top-up, saved restart, delivery retry, unconfirmed replacement,
  name taken, all permitted deletion kinds, created/provisioned Link and
  celebration persistence.

Evidence: code commits `7f5cf2a5`, `228d7477`, `610b7b49`, `c689e635`,
`5d9b90ef`, `e45dd3ac`.
Design passes for 39 canonical sources and 17 card materials. The changed-file
safe-area check passes for 27 files; the final explicit check passes for all
28 changed JS files. Babel and focused core/React/hook lint pass for those 28
files. Standard ESLint stops on the existing import-plugin
`ERR_PACKAGE_PATH_NOT_EXPORTED` before file checks. The Android development JS
bundle compiles to `/tmp/new-verusid-bundle/a.js` with 52 assets.

The existing registration/notification run has 395 passing tests, four baseline
assertion failures and two baseline native-mock load errors. No payment-safety
assertion was changed. Five protected engine source spans match the base byte
for byte. Temporary non-Jest checks cover 13 public-component
flows, 11 public-read checks, eight funding checks and three Link-sheet flows.
Twenty-six source-derived light/dark renders were inspected at normal and
compact sizes. Native controls, scroll measurements, keyboard geometry and
platform accessibility are substituted in those renders. They are not device
or on-chain evidence. No runtime server remains running.


### ID-3.REG-R11-QA — Android New VerusID fixes (2026-11-06)

Contract: operate mode. Keep the approved New VerusID spec, R11 funds board,
RegistrationPage, outline fields, status badges, safe footer, information sheets
and existing typography roles. Inspect all named Android finding screenshots.
Change only the eight reported findings. Device runs are excluded by the owner.

- [x] Keep You have at its natural width. Wrap the amount and badge in their
  own column. Preserve the two-currency balance and badge layout (finding 1).
- [x] Keep the focused Name input below the header when its whole field group
  cannot fit above the compact keyboard footer (finding 2).
- [x] Default to Someone else when No referral is unaffordable. Never select
  a disabled referral card. Keep No referral when affordable (finding 3).
- [x] Remove the compact funds footer from Recovery. Measure both authority
  fields and the warning together. Reveal the warning while the focused input
  can stay visible. Preserve each field's own focus and blur (finding 4).
- [x] Use normal text for Linked VerusID. Keep only the shortened payment
  address in monospace (finding 5).
- [x] Use identityLabel and the resolved referral for Check details, as the
  split legend does (finding 6).
- [x] Remove the shortage footer's extra Try again. Reuse prepareSecond every
  20 seconds and on foreground while focused and short. Check every currency
  on the fixed payer. Keep both payment approvals behind holds (finding 7).
- [x] Put copyable commitment/registration transaction rows before VerusID
  details on Progress and Result (finding 8).
- [x] Run design, changed-file safe-area, focused ESLint, existing registration
  suites, Android dev bundle and temporary non-Jest behavior checks.
- [ ] Separate device re-test: normal/360×640 Android, light/dark; Name keyboard,
  Recovery focus/warnings, one/two currencies, referral defaults, Back/reopen,
  transaction copies, fixed-payer top-up, foreground and blur. No automatic
  signing or broadcast may occur after a top-up.

Evidence: code commits 8bbde040 and 008ef42e. Design passes for 39
canonical sources and 17 materials. Safe-area passes for all six changed JS
files. Focused core/React/hooks ESLint reports zero errors on base and candidate.
Standard ESLint still stops before file analysis on the existing import-plugin
ERR_PACKAGE_PATH_NOT_EXPORTED error. The existing registration/notification run
is unchanged from d0d614b2 and the prior report: 395 pass, four assertion failures
and two native-mock suite-load errors. No test source or expectation changed.
The Android development bundle passes with 52 assets.

Twenty-two controlled component checks and six scroll geometry cases pass.
The base reproduces all eight findings in temporary non-Jest checks. Twenty
source-derived renders were inspected at 360×640 and 412×923, in both themes,
with the bundled Inter fonts. They verify presentation only. Native controls,
keyboard measurements, accessibility and live funds arrivals remain device
checks. No simulator, emulator, native/dependency/lockfile edit, engine edit,
merge or push ran. The other worktree and its Metro session were left untouched.
Artifacts and exact commands are in new-verusid-flow-fixes.local.md (local).

### ID-3.REG-R11-QA3 — Second-payment funds and Recovery warnings (2026-11-06)

Contract: operate mode. Limit changes to progress funds checks and Recovery.
Reuse RegistrationPage, RegistrationStatusPill, RegistrationTimeline,
AppTextInput, VerusIdFormField, the existing notice style and safe footer.
Keep Home, Name keyboard behavior, native shortage wording and payment consent.

- [x] Treat FUNDING_SPENT and STALE_CHAIN_CONTEXT during second-payment
  preparation or approval as screen-local Checking funds. Show the approved
  confirmation copy under Registration. Keep Hold to create off and Done for
  now. Leave saved Home metadata and signed-payment errors unchanged.
- [x] Recheck every 20 seconds and on foreground with the existing focus,
  app-state, operation and prompt guards. Recheck after same-stage re-entry.
  Recover to shortage or Ready; payment still needs a new hold.
- [x] Put each authority warning under its own helper inside that field's
  measured group. Put matching-authority warnings under Recovery only.
- [x] Run design, safe-area, focused lint, existing suites, Android dev bundle,
  controlled components, scroll geometry and source-derived visual review.
- [ ] Device owner: repeat the wallet-Send race and both Recovery focus paths
  on Android 360x640 and 412x923, light/dark. Verify confirmation, no automatic
  payment, foreground/blur, pull refresh, Back/re-entry and warning visibility.

Evidence: 38 temporary non-Jest component cases pass; 14 fail on 994c774d.
Nine worked scroll-geometry cases pass with substituted measurements. Twenty
source-derived renders were inspected in both themes and sizes. These are not
native keyboard, accessibility or on-chain evidence. Design and safe-area pass;
focused core/React/hooks lint has zero errors on base and candidate. Standard
ESLint retains its import-plugin ERR_PACKAGE_PATH_NOT_EXPORTED blocker.
Existing suites retain 395 passes, four assertion failures and two native-mock
load errors. The Android dev bundle passes with 52 assets. No tests were added.
Exact commands, temporary harness configuration and device steps are in the
untracked new-verusid-flow-fixes3.local.md report.

### ID-3.REG-R11-QA5 — Compact payer rows and passive funds poll (2026-11-07)

Contract: operate mode. Limit changes to registration payer values, initial
progress count and the second-payment funds poll. Reuse Send's SourceCardSheet
value/valueLabel layout, SelectionRow, RegistrationPage and the existing
background AbortController/version/foreground-wait guards. Keep all payment
approval gates. Android QA follows orchestrator review.

- [x] Show only the price-currency payer balance. Preserve hidden/checking/error
  states, retry, every-currency funding checks and accessible shortfall copy.
- [x] Count Referral before the name result unless the selected namespace has
  a known no-referral policy. Use the name result when it arrives.
- [x] Run passive funds reads without busy. Cancel and await them before a
  foreground action. Rebuild a funded review in the normal busy state, then
  require a fresh hold. Preserve funds_changing and the existing poll triggers.
- [x] Inspect RegistrationHero and its styles. No fixed/minimum text height,
  font-size adjustment or compact-window rule explains the reported gap.
  Leave the hero unchanged, as requested when no source cause is found.
- [x] Run design, safe-area, Babel, focused lint and controlled component checks.
  Inspect source-derived payer rows against Send in light/dark at 360/412 dp.
- [x] Orchestrator: review this candidate, then run normal/small Android QA.
  Check payer wrapping and accessibility, stable Name progress, slow-poll
  navigation/refresh, top-up/re-entry and a new hold. Reinspect the dark 360 dp
  hero gap. Source-derived renders do not prove native text measurement.
  Done 2026-11-07 (Android round 5: 17 of 18 fixes verified). The hero gap
  is fixed in ID-3.REG-R11-UPSTREAM. Accessibility was not run on a device.

Evidence: 17 temporary non-Jest checks pass; nine fail on 9bdb2f8f. Babel and
focused core/React/hooks lint pass for five changed JS files. Design and
safe-area checks pass. Standard ESLint cannot load its existing import plugin
(ERR_PACKAGE_PATH_NOT_EXPORTED). Twelve source-derived payer states were
inspected. No device, live-chain operation, dependency change, push or merge
ran. Exact commands and gaps are in new-verusid-flow-fixes5.local.md (local).

### ID-3.REG-R11-UPSTREAM — Upstream sync, hero fix and full Android run (2026-11-09)

Contract: operate mode. The engine and backend follow upstream
`identity-registration` `64166d35`. The redesigned screens stay and show the new
upstream facts. The hero amount reuses the Send amount pattern: one line that
shrinks to fit.

- [x] Merge redesign `0f10dad8` and the five upstream commits after `0a99f88a`
  (`ecaa7107`, `30df713e`). Show the Foundation default referral as the first
  Referral row for VRSC and VRSCTEST root names.
- [x] Find the cause of the dark 360 dp hero gap. A view dump showed the
  "80 USD" view at 72 dp (two lines) while it drew one line. The root-name
  amount measured 36 dp.
- [x] Set `adjustsFontSizeToFit`, `minimumFontScale={0.6}` and
  `numberOfLines={1}` on the hero amount (`b301373c`). Small phone after the
  fix: amount 36 dp, fee line 8 dp below it, text about 3% smaller.
- [x] Run one full creation on each Android phone: `nvfpixg1109@` (normal,
  light) and `nvfsmlg1109@` (small, dark). Both paid 20 VRSCTEST to the
  Foundation referral on chain and linked the new VerusID.
- [x] Merge into local `redesign`. Not pushed.
- [x] Device-check app-encryption requests and the private-address removal
  warning (large Android, 2026-11-09). The request simulator now uses the app's
  Verus library pins. Findings fixed in ID-3.REG-R11-APPENC.

Evidence: Android, Game PC, JS from Mac Metro 8241. Full run 2 min 34 s (normal)
and 3 min 23 s (small) from the first hold to "VerusID created". Design and
safe-area checks pass on `redesign` after the merge. Open P3s, left as is: the
testnet Foundation name shows ".VRSCTEST" outside the Referral row, the result
page behind the linked sheet still says "It is not in this wallet yet.", the
small-phone Foundation row wraps, and the first tap after the keyboard closes
was lost once per phone. After the fix, the root-name Check details matches the screens from before the fix on both phones: amount 36 dp, same text size, same 24 dp gap to Commitment. Run folders:
`docs/qa/matrix/runs/2026-11-06-newflow/` (local, not in Git).

### ID-3.REG-R11-APPENC — App-encryption and private-address review fixes (2026-11-09)

Contract: operate mode. Touched scope: the identity-update private-address
content row, high-risk step, details sheet and acknowledgement sheet; the
app-encryption review; the shared GenericRequest completion step. Exemplars:
`IdentityStateChangeCard` (Current / After update) and `InfoSheetRow` with
`CopyAction`. No new visual pattern.

- [x] P2: show the current and the new private (Z) address. All three
  surfaces show "Current" and "After update". Addresses use the identifier
  style and CopyAction. "No private address" is body text. Removal, change and
  add are typed as `highRiskType: 'private-address'` (`aac3f80e`).
- [x] P3: the high-risk step says "Removed", "Replaced" or "Added". The details
  sheet states the warning once, with no "Change" or "Value" row.
- [x] P3: keep the chosen VerusID after approve. Cause: the legacy React Native
  renderer does not batch state updates after an await, so `next()` published
  the response and the completion count separately and the completion effect
  processed the same detail again. `next()` now batches the updates. This also
  covers sign-in, data and spending-key requests. Approval guards unchanged.
- [x] P3: name the nested VerusID and secondary key number once on the main
  app-encryption review, with or without the spending key.
- [x] Small phone: the acknowledgement sheet shows each address as the first 10
  characters, "…", and the last 8, with the full address as the copy value
  (`fc8f1bc1`). Android ignores `ellipsizeMode` on selectable text
  (`c00d9079` did not render).

Evidence: Android, Game PC, JS from Mac Metro 8241 on
`claude/appenc-review-fixes`. 11 of 11 links pass on large light and small dark
phones; 0 of 123 recorded frames show the "Opening request" loader; the
simulator verified that the chosen VerusID signed each reply. Acknowledgement
re-check 4 of 4 after `fc8f1bc1`; copy returns the full 78-character address.
Identity updates were not approved. Left as is: the "as …" VerusID wraps after
the dot while its chevron shows, and "Transaction fee —" shows before a payment
source. Not tested: iPhone, TalkBack, approving an identity update. Run folder:
`docs/qa/matrix/runs/2026-11-09-appenc/` (local, not in Git).

### ID-3.NIGHT4-QA — Android device QA of the night 4 fixes (2026-11-06)

Branch `claude/night4-fixes` (A/B/C on `2e4c6e77`, then round 2 `7b089908`).
Android only, by owner instruction: Game PC normal (412x923 dp, light) and small
(360x640 dp, dark), installed APK `ff2e63e0`, JS from Mac Metro. No iOS run.

Round 1 failed six items: old registration rows still "Network fee", no
Confirmations row, slow Pending-to-date (87–108 s), a false "Name commitment is
not confirmed on the current active chain." during the wait, the long-link sheet
needing two taps, and "Response sent" closing in under 1 s. Round 2 (`7b089908`)
fixes them: a zero-value i-address output with a cost of 0.01 or more marks an
older registration, confirmations come from the block height, history refreshes
every 15 s (10 s read limit), a tip/height mismatch keeps waiting (a script
mismatch still stops), a refused link shows one sheet and the link listener is
removed on unmount, "Response sent" stays open until Done, content counts values,
and a mixed-network request says "This request mixes testnet and mainnet."

Round 2 passes on both phones: registration labels (3 rows each), Response sent +
Done + Back with the reply received first, content count 4 = 4, one long-link
sheet with one tap (logcat: one delivery), mixed-network wording, sign-in
regression, and on normal a full `aaa` wait with no false commitment error.
Open P3: the Confirmations number is as of the last history read (1–3 blocks
behind, it does not rise while no row is pending); Pending-to-date took 30–45 s
after the first block on normal; the commitment screen can flap Ready → waiting →
Ready once when public servers disagree. Old commitment rows stay "Network fee"
(the server sends no output functions). Not run: redirect delivery, refresh timing
on small (daemon funding), iOS. Run folder: `docs/qa/matrix/runs/2026-11-06-fixes4/`
(local, not in Git).


### GR-4.IDU-PARITY-P2 — Identity update review parity (2026-11-12)

Status: **Ready for verification**. Branch `claude/idu-parity-fixes-1112`,
base `b7f7e630`. Behavioral reference: upstream `dev-asf-parent` `f32e7fb95`.

Design contract: operate mode. Scope is content review, the prepared-identity
recap, and refusal messages. Canonical exemplars are the existing GenericRequest
content cards, Confirm step, information-sheet rows, and completion sheets.
Reuse `InfoSheetSection`, `InfoSheetRow`, `CopyAction`, and theme typography.
Keep the request card, filters, step order, footer, and inline/sheet errors.
Required states are unrecognized data, full ordinary content, opaque/encrypted
warnings, removal with current/empty keys, prepared identity, permanent refusal,
and recoverable transport failure. No new visual pattern. Device rendering is
deferred by the task instruction.

- [x] **P2-A** Show unrecognized removal-key data, its recorded-bytes notice,
  and reachable raw data. Do not count it as an addition or removal.
- [x] **P2-B** Show each ordinary value through the same complete review used
  for uploads, with `isUpload=false`. Retain all fields and warnings. Escape
  control/bidi characters in previews and raw-sheet text. Copy keeps original data.
- [x] **P2-C** Show identity address, required signatures, primary addresses,
  revocation authority, and recovery authority from `preparedUpdate.built.identity`.
  Show this recap only while its fee preparation is current.
- [x] **P2-D** Code expired/wrong-network and authored permanent refusals.
  Show their reason without retry. A network height that cannot be read remains
  retryable and now has a specific message. Keep transport failures retryable.
- [x] **P2-E** Keep `removalUi` on removal entries. Show its detail, effect,
  empty-state, metadata, and history notes. Show full matching hashes with copy.
- [x] **P2-F** Show the local response-URL refusal message without Try again.
  Transport failures with a cause retain their recovery path.
- [x] Run static design, safe-area, parser, iOS bundle and existing regression
  checks. Separate the two baseline suite-load failures from product changes.
- [x] Prepare disposable VRSCTEST QA links locally. Check request roundtrips,
  signatures and the ordinary-content review model. Do not open the links.
- [x] Review corrections: retain clear-all entry lookup and inspector; show notes
  and decoded removal data once per operation. Deduplicate empty-target copy.
- [x] Classify synchronous SDK partial/upload validation refusals at the handler
  boundary. Validate a separate copy; keep network and builder failures retryable.
- [x] Mirror the SDK request-envelope checks (flags, expiry height, system, txid)
  in the same preflight, so an unsupported flag shows its reason without retry.
- [x] Keep original field copy values. Disable native selection for escaped
  review and raw-inspector text; keep displayed Unicode escapes.
- [x] Run device QA at normal/compact sizes in light/dark. Check long fields,
  copy/raw sheets, Back, source reselection/loading and refusal actions.
  Accessibility (VoiceOver, TalkBack) stays open.
- [x] Confirm wrong-network entry through the intended handler path with a
  controlled chain response (debugger fixture). A signed VRSC-detail link shows
  "Request expired" (mainnet height), the same order of checks as upstream.
- [x] Check local URL refusal without broadcasting: shared sheet with an `ftp://`
  sign-in request. The identity-update completion path itself stays untested.

Evidence is static only. Existing regression group: 4 suites pass, 2 fail to load,
52 tests pass on both base and candidate. Failures: `identityContentReviewScreen`
(SVG `Touchable.Mixin` mock) and `genericRequestDelivery` (`constants.js:160`,
missing React Native mock). Handler/removal group: 2 suites and 30 tests pass.
Temporary component/model checks cover complete ordinary values and warnings,
escaping, included data, removal actions 1-3 with present/empty keys, full hashes,
expiry/network/refusal retry policy, and both delivery message helpers.

The transaction builder, funding, signing, broadcast and response bytes are
unchanged. Preserve zero-delta token support, mempool-aware funding,
delegated-signer wallet switching, and early upload refusal. The review follow-up
only deduplicates the empty-target P3 copy. Full named-key display stays out of scope.

### IDU removal-card polish (2026-11-12)

- [x] Separate removal notes with `theme.spacing.sm`. Keep existing body type.
- [x] Hide decoded removal hash/key rows only when the exact value is already
  shown on the card. Keep action, version, unknown fields and unmatched keys.
- [x] Keep Public and Included data badges at intrinsic width with
  `theme.spacing.xs` between them. Included data repeats the title/notice;
  retain it under the task's explicit instruction.
- [x] Design and changed-file safe-area checks pass. Production iOS bundle
  passes in `/tmp/idu-polish-bundle.fYUmNy`. Temporary non-Jest row checks pass
  for matching/different values, missing full keys, retained action/version,
  unknown/nested fields and unchanged input data.
- [ ] Recheck rendered normal/compact light/dark states. No simulator or Metro
  was used under the task instruction. Supplied case 1, 3 and 4 screenshots
  establish the defects before this polish; they do not verify the new layout.


### Header actions and dark checkbox contrast (2026-11-12)

- [x] Use textPrimary for the named top-right header actions. Keep glyphs,
  sizes, busy guards and opacity behavior. Audit other header actions.
- [x] Share the 16-point stack action inset. Replace the default eye's internal
  padding with a centered 44-point target to avoid doubled padding.
- [x] Mirror ProgressHeader action and Back offsets. Registration's 88-point
  info/close group stays end-aligned inside the action slot.
- [x] Align ServiceManagerHeader action-row targets at 16 points on both sides.
  Keep its children at their existing 20-point content inset.
- [x] Use the onboarding theme's isDark flag in both checkbox glyphs. Only
  unchecked dark outlines change to textPrimary. Update the design contract.
- [x] Run design, changed-file safe-area, parser and whitespace checks.
- [ ] Separate tester: verify iOS/Android normal/compact, light/dark headers,
  registration with/without info, and checked/unchecked/busy selection rows.

Evidence: source geometry and static checks only. Custom stack Back replaces
React Navigation's platform-specific default Back margins. Insets are relative
to the safe screen edge. Actual glyph ink bounds and registration title fit
need device QA. No simulator, Metro server, merge or push ran.

### ID-3.REG-FUNDS — Name meter cards and Add VerusID (2026-11-13)

Contract: operate mode. The approved R15 normal/SE/small-Android boards and
R13 Add empty state control this scope. Reuse RegistrationPage, theme type
roles, SkeletonLoader, EmptyState and VerusIdOptionsSheet. Keep payment and
name-availability gates. Do not run devices, push or merge in this task.

- [x] Replace Name funds with one meter card per paid currency. Keep fiat only
  when its display rate exists, hidden/checking balances and balance retry.
- [x] Remove the Name referral-price line. For referral-only funding, show the
  affordable referral quote and a payer that covers every currency. Keep the
  next-step note. Keep compact keyboard amount rows without the referral line.
- [x] Reuse the registration flow's window-height cutoff of 667 for compact
  cards and the smaller gap above them. Keep both themes on semantic colors.
- [x] Confirm namespace-policy pricing in registrationReads and the pinned
  SDK's quoteIdentityRegistration. Retain display-only quotes across name
  edits in the same network/namespace/source/session context. Keep Continue
  bound to the fresh name result. Replace only Name's generic loading bars
  with matching card skeletons. Other RegistrationSkeleton users stay intact.
- [x] Change the empty state to No VerusID yet and Add VerusID. Open the same
  options sheet as the header +. Leave the sheet and header lines unchanged.
- [x] Run design, changed-file safe-area, Babel and controlled component checks.
  Inspect source-derived card renders at 390x844, 375x667 and 360x640 in both
  themes, including loaded, short, partial, loading, hidden and error states.
- [ ] Separate device QA: check native layout, keyboard footer, screen reader,
  Back/retry, both themes and all three sizes. No device ran in this task.

Evidence: design and safe-area checks pass. Babel parses all five changed JS
files. Sixteen temporary non-Jest checks pass: ten card/fiat cases, five name
flow cases and the empty-state action. All 36 source-derived renders have no
horizontal overflow. Loaded and skeleton card heights match at all sizes in
both themes. Native views, layout and network reads are substituted in these
checks. Source-derived renders do not establish native or live-chain behavior.
The shared dependencies match this checkout's lockfile. pnpm's pre-run install
check is disabled for validation to preserve that dependency folder. Temporary
scripts and artifacts are in /tmp/verusid-funds-cards-0df73768.

### ID-3.REG-KEYBOARD-CARDS — Keep Name cards while typing (2026-11-13)

- [x] Keep Name meter cards in scroll content with the keyboard open. Remove
  only Name's compact footer funds. Keep other steps' compact footer content.
- [x] Reuse SheetScrollView measurements and ScrollEdgeFade from
  FadedScrollView. Use the page background and omit the keyboard chevron.
  Keep the normal measured sheet cue when the keyboard is closed.
- [x] Preserve focus-group measurement, keyboard padding and footer spacing.
  Keep the keyboard open during Name scrolling; other steps keep on-drag dismissal.
- [ ] Separate device QA: normal/SE/small Android, both themes, keyboard open,
  name/status visibility, card scrolling, end-of-content fade and footer bounds.

Evidence: source inspection only for native keyboard geometry. No simulator
runs in this implementation task. Design, changed-file safe-area, Babel parsing and whitespace checks pass.
The safe-area command used --config.verifyDepsBeforeRun=false after pnpm
automatic postinstall failed on the existing navigation patch.


### TX-1.RECEIVE-IMPACT-ROW — Receive block and invoice presets (2026-11-13)

- Scope: percent-only Price impact across the current wizard and invoice pay,
  option B Amount receive block, and option A request slippage presets.
  Legacy `SendModal/ConvertOrCrossChainSend` stays unchanged.
- Money source: `state.ledger.rates[fiatChannel][target.coinId || target.id]`
  in the selected display currency. `fiatChannel` comes from the source card's
  `API_GET_FIATPRICE` (the general channel for these VRPC conversions). The
  on-chain price pipeline converts its USD anchor with cached fiat exchange
  rates before writing the ledger. No source-price or small-trade-ratio fallback.
- Name handling: one line with `ellipsizeMode="middle"` so Android supports the
  middle ellipsis. The amount does not shrink. The accessible name stays full.
- Static compact geometry: the typical 375x667 iPhone SE state totals about
  647 points including its 20-point top safe area, fiat toggle and keypad.
  This is a source calculation, not a native measurement. Large text, long
  amounts, errors and private pending captions still need device QA.
- Validation: `corepack pnpm check:design` passes 39 canonical sources and 17
  card materials (minimum contrast 5.014:1). `corepack pnpm check:safe-areas
  --changed` passes (0 files after the implementation commits). An explicit
  check of all 14 changed JavaScript files passes. Babel parses all 14 files.
  `git diff --check` passes. The percent less/more grep finds only the allowed
  re-quote warning and one old formatter comment; no other visible label remains.
- Temporary Node component fixtures pass empty/estimate/loading/pre-launch
  receive states in light and dark themes, intact displayed amounts, full
  accessible names, neutral Details, and no absent money line. Sheet fixtures
  pass preset selection, invalid custom values, decimal comma, deferred apply,
  conversions off, and cancel/reopen. Invoice 0.5/1/2/3 percent round-trips with
  real invoice classes to 500000/1000000/2000000/3000000, with bytes equal to
  the base generator. Default is 0.5%; conversions off omits slippage.
- No Jest tests added. No simulator, device, native visual review, live-rate
  request, signing, broadcast, merge or push. No temporary runtime remains.

### TX-1.CONFIRM-TOTAL — Export total at the slide (2026-11-13)

- Scope: `SendWizardConfirm` for VRPC exports (cross-chain sends and
  conversions), the fee notice for every conversion and export, the receive
  money source for Amount and Confirm, and compact Confirm nodes on small
  windows. One-network conversions keep "Fees" and get no pinned Total.
- Receive money: `useReceivedPrice` reads the ledger first. For a target that
  is not a wallet asset it calls `getCoinRates`, the ledger's own source, once
  per coin (60-second cache). A direct call returned USD 1 for mainnet
  DAI.vETH from `api.verus.services`. Testnet targets have no price, so the
  device run could not show this line.
- Notice rule: `sourceFees > displayAmount` in the paid currency, not for
  invoices. Text: "The fees are higher than the amount."
- Validation: `check:design` and `check:safe-areas --changed` pass. Babel
  parses all changed files. Money math matches the approved mockup numbers.
  Temporary Jest fixtures (not committed) passed for the rows, the pinned
  Total states, the compact nodes and the price hook. ESLint does not start
  in this checkout (plugin load error), so it did not run.
- Open: Android normal and small; iPhone SE high-fee state scrolls 22.5
  points; the receive money value on a real mainnet conversion.

### ID-2.ABOUT — About VerusID text and facts (2026-11-16)

- [x] Replace the About VerusID text with option E: three facts with marks,
  then four fold-out topics. Remove the subtitle. Name no specific VerusID.
- [x] Record the sheet in DESIGN.md, with the mark as an exception for this
  sheet only.
- [ ] "Connected apps" describes the app authorization request, which is not
  in the wallet yet. Check the text again when that request lands.
- [ ] Device QA: Android normal and small, iPhone SE.

Evidence: iOS simulator (iPhone 17 Pro class, iOS 26.5, disposable VRSCTEST
wallet), light and dark: the sheet as it opens and with one topic open. All
text matches, nothing clips, Done closes the sheet. Design, changed-file
safe-area, Babel parsing and whitespace checks pass. Not checked: scrolling
(the content fits on this screen), iPhone SE, Android.
