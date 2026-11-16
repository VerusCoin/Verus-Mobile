# Redesign review guide

This guide is for the review of the UI redesign pull request into `ui-redesign`. It says what the PR is, what changes for the user in each area, where the code is, and how the work was checked. Two companion files hold the detail:

- [LOGIC_CHANGES.md](LOGIC_CHANGES.md): every change outside pure UI, with code locations.
- [DIFFERENCES_FROM_UPSTREAM.md](DIFFERENCES_FROM_UPSTREAM.md): every place where the PR replaces recent upstream work on purpose, the changed tests, and the Jest status.

## 1. Summary

### What the PR is

- A new UI for the whole app: signed out, Home, asset detail, Receive, Send and Convert, requests, VerusID, Services, Scan and Settings.
- One design system: semantic light and dark theme, Inter typography, shared components, bottom sheets, safe-area footers. The rules are in [`DESIGN.md`](../../DESIGN.md) and [`TYPOGRAPHY.md`](../../TYPOGRAPHY.md); `pnpm check:design` enforces part of them.
- The logic changes the new screens need, and fixes found while testing them. They are listed one by one in [LOGIC_CHANGES.md](LOGIC_CHANGES.md).
- Size: 869 files, about +128,000 / -24,000 lines against `upstream/ui-redesign` `525aa859`. About 178 merge commits on the first-parent line; each subject names one change.

### What the PR is not

- Not a rewrite of wallet logic. Key derivation, hashing, encryption algorithms, coin channels and the Redux store layout stay. Changes in those files are listed in [LOGIC_CHANGES.md](LOGIC_CHANGES.md).
- No version change: app version, build number, bundle id, signing, React Native 0.77.3, `VRPC_API_APP_ID` and the env values are the upstream values.
- No feature flag. The redesigned UI is the only path. Legacy screen files remain in the repository; nothing mounts them (list in [section 4](#4-known-gaps-and-risks)).
- Not green on Jest. 497 upstream tests that pass on the base do not pass on this branch, mostly because their mocks do not load the new screens. See [Jest status](DIFFERENCES_FROM_UPSTREAM.md#jest-status).

### How to review it, in order

1. Read "Read these first" in [LOGIC_CHANGES.md](LOGIC_CHANGES.md#read-these-first): ten changes on funds, signing and storage.
2. Read [DIFFERENCES_FROM_UPSTREAM.md](DIFFERENCES_FROM_UPSTREAM.md) so that no replaced upstream line looks like an accident.
3. Read the foundation: `App.js`, `src/theme/app/AppThemeProvider.js`, `src/theme/onboarding/tokens.js`, `src/containers/RootStack/`, then the shared components in [section 3](#3-architecture-notes).
4. Walk the areas in [section 2](#2-what-changes-for-the-user) in the app on a testnet profile (VRSCTEST), one area at a time.
5. Read native and build changes last ([LOGIC_CHANGES.md, native and build](LOGIC_CHANGES.md#native-and-build)).

Useful commands:

```sh
git diff --stat upstream/ui-redesign HEAD -- src/containers/<Area>
git log --merges --first-parent --format='%h %ad %s' --date=short upstream/ui-redesign..HEAD
git show <merge-hash>        # most merge bodies give the reason
```

## 2. What changes for the user

Each area follows the same order: what the user sees now, why it changed, main files, what did not change underneath, how to try it. "Reason not recorded" means no commit or design record states the problem with the old screen.

### 2.1 Signed out and onboarding

**Now.** Landing and Login show a muted background video. Login lists wallets with an avatar and sorts them by last opened; there is no "default wallet". A network caption (Mainnet or Testnet) under the title opens a picker, and the app remembers the last network. Unlock is a sheet with password or biometrics. "Other options" holds import, recovery and "Claim from NFC card". New wallet setup is a stepped flow with the step title in the header, an avatar picker, a backup check with word chips, and one setup screen that shows progress while keys and assets are prepared.

**Why.** "Claim from NFC card" returns: an earlier signed-out redesign had removed both upstream NFC entries, so a gift card on an NFC card could not be claimed with the app alone (iOS does not open `verus://` links from tags). Reason for removing the default wallet: not recorded.

**Main files.** `src/containers/Onboard/`, `src/containers/Login/components/ChooseWalletSheet.js`, `UnlockWalletSheet.js`, `OtherOptionsSheet.js`, `src/components/SignedOutNetworkSelector.js`, `WelcomeBackgroundVideo.js`, `src/components/WalletSetup/WalletSetupOverlay.js`, `src/hooks/useSignedOutNetwork.js`, `src/hooks/useOnboardingSmallDeviceLayout.js`, `src/styles/components/signedOutFlow.styles.js`.

**Not changed underneath.** Seed and key derivation, password storage, biometric storage. `createProfileFromSeed` keeps its write order; the duplicate-profile check runs earlier ([LOGIC_CHANGES.md](LOGIC_CHANGES.md#keys-signing-and-authentication), keys 12).

**Try it.** Sign out. Switch the network caption. Create a wallet on Testnet and go through the backup check. Lock and unlock with password and with biometrics.

| Login | Network picker | Unlock sheet | Other options |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/01-signed-out-login-light.png" width="200" alt="Login"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/02-signed-out-network-picker-light.png" width="200" alt="Network picker"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/03-signed-out-unlock-sheet-light.png" width="200" alt="Unlock sheet"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/04-signed-out-other-options-light.png" width="200" alt="Other options"> |

### 2.2 Home and portfolio

**Now.** The Wallet tab shows the total value, an optional value chart strip (closed by default; the open state is remembered), and one row per asset with balance, fiat value and card count. A header action hides balances; hidden amounts are blurred everywhere, also after a restart. Notices (VerusID registration progress, private wallet sync) are small cards above the list. A "ready" card celebrates a new VerusID once. "Manage assets" adds an asset by identifier, removes an asset at any balance, and offers found currencies without adding them by itself.

**Why.** The goal is to make total value, active assets, card counts and status scannable on one screen. The old Home was a widget board. Upstream had two separate modals for "Add PBaaS currency" and "Add ERC-20 token"; one identifier field replaces both.

**Main files.** `src/containers/Home/SignedInWalletHome.js`, `components/HomeValueChart.js`, `components/SignedInWalletSheets.js`, `HomeWidgets/HomeNotice.js`, `HomeWidgets/VerusIdReadyCard.js`, `src/containers/ManageAssets/`, `src/utils/assets/`, `src/utils/portfolioHistory/`, `src/components/PrivacyBlurredText.js`.

**Not changed underneath.** Balance, rate and info refresh still run through `Home.js` and the interval channels. Changed: VRPC pending balance and on-chain prices ([LOGIC_CHANGES.md](LOGIC_CHANGES.md#funds-and-fees), funds 3; network 2). Asset choices move to plain storage (storage 1).

**Try it.** Open Home on Testnet. Hide balances, restart, check the blur. Open the chart strip. Add an asset by identifier in Manage assets, then remove it.

| Top | Value chart open | Top, dark | End of asset list |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/05-home-top-light.png" width="200" alt="Top"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/06-home-chart-open-light.png" width="200" alt="Value chart open"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/09-home-top-dark.png" width="200" alt="Top, dark"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/07-home-asset-list-end-light.png" width="200" alt="End of asset list"> |

| Manage assets |
|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/08-home-manage-assets-light.png" width="200" alt="Manage assets"> |

### 2.3 Asset detail and transactions

**Now.** The asset screen has one top row (back, logo, name, total), a stack of address cards (main, VerusID, private) with up to three pinned cards and the last used card, icon actions (Receive, Send, Convert), and a transactions sheet that stays open under the cards. Each row opens a transaction details sheet (amount, fee, recipient, status, copy). A pending line shows unconfirmed funds. Bridged assets show their origin. Pre-conversions show in their own panel.

**Why.** The design goal is to make address cards first-class: each card shows balance, status and network, and the history follows the selected card. Upstream showed a carousel and a separate details modal (`TxDetailsModal`, now replaced by `TransactionDetailsSheet`).

**Main files.** `src/containers/Coin/SignedInCoinDetail.js`, `SignedInAssetHeader.js`, `AssetCardStack.js`, `CoinCardPickerSheet.js`, `Overview/Overview.js`, `Overview/TransactionDetailsSheet.js`, `BridgedOriginSheet.js`, `PrelaunchAssetPanel.js`, `src/utils/subwallet/`, `src/selectors/transactions.js`.

**Not changed underneath.** The active coin and active card stay explicit and still choose the API channels. Changed: history grouping and fee/recipient derivation for VRPC ([LOGIC_CHANGES.md](LOGIC_CHANGES.md#transaction-building-and-broadcast), broadcast 7), and `null` as the selected card after a card list rebuild ([DIFFERENCES_FROM_UPSTREAM.md](DIFFERENCES_FROM_UPSTREAM.md#decisions-by-the-design-owner)).

**Try it.** Open VRSCTEST from Home. Pin a card, switch cards, open a transaction. Send to yourself and watch the pending line.

| Top | Transactions | Transaction sheet | Transactions, dark |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/10-asset-detail-top-light.png" width="200" alt="Top"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/11-asset-detail-transactions-light.png" width="200" alt="Transactions"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/12-asset-detail-transaction-sheet-light.png" width="200" alt="Transaction sheet"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/13-asset-detail-transactions-dark.png" width="200" alt="Transactions, dark"> |

### 2.4 Receive

**Now.** Receive starts with an asset list, then one asset screen: the selected card and network, a QR code on a white tile, the address with copy and share, and "Request amount". A payment request is one step (amount, optional note, accepted conversions) and ends on a slip with the QR code and the address or VerusID name.

**Why.** The card chooser was titled "Choose address" although it chooses a card, and the screen claimed support for chains that the selected card did not cover. The payment request link used the deprecated VerusPay v3 invoice; it is now a `GenericRequest` link ([LOGIC_CHANGES.md](LOGIC_CHANGES.md#request-validation), request 1).

**Main files.** `src/containers/Transfer/ReceiveAssetsList.js`, `ReceiveAssetDetails.js`, `ReceiveSubwalletSheet.js`, `ReceiveAddressSheet.js`, `ReceivePaymentRequestFlow.js`, `PaymentRequestSlip.js`, `receiveInvoice.js`.

**Not changed underneath.** Address derivation and the card-to-channel relationship. Invoice fields are the same `VerusPayInvoiceDetails`.

**Try it.** Receive VRSCTEST, change the card, create a request with an amount and a note, scan the slip with a second wallet.

| Asset list | Card chooser | QR and address | Request amount |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/14-receive-asset-list-light.png" width="200" alt="Asset list"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/15-receive-card-chooser-light.png" width="200" alt="Card chooser"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/16-receive-qr-address-light.png" width="200" alt="QR and address"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/17-receive-request-amount-light.png" width="200" alt="Request amount"> |

| Request ready |
|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/18-receive-request-ready-light.png" width="200" alt="Request ready"> |

### 2.5 Send and Convert

**Now.** One wizard serves Send and Convert: select asset (with the network chosen at the pick), Amount with an in-app keypad and fiat toggle, Recipient (address book, paste, scan, live check), Confirm, and a result screen. Confirm shows "From", the resolved recipient, fees with money values, price impact for conversions, and a total; the user confirms with a slide. When the node lowers the amount to fit the fees, Confirm says so. Plain ETH, ERC-20 and BTC sends offer a network fee choice (slow, normal, fast, custom). Private (z) sends have a memo. Pre-launch currencies appear in Convert with a countdown. A broadcast that fails after it started shows "status unknown", not "not sent".

**Why.** Upstream had a different send modal per channel (`TraditionalCryptoSend`, `ConvertOrCrossChainSend`, conversion, deposit, withdraw). The wizard gives one flow and one review order. Pre-conversions: a pre-conversion skips Recipient and goes to the card's own address, so a failed launch refunds the same address. Fee choice: approved by the design owner on 2026-10-20; bridge, conversion, Verus and legacy sends keep their old fee path.

**Main files.** `src/containers/SendWizard/` (navigator, steps, `invoiceFlow.js`, `privateSend.js`, `priceImpact.js`, `loweredAmount.js`, `useNetworkFee.js`), `src/components/AmountKeypad.js`, `AmountInput.js`, `SlideToConfirm.js`, `TransactionResult.js`, `src/utils/web3/plainSendFees.js`, `src/utils/preconversion/`.

**Not changed underneath.** The wizard calls the same channel `preflight` and `send` functions with the same source card, channel, route and recipient. Invoice amount, destination and route constraints are kept. Changed and reviewed separately: amount lowering, mempool-aware funding, dust minimum, ETH/ERC-20 fee path, ambiguous broadcast ([LOGIC_CHANGES.md](LOGIC_CHANGES.md#read-these-first), items 1, 2, 4, 5).

**Try it.** Send VRSCTEST to another testnet address. Convert VRSCTEST through a basket. Send an amount equal to the balance and read Confirm. Send twice in a row before a block (spends own change).

| Select asset | Choose network | Choose address | Amount keypad |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/19-send-select-asset-light.png" width="200" alt="Select asset"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/48-send-choose-network-light.png" width="200" alt="Choose network"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/47-send-choose-address-light.png" width="200" alt="Choose address"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/21-send-amount-keypad-light.png" width="200" alt="Amount keypad"> |

| Amount keypad, dark | Recipient, empty | Recipient, filled | Fee sheet |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/24-send-amount-keypad-dark.png" width="200" alt="Amount keypad, dark"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/20-send-recipient-light.png" width="200" alt="Recipient, empty"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/49-send-recipient-filled-light.png" width="200" alt="Recipient, filled"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/22-send-fee-sheet-light.png" width="200" alt="Fee sheet"> |

| Confirm | Convert: select asset | Convert: target list | Convert: amount, empty |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/23-send-confirm-light.png" width="200" alt="Confirm"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/25-convert-select-asset-light.png" width="200" alt="Convert: select asset"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/50-convert-to-list-light.png" width="200" alt="Convert: target list"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/26-convert-amount-light.png" width="200" alt="Convert: amount, empty"> |

| Convert: amount with estimate | Convert: recipient | Convert: send to self |
|---|---|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/51-convert-amount-estimate-light.png" width="200" alt="Convert: amount with estimate"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/52-convert-recipient-light.png" width="200" alt="Convert: recipient"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/53-convert-send-to-self-light.png" width="200" alt="Convert: send to self"> |

### 2.6 Requests and deep links

Covers GenericRequest, sign-in (authentication), identity update, app encryption, credentials and data signing, invoices, gift card claims, wallet backup and NFC.

**Now.** Every request opens in one review layout: a request card with the requester's full name and verification mark, the action, the items, and one approval button. Sign data and Share credentials approve item by item, with Undo. A loader shows while the request is checked. Refused requests show an error state with one sentence and, only where it helps, Retry (for example network failure). Delivery shows its real status: signed, sent, failed. Invoices show the amount, route and fees, warn when this device already paid the invoice, and say when the amount is lowered. Identity update requests are a stepped review (content, high-risk changes, confirm) with readable values and a "Keys and authorities" row. Sign-in can provision a VerusID and shows its provisioning state. Gift card claims and NFC reads use a tap screen with one step per phase. A request that needs a wallet asks to unlock the right one.

**Why.** Credential and data-signing requests used hard-coded light styles, card-heavy layouts and dense raw payloads. Some request types reached the old `GenericRequestComplete` screen, which said "Success" before delivery was attempted. Refusals showed raw technical text. Upstream used native alerts for many outcomes.

**Main files.** `src/containers/DeepLink/` (`GenericRequestHome/`, `GenericRequestLoading.js`, `AuthenticationRequestInfo/`, `AppEncryptionRequestInfo/`, `IdentityUpdateRequestInfo/`, `InvoiceInfo/`, `WalletBackupRequestInfo/`, `components/RequestReview/`), `src/components/NfcTap/`, `src/components/WalletUnlockCoordinator.js`, `src/utils/deeplink/genericRequestDelivery.js`, `genericRequestRejection.js`, `delegatedSignerGate.js`.

**Not changed underneath.** Experimental request gating, credential scope filtering, required signer rules, encryption requirements, `assertSignedRequestAuthorization`, per-item consent. Changed and reviewed separately: signing order, one signed response per attempt, fail-closed credentials, HTTPS-only response POSTs in release builds, early refusal list for identity updates ([LOGIC_CHANGES.md](LOGIC_CHANGES.md#keys-signing-and-authentication), keys 1-9).

**Try it.** Open testnet request links (sign-in, identity update, credential, data packet, invoice) from a browser on the device. Open one while the wallet is locked. Open an expired one. Open one twice.

Screenshots: none for this area. These flows need a live request link or an NFC card, and the capture run did not use one.

### 2.7 VerusID

**Now.** VerusID is its own tab. The list shows one row per linked VerusID with a two-tone name, asset count and a status badge only when locked or revoked. The VerusID page shows a light card with Receive, Send and Convert, then Control, Content and Details rows, then Funds. "New VerusID" is a stepped flow with name check, payer choice with funds meters, two payment holds, and progress that resumes from Home. "Link VerusID" lists found identities with checkboxes; manual entry shows only when the lookup fails. Modify, Transfer, Revoke and Recover are stepped forms with a summary of every changed key and authority before signing.

**Why.** The old page used fold-out details. Status badges replace raw state text. Upstream's management and registration features (`c9d571d0`, `9ac1c509`) are kept and wired into these screens; the differences are listed in [DIFFERENCES_FROM_UPSTREAM.md](DIFFERENCES_FROM_UPSTREAM.md#upstream-logic-that-the-pr-changes-on-purpose).

**Main files.** `src/containers/RootStack/IdentityStackScreens/IdentityStackScreens.js`, `src/containers/Services/ServiceComponents/VerusIdService/` (`SignedInVerusIdService.js`, `SignedInVerusIdDetails.js`, `VerusIdCard.js`, `LinkVerusIdSheet.js`, `IdentityRegistration/`, `IdentityManagement/`, `IdentityLinking/LinkIdentities.js`), `src/containers/RevokeRecover/`, `src/utils/verusid/`, `src/utils/identityRegistration/`, `src/utils/identityManagement/`.

**Not changed underneath.** Registration transaction building and signing (upstream SDK), revoke and recover funding from the identity address (`check:identity-authority-funding`). Changed: registration retry and wait rules, transfer refusal of own addresses ([LOGIC_CHANGES.md](LOGIC_CHANGES.md#transaction-building-and-broadcast), broadcast 3; funds 17).

**Try it.** On Testnet: open the VerusID tab, open a linked identity, Send from it, start "New VerusID" up to the first hold, link an identity, open Modify and go back before signing.

| List | List, dark | Add menu | VerusID page |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/32-verusid-list-light.png" width="200" alt="List"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/38-verusid-list-dark.png" width="200" alt="List, dark"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/57-verusid-add-menu-light.png" width="200" alt="Add menu"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/33-verusid-detail-top-light.png" width="200" alt="VerusID page"> |

| About VerusID sheet | New VerusID, first step | Link VerusIDs |
|---|---|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/35-verusid-about-sheet-light.png" width="200" alt="About VerusID sheet"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/37-verusid-new-first-screen-light.png" width="200" alt="New VerusID, first step"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/36-verusid-link-page-light.png" width="200" alt="Link VerusIDs"> |

### 2.8 Services and gift cards

**Now.** The Services tab shows each service as a tile. Gift cards: "Build the gift" starts with the amount, then funding, then a fixed card with status (ready, pending, shared, not funded, redeemed), Share with a QR screen, and NFC write. An address book stores labeled addresses.

**Why.** Reason for tiles: not recorded beyond the design owner's approval on 2026-10-15. The gift card screen states its status once as a badge.

**Main files.** `src/containers/Services/SignedInServicesHome.js`, `ServiceComponents/GiftCardService/` (`GiftCardFixedCard.js`, `GiftCardShareSheet.js`, `GiftCardQrScreen.js`), `src/containers/Services/AddressBook/`, `src/utils/giftCard/giftCardPresentation.js`, `src/utils/addressBook/addressBook.js`.

**Not changed underneath.** Gift card creation, funding and claim transactions. Changed: share reservation and mempool-aware funding ([LOGIC_CHANGES.md](LOGIC_CHANGES.md#funds-and-fees), funds 12).

**Try it.** Create a testnet gift card with a small amount, share it, claim it with a second wallet.

| Services | Gift cards, empty state | New gift card, first step | Gift card warning |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/28-services-home-light.png" width="200" alt="Services"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/29-services-gift-cards-light.png" width="200" alt="Gift cards, empty state"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/30-gift-card-create-first-step-light.png" width="200" alt="New gift card, first step"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/54-gift-card-secrets-warning-light.png" width="200" alt="Gift card warning"> |

| Address book, empty state |
|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/31-services-address-book-light.png" width="200" alt="Address book, empty state"> |

### 2.9 Scan

**Now.** The Scan tab opens a camera window with a torch. A scanned payment QR opens the Send wizard at Amount or Confirm with the invoice fields filled. An inactive asset in an invoice offers to add the asset. A `verus://` request opens the request review. Devices with NFC show "Scan NFC card".

**Why.** Reason not recorded beyond the design owner's approval of the camera window.

**Main files.** `src/containers/VerusPay/VerusPay.js`, `src/components/BarcodeReader/BarcodeReader.js`, `src/containers/SendWizard/scanRequest.js`, `src/utils/QrScanner/QrScanner.js`.

**Not changed underneath.** QR parsing rules (`processVerusQr`); only error fields are added.

**Try it.** Scan a Receive slip from a second wallet. Scan a request QR. Scan an invoice for an asset that is not active.

| Scan on a simulator (no camera) |
|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/39-scan-tab-light.png" width="200" alt="Scan on a simulator (no camera)"> |

### 2.10 Settings

**Now.** Settings is a tab. The root shows the wallet (name and avatar, "Wallet appearance") and five groups: Security & recovery (password, biometrics, recovery secrets with screenshot protection on Android, keychain encryption), General, Appearance (System, Light, Dark), Network & storage, App information. Choices open sheets, not native pickers. A failed save shows on its row. The address blocklist screen and routes are hidden; the blocklist itself still loads at sign-in and still blocks sends (`6dc800a9`: "Keep login refresh and send checks intact").

**Why.** Native alerts and pickers were replaced so that results and errors show on the screen where they happen (`525aef5c`). Reason for hiding the blocklist screen: not recorded.

**Main files.** `src/containers/RootStack/SettingsStackScreens/SettingsStackScreens.js`, `src/containers/Settings/components/` (`SettingsScaffold.js`, `SettingsFieldSheet.js`, `WalletAppearanceSheet.js`), `src/containers/Settings/`, `src/containers/DisplaySeed/DisplaySeed.js`, `src/components/RecoverySecretsPrivacyGuard.js`.

**Not changed underneath.** Password change, profile deletion, key derivation version. Changed: `deleteProfile` also deletes three new local stores ([LOGIC_CHANGES.md](LOGIC_CHANGES.md#storage-and-migrations), storage 9); settings shape ([storage 7](LOGIC_CHANGES.md#storage-and-migrations)).

**Try it.** Switch appearance with the phone in the other mode. Open recovery secrets and take a screenshot (Android blocks it). Change the display currency.

| Settings | Settings, dark | Security and recovery | General |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/40-settings-root-light.png" width="200" alt="Settings"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/46-settings-root-dark.png" width="200" alt="Settings, dark"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/41-settings-security-recovery-light.png" width="200" alt="Security and recovery"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/42-settings-general-light.png" width="200" alt="General"> |

| Appearance | Network and storage |
|---|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/43-settings-appearance-light.png" width="200" alt="Appearance"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/45-settings-network-storage-light.png" width="200" alt="Network and storage"> |

### 2.11 Alerts and error messages

**Now.** `createAlert` shows the app alert sheet (`AcknowledgeSheet`) instead of a native alert; its default button is "Close". Many former alerts are gone: wrong password shows on the password field, a setting that does not save shows on its row, success alerts after biometrics, wallet creation and deletion are removed because the screen shows the result. Confirmations stay as sheets. Error text is plain; technical detail goes to the log.

**Why.** An audit of 303 `Alert.alert` calls found that 140 could not run, 26 repeated the screen, 75 belonged on their screen, 18 were confirmations and 39 were errors that stay.

**Main files.** `src/components/Alert.js`, `src/components/AcknowledgeSheet.js`, `src/actions/actions/alert/dispatchers/alert.js`.

**Not changed underneath.** Which conditions show an error. A few call sites still use `Alert.alert` (for example network warnings in `VerusPay.js`).

### 2.12 Shared design system

**Theme.** `src/theme/onboarding/tokens.js` defines semantic colors (`textPrimary`, `surfaceMuted`, `link`, status tones) and typography roles for light and dark. `AppThemeProvider` reads the Appearance setting (system, light, dark), builds an MD2 Paper theme from the tokens for untouched Paper components, sets the status bar, and on iOS sets the window appearance so native controls match.

**Typography.** Inter in nine weights (`assets/fonts/`, `android/app/src/main/assets/fonts/`). `applyGlobalTypography` gives every `Text` and `TextInput` the Inter file for its weight. Font scaling stays off, as in upstream. Roles are listed in [`TYPOGRAPHY.md`](../../TYPOGRAPHY.md).

**Components.** See [section 3](#3-architecture-notes).

**Icons.** `lucide-react-native` line icons; Feather stays for the tab bar. No decorative icons; icons do a navigation, status, copy or recognition job.

**Safe areas and keyboard.** `react-native-safe-area-context` everywhere; bottom actions in `SafeBottomActionStack`; forms with bottom actions in `KeyboardAvoidingForm`. `pnpm check:safe-areas --changed` flags `SafeAreaView` from `react-native` and absolute bottom offsets.

**Light and dark.** `Info.plist` no longer forces Light. Every redesigned screen is meant to work in both themes.

| Home, light | Home, dark |
|---|---|
| <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/05-home-top-light.png" width="200" alt="Home, light"> | <img src="https://raw.githubusercontent.com/Meyse/Verus-Mobile/c10ebe56dc93062c343a3a356fa47681c59af12e/screens/09-home-top-dark.png" width="200" alt="Home, dark"> |

## 3. Architecture notes

### Theme provider replaces `PaperProvider`

`App.js` used to wrap the app in `PaperProvider` with a Source Sans Pro font config, outside the Redux `Provider`. Now:

```
Provider (Redux)
  AppThemeProvider          src/theme/app/AppThemeProvider.js
    OnboardingThemeProvider src/theme/onboarding/OnboardingThemeProvider.js
      PaperProvider (MD2, built from tokens)
        NavigationContainer (theme from src/theme/app/navigationTheme.js)
```

The theme provider must sit inside Redux because it reads `settings.generalWalletSettings.appearance`. Screens read tokens through `useOnboardingTheme()` (the name is historical; it is the app theme).

### Navigation

- No drawer. `SignedInStackScreens` renders `MainStackScreens` directly.
- `MainStackScreens` (stack): `Home` (the tab navigator), `CoinMenus`, `ManageAssets`, `AddAssetByIdentifier`, `ReceiveAssetsList`, `ReceiveAssetDetails`, `SendWizard`, `DisplaySeed`, `NfcBackup`, `ResetPwd`, `DeleteProfile` and others.
- `HomeTabScreens` (`@react-navigation/bottom-tabs`): Wallet (`WalletStackScreens`), Services (`ServicesStackScreens`), VerusID (`IdentityStackScreens`, new), Settings (`SettingsStackScreens`, new), Scan (`VerusPay`).
- `IdentityStackScreens` holds `Identity`, `VerusIdDetails`, `IdentityRegistration`, `IdentityManagement`, `LinkIdentities`. Upstream registered the last three in `ServicesStackScreens`.
- `DeepLinkStackScreens` no longer registers `AuthenticationRequestIdentity`, `GenericRequestComplete` and `InvoicePaymentConfiguration`; no code navigates to them.
- Headers: `createRedesignedHeaderOptions` (`src/utils/navigation/header.js`) with the arrow back button. `index.js` turns on `enableFreeze(true)`; a patch to `@react-navigation/stack` freezes covered cards only after their transition ends.

### Shared components

All in `src/components/` unless noted. Style modules are in `src/styles/components/`.

| Need | Component |
|---|---|
| Buttons and text actions | `AppButton` (primary, secondary, text), `TextAction` |
| Bottom sheets | `BottomSheetModal`, `SelectionSheet`, `InfoSheet`, `InfoSheetSection`, `AcknowledgeSheet`, `DraggableSheet`, `SheetScrollView`, `useSheetDismissal` |
| Stepped tasks | `ProgressHeader`, `StepGlyph`, `SafeBottomActionStack`, `KeyboardAvoidingForm` |
| Inputs | `AppTextInput`, `AppAddressInput`, `AmountInput`, `AmountKeypad`, `AppSearchField`, `AppSearchLauncher`, `AppSwitch`, `AddressBookPicker` |
| Status and feedback | `StatusBadge`, `SkeletonLoader`, `EmptyState`, `TransactionResult`, `CopyAction`, `CopyFeedback`, `NeutralCheckMark` |
| Confirmation | `SlideToConfirm` |
| Privacy | `PrivacyBlurredText`, `RecoverySecretsPrivacyGuard`, `StartupCover` |
| Shell | `SignedInActionBar`, `HeaderCloseButton`, `HeaderContextBand`, `OnboardingBackButton`, `WalletAvatar`, `WalletUnlockCoordinator`, `NfcTap/`, `WalletSetup/` |
| Requests | `src/containers/DeepLink/components/RequestReview/` (`RequestCard`, details sheets) |

`DESIGN.md` names the canonical example for each pattern. `pnpm check:design` checks required sections, source fragments and banned patterns (iOS back title, left accent bars, repeated titles).

### New native modules

| Module | Platforms | What it does | Used by |
|---|---|---|---|
| `PrivacyBlurredText` (view) | iOS, Android | Draws text blurred for hidden balances. | `src/components/PrivacyBlurredText.js` |
| `VerusScreenSecurity` | iOS, Android | Android: `FLAG_SECURE` while recovery secrets show. iOS: reports screen capture state. | `RecoverySecretsPrivacyGuard.js` |
| `MainActivity.observeKeyboardResize` | Android | Sends a second `keyboardDidShow` when the keyboard height changes (Gboard number pad). | `KeyboardAvoidingForm.js`, keyboard listener |
| `VerusRootViewController` | iOS | Posts the appearance-change notification. Reason not recorded; may duplicate React Native. | `AppDelegate.mm` |

Both Android modules register in the existing `VerusKeepAwakePackage`.

### New dependencies and the patch

| Item | Reason |
|---|---|
| `@react-navigation/bottom-tabs` 6.6.1 | The tab bar. The v6 line matches the other navigation packages. |
| `lucide-react-native` 1.17.0 | Line icons; draws with the existing `react-native-svg`. Needs `mjs` in `metro.config.js`. |
| `react-native-video` 6.19.2 | Background video on Landing and Login. Adds a Swift pod (glog modular headers) and Media3 on Android, forced to 1.4.1 in `android/build.gradle` because AGP 7.4.2/R8 cannot dex 1.8.0. |
| `patches/@react-navigation+stack+6.3.4.patch` | Freezes a covered stack card only after its transition settles; ignores stale opening and closing keys after a reset. Applied by the existing `postinstall` (`patch-package`). Checked by `scripts/check-stack-freeze.cjs`. |

## 4. Known gaps and risks

1. **Jest is not updated.** 497 upstream tests that pass on the base do not pass here; 40+ suites do not load. See [Jest status](DIFFERENCES_FROM_UPSTREAM.md#jest-status).
2. **Legacy files stay unmounted.** For example `LegacyHomeTabScreens.js`, `SideMenu/`, `ProfileStackScreens/`, `Home/Home.render.js`, `Services/Services.render.js`, `Coin/DynamicHeader.js`, `SubWalletSelect/SubWalletSelectorModal.js`, legacy `SendCoin`, `ConvertCoin`, `ReceiveCoin`. They still compile and add review noise. Deleting them is not part of this PR.
3. **Older button style still reachable in two places.** `LinkIdentityForm` (v1 login requests) and the `TraditionalCryptoSend` steps (older scan paths). See [DIFFERENCES_FROM_UPSTREAM.md](DIFFERENCES_FROM_UPSTREAM.md#decisions-by-the-design-owner).
4. **Link VerusID.** With a successful lookup there is no manual entry, so an identity the wallet only partly controls cannot be linked from that page if the lookup does not return it.
5. **Fail-closed funding.** Send, Convert, gift cards and claims stop when the node cannot answer the mempool read. A flaky server blocks sends instead of risking a double spend of a pending input.
6. **Timeouts and status unknown.** Every VRPC and VerusID call stops after 30 s. A send whose broadcast fails with -32603 shows "status unknown" even if the node refused it.
7. **Plain storage.** Asset choices and the asset discovery cache (with balance snapshots) are in plain AsyncStorage; the balance history is encrypted.
8. **Registration waiting.** A registration job keeps waiting without an error when the server's tip and commitment reads never agree.
9. **Testnet tokens on Goerli.** User-added testnet ERC-20 tokens saved with `network: 'goerli'` are not migrated to Sepolia; their provider lookup throws.
10. **Global patches.** `enableFreeze(true)`, the stack patch and the render patches on `Text`, `TextInput` and `Switch` can break on a React Native or React Navigation upgrade.
11. **Android build pins.** Media3 1.4.1 under a library built for 1.8.0; guava `33.0.0-android`.
12. **Assets size.** Inter is shipped twice (iOS and Android folders, about 12 MB). The background video is about 0.9 MB.
13. **Not checked.** On-chain price math against an independent source; the `mapped_to` addresses of the three new Verus stablecoins; whether `mempool.space/testnet` matches the BTC test network the wallet uses.
14. **Check scripts are not in CI.** There is no CI file.

## 5. How the work was verified

Only what a record shows is listed here. Source reading and device runs are kept apart.

### Static checks

- At `01996b42` (two commits before the head; the later commits only remove files and change one endpoint), these passed: `check:design` (39 canonical sources; card palette contrast minimum 5.014:1), `check:identity-authority-funding`, `check:search-fields`, `check:send-wizard-options`, `check:safe-areas --changed`, `scripts/check-generic-request-completion-flow.js` (11 cases), `scripts/check-stack-freeze.cjs` (iOS and Android modes).
- Four other check scripts failed at that point because they compared old text or outputs. They are removed from this PR (`a29c8c91`).
- A relative-import scan found 0 unresolved imports in `src`, `App.js` and `index.js`.
- When the flag was removed (`da562817`), iOS and Android production JS bundles built. An Android release bundle also built for the last request fixes.

### Jest

Run on both sides on 2026-11-16. Upstream: 2630 of 2773 pass. PR branch: 2184 of 2436 pass. Details and per-suite causes: [Jest status](DIFFERENCES_FROM_UPSTREAM.md#jest-status).

### Device runs

All device runs used the public VRSCTEST testnet (some also a private test chain) and disposable test wallets. No mainnet wallet was used.

- **Devices.** iOS Simulator: iPhone 17 Pro and iPhone SE (iOS 26). Android emulators: a 360x640 phone and a normal phone (Pixel 8, Android 15, in earlier rounds; Pixel 9 in later rounds). Most areas were checked in light and dark mode.
- **Per-area rounds.** Most merged areas record their own device check in the history. Examples: asset card stack on iPhone 17 Pro, iPhone SE and Pixel 8 (2026-11-03); request card and item approval on iPhone 17 Pro, iPhone SE and Android 360x640 (2026-10-28/29); network fee choice on iOS normal and SE with four real Sepolia ETH sends (2026-10-21).
- **End-to-end runs.** 2026-10-27: batch fixes and small screens on iPhone 17 Pro, iPhone SE and Android 360x640. 2026-11-05: 50 case runs on four phones, 47 pass, 2 fail, 1 skip; the failure (VerusID registration on default servers) was fixed in merge `ff2e63e0`. 2026-11-06 (VerusID focus): 232 case runs, 210 pass, 6 fail, 7 blocked, 9 skip; 0 P1 and 8 P2 findings. The fix batch is merge `0f10dad8`; it was re-checked on both Android phones and not re-run on iOS. Registration with two holds passed on all four phones.
- **Flag removal.** iOS Simulator smoke run: unlock, Home, asset detail, Receive, Send and Convert entry, all tabs, Settings, lock and unlock, with no error on screen or in Metro. Not run on Android.
- **Physical iPhone.** Request flows (identity update, provisioning) ran on a physical iPhone; 13 request and VerusID fixes followed and were checked on iOS Simulator (normal and SE) and on Android normal (light).

### Not verified on a device

- ERC-20 and BTC sends with the fee choice (no Sepolia token and no BTC test coin at the time).
- NFC reads and writes on a physical card for every entry (Android emulators have no NFC).
- Android dark mode for the last request fixes; Android normal size for some request flows.
- Any mainnet flow.
