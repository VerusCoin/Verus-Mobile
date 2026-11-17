# Differences from current upstream

This file lists every place where the pull request deliberately differs from, or replaces, recent upstream work on `ui-redesign`. Nothing here is a merge accident. Each item names the upstream commit, what the PR does instead, the fork commit and the reason.

- Base: `upstream/ui-redesign` at `525aa859`. Last code commit: `263473d8`.
- Logic details: [LOGIC_CHANGES.md](LOGIC_CHANGES.md). Review guide: [README.md](README.md).

## Decisions by the design owner

These are decisions, not open questions. The reason is given for each one.

| Area | Upstream | This PR | Reason and consequence |
|---|---|---|---|
| Button styles | `8872ea1b` "Update button styles to be more consistent" (2026-10-17) changes `StandardButton`, `LargerButton` and about 35 legacy screens. | Merged with the fork side kept (`b923f537` "Merge upstream button styles without changing redesign appearance"). The 35 files show their older code; see [the list](#files-that-show-older-upstream-code). | The redesign has one button system (`AppButton`, `TextAction`). The legacy screens that use the old buttons are not mounted by the redesigned navigation. Exception found in this review, not checked on a device: `LinkIdentityForm.render.js` can still open from the v1 login request screen (`LoginRequestIdentity`), and the `TraditionalCryptoSend` steps can still open from older scan paths in `VerusPay.js` (`preConfirm` -> `openSubwalletSendModal`). Those steps show the older button style. |
| Link VerusID page | `525aa859` adds a permanent "Link identity manually" button. | Manual entry shows only when the lookup fails and returns no rows: `LinkIdentities.js:323` ("Enter VerusID manually"). Merge `5ab344b2`. | The page leads with the found identities. Consequence: when the lookup succeeds, there is no manual entry. An identity that the wallet only partly controls, and that the lookup does not return, cannot be linked from this page in that case. |
| Selected card after a card list rebuild | `c9d571d0` falls back to the matching card, else `MAIN_WALLET`, else the first card, and drops coins with no cards. | `coinMenus.js:18-37` keeps the matching card or sets `null`. The card chooser shows. Coins with no cards keep a `null` key. New `userSelectedSubWallets`. | The stale card object is never used, so upstream's safety goal holds. An automatic choice must not look like a user choice (`d30ee935`: "prefer funded cards without replacing explicit choices"). Consequence: after an unlink, the user picks a card. As upstream, the chooser opens only on a focused screen with a signed-in account and at least one card (`920fda51`). The three changed `subWalletLifecycle` tests assert the `null` selection (`f02602cf`). |
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

Shared setup (`cb73f287`, `fbb4e15a`):

- `debug/setupJest.js` mocks the icon, SVG, camera, permission, gesture-handler and safe-area native modules, and gives the Redux mock store `subscribe()` so `createAlert` works in tests.
- `package.json` adds `@react-navigation` to `transformIgnorePatterns` so its image assets load. This is the only Jest config change.
- `src/tests/helpers/mockReactNative.js` and `mockReactRedux.js` build a test's `react-native` and `react-redux` mocks from the real modules plus that test's overrides. Hand-written mocks that were too small for the redesigned screens now use them.

How the upstream suites were updated:

- Screen tests drive the redesigned screens. They find controls by role and visible text, and mock navigation, Reanimated, the app state and sheet modals at their boundaries. The behavior checks stay.
- Where the PR changes logic on purpose, the expectation follows the change and the commit names it. Examples: mempool reads in `vrpcRefresh` and `walletRefreshCoordinator` (`07452edb`, `db7bf214`); boolean `getblock` verbosity and the saved first broadcast time in `identityRegistration`, `identityRegistrationSdk`, `vrpcRegistrationBatching` and `identityDurableFunding` (`34a6f549`, `39268c3b`, `853c51c6`, `c5d17c6e`); `shareAttempt` in `giftCard` (`311d6ad9`); the mempool funding reads in `spendableKey` and `currencyTransferIntent` (`60757c5e`); the own-address refusal in `identityManagementUpdate` (`a56f6ba7`); the "NFC is off" and "Z recovery secret" text in `walletBackupNfc` and `getKeyMaterial` (`4b39d58b`).
- Where a test found upstream behavior that the redesign had lost, the product was fixed. Eight fixes came from this; see [README.md, section 5](README.md#fixes-found-by-the-upstream-tests).
- `walletBackupRequestSession` keeps the older button labels (`Write NFC Backup`), as part of the `8872ea1b` decision.
- `SignedInVerusIdLifecycle` (a suite that exists only here): its two tests of the "Link and login" resume gate on a ready VerusID request are replaced by one test of the current "Link" action, which opens the Link VerusIDs page. `63289e4b` removed the resume action from the VerusID tab (`7c7335ce`). The suite unmounts the tab after each test (`aa1b067a`).

## Jest status

Full suite, same machine, `--maxWorkers=3`. Upstream ran on 2026-11-16. The PR branch ran three times on 2026-11-17, each time with the same result.

| Side | Suites | Failed suites | Tests | Passed | Failed | Skipped |
|---|---|---|---|---|---|---|
| `upstream/ui-redesign` `525aa859` | 193 | 15 | 2773 | 2630 | 75 | 68 |
| PR branch `263473d8` | 202 | 16 | 2813 | 2642 | 103 | 68 |

Compared per test name, 25 tests pass on upstream and fail on the PR branch in each of the three runs.

**2 tests in `identityRegistrationScreens`.** "waits for saved summaries before showing an empty registration list or enabling creation" and "keeps last known registrations visible but disables actions until their summaries reload". Both mount upstream's registration start screen (`IdentityRegistrationStart`) and test its loading states. The redesign replaced that screen with the VerusID tab, which has no summary wait, so the element is undefined. The other storage cases of that screen now mount the VerusID tab (`c76a2671`).

**23 tests in `api/coinpaprika.int.test.js`.** The file is identical on both sides. Each test calls the live CoinPaprika service with `fetch` and does not run app code; only the coin list comes from `CoinDirectory`. The service rate-limits. On upstream, 61 tests of the same file failed in the same run with the same error; on the PR branch, 87 failed.

### Upstream test names that the PR changes

63 upstream test names do not exist on the PR branch, in 17 suites. Each one is ported to a redesigned screen under a new name, renamed to the intended behavior, or removed with removed behavior.

| Tests | Suite | What happened |
|---|---|---|
| 19 | `identityRegistrationScreens` | Ported to the stepped New VerusID flow (Name, Referral, Check details, progress with slide payments) and the VerusID tab; engine-call checks kept. Cases for removed parts are deleted: dots in names, the Start list, referral memory per network, delete from the list, cost checkboxes, pull to refresh on the review, the Review options flow (`3bccb151`, `c380bd69`, `fe0170ba`, `91c3ed92`, `4e16cf62`, `c76a2671`). |
| 12 | `appEncryptionReviewSession` | Ported to the review with one approval button; the "ready to send" and Continue step is gone. The two cases that only checked the removed daemon debug panel are removed. The default identity is the first by name (`8da5ed27`, `08bc4614`). |
| 5 | `identityActions` | Ported from the list chooser in `VerusIdServiceOverview` to the options sheet on the VerusID page. The Android dismissal case is removed with that chooser (`42983e67`, `2f197d5a`, `88da2b89`). |
| 3 | `walletBackupRequestSession` | The three in-screen profile creation tests are removed: "Create a new wallet" now opens the wallet setup flow (`4f2ab084`). |
| 3 | `coinMenuWalletLifecycle` | The tab filter and its "No compatible cards found." alert are gone; those cases are removed (`33e10b4d`). |
| 3 | `subWalletLifecycle` | Renamed: they assert the `null` selection, a safe rate read, and that an explicit card choice stays after a rebuild (`f02602cf`; [decision](#decisions-by-the-design-owner)). |
| 3 | `contentMultiMapRemoveUi` | Renamed: "current" becomes "active" (copy change). |
| 2 | `genericRequestCompletionLifecycle` | Ported from the removed `GenericRequestComplete` screen to `createGenericResponseDelivery` and `GenericRequestHome` (`32d295a0`, `e9819fc3`). |
| 2 | `genericResponseNetwork` | Renamed: a failed detail ends on the request error screen, and the approved response goes to the shared delivery (`adda36f6`). |
| 2 | `deepLinkDispatcherLifecycle` | Renamed: the wallet unlock sheet replaces the sign-in modal, and a refusal shows on the opening screen, not in an alert (`c9b58c07`). |
| 2 | `deeplinkNfcSubmission` | Renamed: "prompt" becomes "step" (NFC tap screen). |
| 2 | `seedDetails` | Renamed: "seed details" becomes "recovery data". |
| 1 | `identityManagementScreens` | Renamed: a Transfer preparation error shows above the footer, not at the end of the scroll view (`06a4f364`). |
| 1 | `identityLinkingScreen` | Renamed: the Link page returns by itself once the selected VerusIDs are saved (`a8d35959`). |
| 1 | `identityContentReviewScreen` | The case for missing content changes (`undefined`) moved to the parent screen test in `identitySignatureThreshold` (`17b11f67`). |
| 1 | `identityRegistrationNotifications` | The "Clear all" confirmation test is deleted with the removed tray (`db5e7916`). |
| 1 | `scopedCredentials` | Renamed to "refuses a partial set after an undecryptable stored entry" (`e3f9a85a`; [keys 4](LOGIC_CHANGES.md#keys-signing-and-authentication)). |

### Failing tests that exist only on the PR branch

None in the unit suites. Three suites failed only here until 2026-11-17 and are repaired (`7c7335ce`):

| Suite | Cause | Repair |
|---|---|---|
| `processVerusIdResumeGuard` | The test expected `navigate('DeepLink')`. The app passes `{screen: 'VerifyDeepLink'}` too, as upstream does. | Expectation corrected. |
| `genericRequestDelivery` | The suite did not load: its `react-native` mock had no `Dimensions`, and the delivery module imports the store. | The test uses the shared `react-native` mock and a small store mock. |
| `SignedInVerusIdLifecycle` (VerusID service `__tests__`) | The icon mock lacked six icons. Two tests covered a resume action that `63289e4b` removed. | Icons added; the two tests are replaced by one test of the current action. |

Three more tests of `api/coinpaprika.int.test.js` have names that exist only here. They fail with the same rate-limit error as the rest of that file.

Other failures are the same on both sides: live network tests (`int/composite`, `int/electrum`, `int/dlight`, `api/coinpaprika`) and 1 test in `giftCard`. Five `int/electrum` suites do not load on either side.

All suite names are in `src/utils/__tests__/unit/` unless a path is given.
