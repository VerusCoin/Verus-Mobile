# AGENTS.md

This file is a compact map for Codex-style agents working in Verus Mobile. Keep it short. Put durable product, architecture, design, and execution details in focused docs instead of expanding this file into a manual.

## Repository Shape

- Product: React Native iOS/Android Verus Mobile multi-currency wallet.
- Runtime: React Native 0.77, React 18, Redux, Redux Saga, React Navigation, React Native Paper.
- Entry points: `App.js`, `index.js`, `src/VerusMobile.js`.
- Main navigation: `src/containers/RootStack`.
- Wallet home: `src/containers/Home`.
- Coin drill-in: `src/containers/Coin`.
- Coin data and PBaaS metadata: `src/utils/CoinData`, `src/utils/defaultSubWallets.js`, `src/utils/constants/intervalConstants.js`.
- Ledger state: `src/reducers/ledger.js`, selectors in `src/selectors`.
- Channel-specific side effects: `src/sagas/channels`.
- Tests and mocks: `src/tests`, `src/utils/__tests__`, `__mocks__`.

## Mandatory Design Gate

- Before proposing or writing any new or intentionally redesigned user-visible UI, read `DESIGN.md` in full. Untouched legacy screens are not visual precedent and do not need migration unless the task says so.
- Before implementation, state the task's small design contract: touched scope, canonical exemplar, shared primitives, required rendered states, and any deliberate deviation. Do not average several old screens into a new pattern.
- Reuse the component or primitive named by `DESIGN.md`. If exact reuse is impossible, match the canonical source and rendered measurements before varying it.
- Validate redesigned UI against the canonical exemplar in light and dark mode and at relevant normal and compact sizes. Run `corepack pnpm check:design` plus the narrowest relevant UI checks.

## Working Rules

- When creating agent-run QA reports, investigation logs, or other working notes that the user did not explicitly request as repository documentation, use a `*.local.md` filename. Keep these files local and never stage or commit them.
- Read the relevant container, selector, reducer, and utility before editing behavior.
- Do not guess wallet, transaction, address, PBaaS, VerusID, or key-management data shapes. Trace them from reducers, selectors, `CoinDirectory`, and channel handlers.
- Treat private keys, seeds, addresses, identity records, balances, transactions, and QR/deeplink payloads as sensitive. Designated disposable test-only credentials may be used for QA under the exception below.
- Preserve existing Redux action and interval-channel contracts unless the task explicitly changes them.
- For legacy-only maintenance, preserve the existing React Native Paper, React Navigation, shared `Styles`, and `src/globals/colors.js` patterns. For new or intentionally redesigned UI, follow `DESIGN.md` and its semantic theme and canonical-component routes.
- For reusable UI primitives or repeated screen patterns, prefer focused style modules under `src/styles/components/*.styles.js` exported from `src/styles/index.js`; keep one-off screen layout styles local with `StyleSheet.create`.
- For new or intentionally redesigned titles, follow `TYPOGRAPHY.md` and consume `theme.typography` roles instead of recreating font size, weight, line height, or tracking locally. Keep 700 weight for deliberate data, amount, count, status, or compact action emphasis.
- For reachable search UI, use `AppSearchField` for editable filtering and `AppSearchLauncher` for navigation; do not hand-roll search shells.
- For new or redesigned screens, use `react-native-safe-area-context`, prefer normal-flow safe footers such as `SafeBottomActionStack` for bottom actions, and avoid hardcoded absolute bottom controls against the physical screen edge.
- For copy affordances in redesigned request-review, bottom-sheet, and transaction-result surfaces, use `src/components/CopyAction.js`; do not hand-roll local copy icons, copied timers, or alert popups.
- For skeleton loading in redesigned data-fetching surfaces, use `src/components/SkeletonLoader.js`; do not pair skeletons with spinners for the same content.
- For redesigned signed-out onboarding/login UI, follow `DESIGN.md`, `src/theme/onboarding`, and `src/styles/components/signedOutFlow.styles.js`. Treat untouched legacy surfaces as outside that scope unless the task explicitly migrates them.
- For iPhone SE onboarding layout, use `useOnboardingSmallDeviceLayout` and the compact roles in `signedOutFlow.styles.js`. Do not apply compact onboarding layout to large screens just because the software keyboard is visible, and do not change shared small-device top padding or heading spacing on input focus.
- Keep UI changes scoped. Avoid unrelated refactors while touching wallet flows.
- Run the Jest suites that cover the code you change (`corepack pnpm test <path>`) and report failures. Do not change or remove a test to make it pass without stating why. Add a new Jest test only when the user asks or when a defect fix needs one to reproduce the defect. The live-network suites in `src/utils/__tests__/int` and `src/utils/__tests__/api` call real services and can fail on rate limits; judge them apart from the unit suites. Jest does not replace parser, bundle, safe-area, and simulator or visual checks for UI work.
- Do not run destructive git commands. Work on a task branch and leave unrelated changes alone.

## Common Commands

- Install: `corepack pnpm install`
- Metro: `corepack pnpm start`
- Test: `corepack pnpm test`
- Lint: `corepack pnpm lint`
- Android: `corepack pnpm android`
- iOS: `corepack pnpm ios`
- Android debug build: `corepack pnpm debug-android`
- iOS bundle: `corepack pnpm bundle-ios`
- Safe-area check: `corepack pnpm check:safe-areas <files>` or `corepack pnpm check:safe-areas --changed`
- Design-contract check: `corepack pnpm check:design`

## Wallet Home Map

The home portfolio is driven by:

- `state.coins.activeCoinsForUser`
- `state.coinMenus.allSubWallets`
- `state.coinMenus.activeSubWallets`
- `state.ledger.balances`
- `state.ledger.rates`
- `state.widgets.order`

Important files:

- `src/containers/Home/Home.js`: refreshes balances/rates/info and opens coins.
- `src/containers/Home/Home.render.js`: renders the widget board.
- `src/containers/Home/HomeWidgets/CurrencyWidget.js`: per-coin portfolio card.
- `src/containers/Home/HomeWidgets/TotalUniBalanceWidget.js`: total fiat balance.
- `src/utils/subwallet/extractSubWallets.js`: filters displayable subwallets.

Current open-coin flow:

1. Pick a coin widget.
2. Set `activeCoin`.
3. Set or request `activeSubWallet`.
4. Set active app/section from the coin's default wallet app.
5. Reset navigation to `CoinMenus`.

## Coin Detail Map

Coin drill-in is split by responsibility:

- `src/containers/Coin/CoinMenus.js`: tab router and compatible subwallet checks.
- `src/containers/Coin/DynamicHeader.js`: active coin totals and subwallet card carousel.
- `src/containers/Coin/Overview/Overview.js`: transaction list and transaction detail modal.
- `src/containers/Coin/SendCoin/SendCoin.js`: send entry point.
- `src/containers/Coin/ReceiveCoin/ReceiveCoin.js`: receive/address entry point.
- `src/containers/Coin/ConvertCoin/ConvertCoin.js`: conversion entry point.
- `src/containers/Coin/ManageCoin`: deposit and withdraw flows.
- `src/containers/SubWalletSelect/SubWalletSelectorModal.js`: card picker.

For PBaaS and Verus currencies, keep the active coin and active subwallet explicit. The selected subwallet determines API channels for balances, info, addresses, transactions, fiat price, send, and keys.

## Agent-Friendly Change Loop

1. Map the current flow from code before editing.
2. Name the data contract being changed.
3. Implement the smallest coherent change.
4. Validate with the narrowest checks that cover the change: the related Jest suites, the check scripts, and a bundle build.
5. For UI work, validate with a simulator or visual artifact before calling it done.
6. If a repeated agent mistake appears, encode it in a focused doc or test rather than adding broad prose here.

## Design Direction Notes

- Wallet home should make total portfolio value, active coins, card counts, PBaaS status, mapped/bridge status, and recent transaction state scannable.
- Coin detail should make subwallet cards first-class. Each card should expose balance, status, network/system, address groups, and compatible actions.
- Transactions should remain visible from the coin overview but should be filterable by card/channel when that distinction matters.
- Receive/address views should show addresses as copyable, labeled records tied to the active card and channel.

## Harness Notes

This file follows the harness-engineering idea of a small agent entry point that points to repo-local sources of truth. Do not put long-lived architectural history here. Create or update focused docs when a decision needs to be discoverable later.
