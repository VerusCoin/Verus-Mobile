# Differences from current upstream

This file lists every place where the pull request deliberately differs from, or replaces, recent upstream work on `ui-redesign`. Nothing here is a merge accident. Each item names the upstream commit, what the PR does instead, the fork commit and the reason.

- Base: `upstream/ui-redesign` at `525aa859`. Head: `89d57d5f`.
- Logic details: [LOGIC_CHANGES.md](LOGIC_CHANGES.md). Review guide: [README.md](README.md).

## Decisions by the design owner

These are decisions, not open questions. The reason is given for each one.

| Area | Upstream | This PR | Reason and consequence |
|---|---|---|---|
| Button styles | `8872ea1b` "Update button styles to be more consistent" (2026-10-17) changes `StandardButton`, `LargerButton` and about 35 legacy screens. | Merged with the fork side kept (`b923f537` "Merge upstream button styles without changing redesign appearance"). The 35 files show their older code; see [the list](#files-that-show-older-upstream-code). | The redesign has one button system (`AppButton`, `TextAction`). The legacy screens that use the old buttons are not mounted by the redesigned navigation. Exception found in this review, not checked on a device: `LinkIdentityForm.render.js` can still open from the v1 login request screen (`LoginRequestIdentity`), and the `TraditionalCryptoSend` steps can still open from older scan paths in `VerusPay.js` (`preConfirm` -> `openSubwalletSendModal`). Those steps show the older button style. |
| Link VerusID page | `525aa859` adds a permanent "Link identity manually" button. | Manual entry shows only when the lookup fails and returns no rows: `LinkIdentities.js:323` ("Enter VerusID manually"). Merge `5ab344b2`. | The page leads with the found identities. Consequence: when the lookup succeeds, there is no manual entry. An identity that the wallet only partly controls, and that the lookup does not return, cannot be linked from this page in that case. |
| Selected card after a card list rebuild | `c9d571d0` falls back to the matching card, else `MAIN_WALLET`, else the first card, and drops coins with no cards. | `coinMenus.js:18-37` keeps the matching card or sets `null`. The card chooser shows. Coins with no cards keep a `null` key. New `userSelectedSubWallets`. | The stale card object is never used, so upstream's safety goal holds. An automatic choice must not look like a user choice (`d30ee935`: "prefer funded cards without replacing explicit choices"). Consequence: after an unlink, the user picks a card. Upstream test `subWalletLifecycle` fails (5 tests). |
| VRPC servers | `6240d074` moves VRSC and VRSCTEST to the V2 servers. | Mainnet VRSC: upstream V2 value, unchanged (`89d57d5f`). VRSCTEST: V2 only when the build has a real key for `v2api.verustest.net`, else `api.verustest.net` (`CoinsList.js:35, 115`). | V2 servers accept only requests signed with a Verus app key. A build with the placeholder key failed every balance, history and send call (`4f8aa68b`). A build with the key behaves like upstream. |
| Versions and env values | - | Unchanged: app version, build number, `VRPC_API_APP_ID`, `ALLOW_HTTP_GENERIC_RESPONSE_POSTS`, the Android `CI=true` scripts, React Native 0.77.3. | The PR changes none of these values. Release builds now ignore `ALLOW_HTTP_GENERIC_RESPONSE_POSTS` for response POSTs (see [LOGIC_CHANGES.md](LOGIC_CHANGES.md#keys-signing-and-authentication), keys 6); the value itself is unchanged. |
| `ENABLE_SIGNED_IN_REDESIGN` | Not in upstream. | Removed from code and env files. The redesigned UI is the only path. Legacy screen files stay in the repository; nothing mounts them. | With the flag off, the VerusID registration, link and manage routes had no tab (`IdentityTab`), so the flag was not a working rollback. The legacy files are kept on purpose (reason not recorded beyond the decision); deleting them can be a separate change. |

## Upstream logic that the PR changes on purpose

Each row is an upstream commit from 2026-09-01 or later whose lines the PR changes. Verdicts: **Deliberate** (the PR replaces the behavior for a stated reason) or **Equivalent** (same result, different code).

| Upstream commit | File | Verdict | What the PR does | Fork commit and reason |
|---|---|---|---|---|
| `bad1b1cc` shared VRPC refresh coordinator | `src/actions/actions/wallet/dispatchers/vrpc/updates.js` | Deliberate | Keeps `vrpcRefresh` hooks. Adds mempool reads, uncached re-reads while the mempool is not empty, `pending = total - confirmed`, and one history row per txid. | `7d351c14`: balance and mempool caches expire at different times, so a payment was counted twice after a block. `511ed476`, `b3a1deb5`, `63289e4b`. |
| `bad1b1cc` | `src/utils/vrpc/vrpcInterface.js` | Deliberate | Same shared-read and cache functions, plus a cache generation, `skipCache`, and cache expiry after `sendrawtransaction`. Without a send or `skipCache`, the path equals upstream. | `511ed476` (refresh balances after wizard broadcasts), `0aa3d050` (`skipCache` for funding reads). |
| `bad1b1cc` | `WalletUpdates.js` | Deliberate | Coordinator kept. Optional `channels` per update; partial reads do not mark the coin fresh; private wallet retry before an info refresh. | `c450cd71` (no body), `2a144900` (body: retry on normal info refresh). |
| `bad1b1cc` | `UpdateLedgerValue.js` | Deliberate | Same actions, same order, dispatched together one tick later. | `ca743b2f`: 11 balance results each took about 4 s to draw on the Android test phone. |
| `8864e4f9` lifecycle refactor | `src/sagas/channels/vrpc.js` | Deliberate | Takes the upstream `createEndpointLifecycle` refactor; keeps the fork's `refreshVrpcDependentState` after channel init. | `51641012` (no body). |
| `8864e4f9` | `src/utils/navigation/resetToScreen.js` | Deliberate | Calls `closeDrawer()` only if it exists. There is no drawer in the redesigned shell. | `f1311422` "guard drawer-only resets". |
| `8864e4f9` NFC writer dedup | `src/utils/walletBackup/walletBackupNfc.js` | Deliberate | Keeps `createNdefWriter` and all overwrite guards; runs them through `runNfcSession` with phases and error codes. New "NFC is off" text. | `b7854f5a` (body: "Card checks, overwrite guards, and the Android release hold are unchanged."). |
| `8056bfce` registration call pacing | `vrpcInterface.js` | Deliberate | Pacing intact; three lines only gain the cache generation argument. `vrpcRequestBatcher.js` and `vrpcRequestMany.js` are unchanged. | `511ed476`. |
| `c9d571d0` VerusID management | `src/reducers/gui/coinMenus.js` | Deliberate | See the decision table above. | `51641012`, `d30ee935`. |
| `c9d571d0` | `src/utils/identityRegistration/notifications.js` | Deliberate | Home notice text and tone come from `registrationNoticeState`; action opens the VerusID tab; "Link VerusID" label. | `228d7477` (body: "Show the approved stage and problem copy, celebrate ready identities once, and open the shared Link sheet."), `63289e4b`, `5b0d6357`. |
| `c9d571d0` | `src/utils/identityManagement/updateIdentity.js` | Deliberate | Same checks through `validateTransferRecipient` and `assertChangedAuthorities`. New: refuse this wallet's own addresses and wholly owned VerusIDs; `RECIPIENT_NOT_FOUND`; a read-only form check. | `5b0d6357` (refuse this wallet's addresses and wholly owned VerusIDs), `2b2753c6`, `ccc129ab`. |
| `c9d571d0` | `src/utils/spendableKey/reviewFees.js` | Deliberate | App alert sheet instead of `Alert.alert`; same consent rule. | `8c861716` (body: "Same consent: Cancel or a dismissal leaves the claim unapproved."). |
| `c9d571d0` | `src/utils/identityRegistration/registration.js` | Deliberate | Retry of unsigned builds; wait instead of throw on a tip mismatch (script mismatch still throws); `broadcastAt` saved before the send; fixed refusal text. | `7b089908` (body: a new block between two reads keeps waiting), `5b0d6357`, `2b2753c6`. |
| `c9d571d0` | `identityUpdateRequestValidator.js` | Deliberate | Same conditions and thresholds; typed error codes. | `406c5cd0` "Keep identity update refusals specific and non-retryable". |
| `9ac1c509` identity registration | `src/actions/actions/services/dispatchers/verusid/verusid.js` | Deliberate | `deleteProvisionedIds(iAddress, chain, completed, requestContext)` with a shim for the old call; stores `completed_provisioning_requests`. | `377bfe31` (no body), `63289e4b`. |
| `9ac1c509` | `.../verusid/registration.js` | Deliberate | Background pass also checks payer funds for three job states and stores `registrationProblem`. | `59fbfecc` "Fix New VerusID selection and foreground funds refresh" (no body). |
| `9ac1c509` | `notifications.js`, `registration.js` | Deliberate | Stage logic replaced (see `c9d571d0` rows); `getBlock(..., true)`. | `228d7477`, `ccc129ab`. |
| `95f56051` duplicate profile / NFC submissions | `src/actions/actions/deeplink/dispatchers/deeplinkNfc.js` | Deliberate | Single-read guard kept; loading modal and alerts replaced by the NFC tap screen. | `b7854f5a`. |
| `95f56051` | `src/utils/profile/createProfileFromSeed.js` | Deliberate | Same order; the catch logs a fixed text and calls `onBiometrySetupFailed()`. Duplicate check runs earlier. | `657f1415` (no body). |
| `6240d074` servers | `src/utils/CoinData/CoinsList.js` | Deliberate | Testnet line only; see the decision table. | `4f8aa68b`, `04c2b967`, `89d57d5f`. |
| `78c27108` ERC-20 balance check | `src/utils/api/channels/erc20/requests/send.js` | Deliberate | `sendWithBalanceCheck` kept. With the wizard's fee choice, the transfer also sends `maxPriorityFeePerGas` and refuses a gas estimate above the confirmed limit. | `16f16c83` (no body; fee choice approved by the design owner). |
| `a5a68d38` many-UTXO message | `src/utils/vrpc/fundRawTransactionError.js` | Deliberate | Same detection and guide URL; app alert sheet with "Not now". | `8841961c`. |
| `a5a68d38` | `vrpcInterface.js` | Deliberate | `VerusIdInterface` clients get a 30 s timeout. The `fundRawTransaction` binding is kept. | `35ef5d62` (body: without a limit, Android keeps a request open for good when the connection drops). |
| `7022a84e` app encryption flow | `src/utils/crypto/getKeyMaterial.js` | Deliberate | Upstream logic; only the missing-key message text differs ("Z recovery secret"). | `7794952b`, `fdc68cb0`. |
| `7022a84e` | `src/utils/deeplink/validator/envelopeValidator.js` | Deliberate | Upstream `assertSignedRequestAuthorization` runs unchanged; known messages map to typed errors; a structure check runs first on signed requests. Same accept/reject outcome. | `899a95fb` (refuse signed requests that fail the unsigned structure rule), `c112fe19`, `5b0d6357`. |
| `f830aa1b` SDK update | `registration.js` | Deliberate | `getBlock(..., true)` and string heights; authority failures tagged with `field` and `code`. | `ccc129ab`: the public testnet server rejects numeric verbosity with -32601. |
| `6e752f53` z-address for new identities | `updateIdentity.js` | Equivalent | Same `usesRecipientPrivateAddress` value, computed in `transferControls`. | `ccc129ab`. |
| `1cfc7252` identity update UI | `src/utils/identityUpdate/contentReview.js` | Deliberate | Same escaped display text; copy returns the original value. | `627a0c44` "copy original identity review values". |
| `74de23bb` CMM update UI | `identityUpdateRequestDetailsHandler.js` | Deliberate | Same condition and message; typed, non-retryable refusal. | `406c5cd0`. |
| `90990bf8` data packet hashing | `src/utils/deeplink/dataPacket/signDataPacket.js` | Equivalent | Hash fix kept. Inputs are read before the key prompt; `signHash` gets the loaded identity instead of `undefined`. | `4decf026`, `c615aabc`. |
| `bf80c4aa` request network validation | `src/utils/deeplink/requestAccounts.js` | Equivalent | Same predicate through `accountIsTestnet`; typed error with the same text. | `c615aabc`, `39dabf36`. |

## Files that show older upstream code

Because of the `8872ea1b` decision, these files are equal to an older upstream version:

```
src/components/BankTransferDetailsModal/BankTransferDetailsModal.js
src/components/ConvertCardModal/ConvertCardModal.js
src/components/LargerButton.js
src/components/MissingInfoRedirect/MissingInfoRedirect.js
src/components/QRModal.js
src/components/SendModal/ConversionSend/ConversionSendConfirm/ConversionSendConfirm.render.js
src/components/SendModal/ConversionSend/ConversionSendForm/ConversionSendForm.render.js
src/components/SendModal/ConversionSend/ConversionSendResult/ConversionSendResult.render.js
src/components/SendModal/DepositSend/DepositSendConfirm/DepositSendConfirm.render.js
src/components/SendModal/DepositSend/DepositSendForm/DepositSendForm.render.js
src/components/SendModal/DepositSend/DepositSendResult/DepositSendResult.render.js
src/components/SendModal/LinkIdentity/LinkIdentityForm/LinkIdentityForm.render.js
src/components/SendModal/LinkIdentity/LinkIdentityResult/LinkIdentityResult.render.js
src/components/SendModal/ProvisionIdentity/ProvisionIdentityConfirm/ProvisionIdentityConfirm.render.js
src/components/SendModal/ProvisionIdentity/ProvisionIdentityForm/ProvisionIdentityForm.js
src/components/SendModal/ProvisionIdentity/ProvisionIdentityResult/ProvisionIdentityResult.render.js
src/components/SendModal/TraditionalCryptoSend/TraditionalCryptoSendConfirm/TraditionalCryptoSendConfirm.js
src/components/SendModal/TraditionalCryptoSend/TraditionalCryptoSendResult/TraditionalCryptoSendResult.js
src/components/SendModal/WithdrawSend/WithdrawSendConfirm/WithdrawSendConfirm.render.js
src/components/SendModal/WithdrawSend/WithdrawSendForm/WithdrawSendForm.render.js
src/components/SendModal/WithdrawSend/WithdrawSendResult/WithdrawSendResult.render.js
src/components/StandardButton.js
src/containers/Coin/SendCoin/SendCoin.js
src/containers/Convert/ConvertCard/ConvertCard.js
src/containers/Identity/AddIdentity/View.js
src/containers/Identity/Home/AttestationDetails/View.js
src/containers/Identity/Home/ScannedInformation/View.js
src/containers/Identity/Home/View.js
src/containers/Identity/PersonalInfo/ClaimDetails/View.js
src/containers/Identity/PersonalInfo/ClaimManager/View.js
src/containers/Identity/PersonalInfo/RequestAttestation/View.js
src/containers/Onboard/Welcome/WelcomeSlider.js
src/styles/deeplink/reviewStep.styles.js
src/styles/gradientbutton.styles.js
src/utils/__tests__/unit/walletBackupRequestSession.unit.test.js
```

The provision-identity steps render through the redesigned `ProvisionIdentityBottomSheet` (`SendModal.render.js:114`), so the old `ProvisionIdentityForm` is not shown there.

## Tests the PR changes

No upstream test file is deleted. Ten test files are new: `genericRequestCompletionFlow`, `genericRequestDelivery`, `giftCardPresentation`, `id1LinkFailureRouting`, `processVerusIdResumeGuard`, `verusIdFlowGuards` (in `src/utils/__tests__/unit`), plus `IdentityUpdateRequestInfo`, `IdentityPickerSheet` and `SignedInVerusIdLifecycle` next to their screens.

Changed upstream test files and why:

| Test file | Change | Reason |
|---|---|---|
| `CoinData` | New "Default VRPC endpoints" cases (no key, empty key, placeholder, real key). | Testnet endpoint rule. |
| `contentMultiMapRemoveUi` | Text "current" becomes "active" in three tests; test names changed. | Copy change. Shows as "test missing" in the Jest comparison. |
| `seedDetails`, `deeplinkNfcSubmission` | Test names and expected text ("recovery data", "step" instead of "prompt"). | Terminology and the NFC tap screen. Shows as "test missing". |
| `convertOrCrossChainSendConfirm`, `fundRawTransactionError`, `authDataStorage`, `spendableKeyReviewFees` | Mock the app alert instead of `Alert.alert`. | Native alerts moved to the app alert sheet. |
| `dataRequestResponses` | Mocks `getIdentity`; expects the loaded identity in `signHash`. | Signing order (LOGIC_CHANGES keys 2). |
| `genericResponseNetwork`, `identityUpdateContentHandler` | Mock the new delivery module; fixtures set `createmmr: true`. | Delivery extraction; early refusal list. |
| `identityContentReviewScreen`, `identityRegistrationPresentation`, `identityRegistrationScreens`, `identityRegistrationStorage`, `identitySignatureThreshold`, `profileDeletion` | Expected text and labels follow the redesigned copy; `identityRegistrationScreens` uses `AppButton`. | Copy and component change. |
| `spendableKeyClaimMetadataSession` | New case: refresh affected lifecycles after unlinking gifted identities. | New behavior. |
| `startupRecovery`, `barcodeReaderCompatibility` | Mock `StartupCover`, `WalletUnlockCoordinator`, safe-area context. | New mounted components. |
| `walletBackupRequestSession` | Older button labels (`Write NFC Backup`). | Part of the `8872ea1b` decision. |

## Jest status

Full suite, same machine, `--maxWorkers=3`, on 2026-11-16.

| Side | Suites | Failed suites | Tests | Passed | Failed |
|---|---|---|---|---|---|
| `upstream/ui-redesign` `525aa859` | 193 | 15 | 2773 | 2630 | 75 |
| PR branch `89d57d5f` | 202 | 63 | 2436 | 2184 | 184 |

497 tests pass on upstream and do not pass on the PR branch, in 49 suites. The PR branch runs fewer tests in total because suites that do not load report no tests.

**What this means.** Most of the 497 are suites that no longer load. Their hand-written mocks of `react-native`, `react-native-paper` and native modules do not cover what the redesigned screens now import (for example `Platform.OS`, `Animated` mixins, `NativeModules`, the camera, gesture handler). Others assert upstream text or behavior that the PR changed on purpose. A few fail on mocks that lack a new function. These suites need their mocks and expectations updated for the redesigned screens. **This is not done yet.** Until it is, a passing Jest run is not evidence for this PR, and the suites below do not protect the behavior they used to cover.

Kind: **Load** = suite does not load (mock or module gap). **Removed** = imports a file the PR removed. **Expect** = asserts upstream behavior or text that the PR changed on purpose. **Mock** = mock lacks a new function. **Renamed** = test renamed in the PR. **Other** = cause not isolated.

| Tests | Suite | Kind | First cause |
|---|---|---|---|
| 86 | `identityRegistrationScreens` | Load | `Cannot read properties of undefined (reading 'Mixin')` |
| 46 | `identityManagementScreens` | Load | same `Mixin` error |
| 29 | `appEncryptionReviewSession` | Load | `reading 'OS'` (`Platform` mock) |
| 24 | `identitySignatureThreshold` | Load | `Mixin` |
| 23 | `api/coinpaprika.int.test.js` | Expect | Live CoinPaprika test. The PR uses CoinPaprika only for `btc`, `eth`, `erc20`; KMD gets no price. |
| 17 | `spendableKey` | Mock | `getMempoolUnspentUtxos is not a function` |
| 16 | `identityContentReviewScreen` | Load | `Mixin` |
| 15 | `identityActions` | Removed | `openIdentityActionsModal is not a function` (legacy overview action removed) |
| 15 | `deepLinkDispatcherLifecycle` | Load | `OS` |
| 15 | `currencyTransferIntent` | Other | preflight result lacks `validation`; mempool funding mocks likely (not isolated) |
| 13 | `identityStateChangeConfirmation` | Load | `Mixin` |
| 13 | `identityLinkingScreen` | Load | `Mixin` |
| 13 | `genericRequestCompletionLifecycle` | Removed | `GenericRequestComplete` container removed (delivery moved) |
| 12 | `walletBackupRequestSession` | Load | `Mixin` |
| 12 | `genericResponseNetwork` | Load | `OS` |
| 11 | `vrpcRefresh` | Load | worker crash; `updates.js:29` reads an undefined balance answer |
| 11 | `identityContentDisplay` | Load | `Mixin` |
| 10 | `identitySendModalApprovalNavigation` | Load | `OS` |
| 9 | `coinMenuWalletLifecycle` | Load | `RNGestureHandlerModule` not found |
| 8 | `loginFailureFeedback` | Load | `OS` |
| 7 | `setupSeedSubmission` | Load | `reading 'get'` |
| 7 | `identityRegistrationNotifications` | Load | `Mixin`; also expects old notice text and a `testID` |
| 6 | `walletRefreshCoordinator` | Expect | mock mempool is not empty, so the uncached re-read runs |
| 6 | `provisionIdentitySession` | Load | `OS` |
| 6 | `loginRequestContinuation` | Load | `reading 'create'` |
| 6 | `identityStateChangeDisplay` | Load | `Mixin` |
| 6 | `identitySendModalFormLifecycle` | Load | `OS` |
| 6 | `giftCard` | Mock | result gains a field; mock lacks `getMempoolUnspentUtxos` |
| 5 | `subWalletLifecycle` | Expect | `null` instead of `MAIN_WALLET` (decision above) |
| 5 | `profileCreationSubmission` | Load | VisionCamera native module not found |
| 5 | `homeSessionTransitions` | Load | `reading 'get'` |
| 4 | `nfcImportSubmission` | Load | `Mixin` |
| 3 | `identityRegistration` | Expect | extra `saved:` step (`broadcastAt` saved before the send) |
| 3 | `contentMultiMapRemoveUi` | Renamed | "current" -> "active" |
| 3 | `barcodeReaderCompatibility` | Other | `barcodeReaderStyles is not a function` |
| 2 | `walletBackupNfc` | Expect | "NFC is disabled on this device." -> "NFC is off..." |
| 2 | `vrpcRegistrationBatching` | Expect | `getblock` verbosity `1` -> `true`, height as string |
| 2 | `seedDetails` | Renamed | terminology |
| 2 | `overviewRefresh` | Removed | `TxDetailsModal` removed (replaced by `TransactionDetailsSheet`) |
| 2 | `identityUpdateReviewScreen` | Load | `OS` |
| 2 | `getKeyMaterial` | Expect | message text "Z recovery secret" |
| 2 | `deeplinkNfcSubmission` | Renamed | "prompt" -> "step" |
| 1 | `vrpcEndpointReset` | Other | `getVerusIdInterface` bind on an undefined cached interface |
| 1 | `subWalletIdentityNames` | Load | test store lacks `subscribe` |
| 1 | `startupRecovery` | Load | worker crash |
| 1 | `scopedCredentials` | Expect | fail closed on an unreadable entry |
| 1 | `identityRegistrationSdk` | Other | not isolated |
| 1 | `identityManagementUpdate` | Expect | new `RECIPIENT_IN_WALLET` refusal |
| 1 | `identityDurableFunding` | Expect | `getBlock` verbosity `true` |

All suite names are in `src/utils/__tests__/unit/` unless a path is given.
