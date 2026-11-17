import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import {Gift, LockOpen, Nfc, Plus, ShieldCheck, Wallet} from 'lucide-react-native';
import Animated, {
  FadeIn,
  LayoutAnimationConfig,
  LinearTransition,
} from 'react-native-reanimated';
import BigNumber from 'bignumber.js';
import {SafeAreaView} from 'react-native-safe-area-context';
import AppButton from '../../../components/AppButton';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {SelectionCheckbox} from '../../../components/SelectionSheet';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import StepGlyph from '../../../components/StepGlyph';
import {
  createSelectionSheetStyles,
  createSignedOutFlowStyles,
  spendableKeyRequestInfoStyles as createSpendableKeyRequestInfoStyles,
} from '../../../styles';
import {useOnboardingSmallDeviceLayout} from '../../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {getAssetPresentation} from '../../../utils/assets/assetPresentation';
import {convertFqnToDisplayFormat} from '../../../utils/fullyqualifiedname';
import {getSpendableKeyReviewModel} from '../../../utils/spendableKey/spendableKeyReview';
import {
  discoverSpendableKeyClaims,
  spendableKeyDetailsOrdinalToMnemonic,
  spendableKeyDetailsRequiresPassword,
} from '../../../utils/spendableKey/spendableKey';

// A system is empty only when it has no claim and no unspent output at all.
// An unspent output that is not spendable yet does not make the card empty.
const isEmptyScan = result => result.systems.every(system =>
  system.currencies.length === 0 &&
  system.identities.length === 0 &&
  (system.observedUtxos || []).length === 0,
);

const pluralize = (count, one, many) => `${count}\u00a0${count === 1 ? one : many}`;

// One entry per asset the card holds. The review model adds the claim fee
// back to each system currency, so the amounts match the claim review.
const getHoldings = result => {
  const model = getSpendableKeyReviewModel(result);
  return {
    currencies: model.balances.map(({currency, system}) => {
      const name = currency.currencyId === system.systemId
        ? getAssetPresentation(system.coinObj).ticker
        : currency.display?.name;
      return {
        key: `${system.systemId}:${currency.currencyId}`,
        name: name || currency.currencyId,
        named: !!name && name !== currency.currencyId,
        amount: BigNumber(currency.balanceAmount).toFormat(),
      };
    }),
    identities: model.identities.map(({identity, system}) => ({
      key: `${system.systemId}:${identity.identityAddress}`,
      name: identity.fullyQualifiedName
        ? convertFqnToDisplayFormat(identity.fullyQualifiedName)
        : identity.identityAddress,
    })),
  };
};

// One named currency is the title itself. Anything else is counted in the
// title and listed below it.
const getSingleHolding = ({currencies, identities}) =>
  currencies.length === 1 && identities.length === 0 && currencies[0].named
    ? currencies[0]
    : null;

const getHoldingsCount = ({currencies, identities}) => [
  currencies.length > 0 && pluralize(currencies.length, 'currency', 'currencies'),
  identities.length > 0 && pluralize(identities.length, 'VerusID', 'VerusIDs'),
].filter(Boolean).join(' and ');

// The preview scans the root chain, then every known chain. A failure on
// another chain keeps the root chain result, but never reads as empty. The
// claim screen still performs its full discovery after unlock. Do not retain
// the mnemonic or private scan data.
const useGiftPreview = (detail, requestIsTestnet) => {
  const [preview, setPreview] = useState({loading: !!detail, empty: false, holdings: null});
  useEffect(() => {
    let active = true;
    setPreview({loading: !!detail, empty: false, holdings: null});
    if (!detail) return undefined;
    const discover = async () => {
      try {
        if (spendableKeyDetailsRequiresPassword(detail)) return;
        const mnemonic = spendableKeyDetailsOrdinalToMnemonic({spendableKeyOrdinal: detail});
        const root = await discoverSpendableKeyClaims({
          mnemonic,
          requestIsTestnet,
          activeCoinsForUser: [],
        });
        let full = null;
        try {
          full = await discoverSpendableKeyClaims({
            mnemonic,
            requestIsTestnet,
            activeCoinsForUser: [],
            cachedSystems: root.systems,
            includeKnownSystems: true,
          });
        } catch {
          // Another chain did not answer. The root chain result still counts.
        }
        const complete = full?.scanUniverseComplete === true;
        const result = complete ? full : root;
        if (!active) return;
        if (isEmptyScan(result)) {
          if (complete) setPreview({loading: false, empty: true, holdings: null});
          return;
        }
        const holdings = getHoldings(result);
        if (holdings.currencies.length + holdings.identities.length > 0) {
          setPreview({loading: false, empty: false, holdings});
        }
      } catch {
        // A title must never block setup or expose a network error.
      } finally {
        if (active) setPreview(value => ({...value, loading: false}));
      }
    };
    discover();
    return () => { active = false; };
  }, [detail, requestIsTestnet]);
  return preview;
};

const STEP_LAYOUT_MS = 200;
// Wait for the other steps to make room, so the new text never covers them.
const STEP_ENTERING = FadeIn.delay(STEP_LAYOUT_MS).duration(180);
const STEP_LAYOUT = LinearTransition.duration(STEP_LAYOUT_MS);

export default function WalletBackupEntry({
  activeAccountMatchesRequest,
  activeWalletName,
  backupSelected = false,
  cancel,
  choice = false,
  onBackup,
  onBackupSelectedChange,
  onClaim,
  onCreate,
  requestIsTestnet,
  signedIn,
  spendableKeyDetail,
}) {
  const theme = useOnboardingTheme();
  const flow = useMemo(() => createSignedOutFlowStyles(theme), [theme]);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const selectionStyles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  const reviewStyles = useMemo(() => createSpendableKeyRequestInfoStyles(theme), [theme]);
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const preview = useGiftPreview(spendableKeyDetail, requestIsTestnet);
  const [busy, setBusy] = useState(false);
  const single = preview.holdings && getSingleHolding(preview.holdings);
  const listedHoldings = preview.holdings && !single
    ? [...preview.holdings.currencies, ...preview.holdings.identities]
    : null;
  const title = !spendableKeyDetail
    ? 'Create a wallet'
    : preview.empty
      ? 'No funds found on this card'
      : single
        ? `This card holds ${single.amount} ${single.name}`
        : preview.holdings
          ? `This card holds ${getHoldingsCount(preview.holdings)}`
          : 'This card holds a gift';
  const unlockStep = activeAccountMatchesRequest ? null : {
    icon: LockOpen,
    text: signedIn
      ? `Switch to your ${requestIsTestnet ? 'testnet' : 'mainnet'} wallet`
      : 'Unlock your wallet on this phone',
  };
  const steps = choice ? [
    unlockStep,
    backupSelected && {icon: Nfc, text: 'Write the backup. It replaces the gift on the card.'},
    {icon: Wallet, text: unlockStep
      ? 'Claim the gift into that wallet'
      : `Claim the gift into ${activeWalletName}`},
  ].filter(Boolean) : spendableKeyDetail ? [
    {icon: Plus, text: 'Create a wallet on this phone'},
    {icon: ShieldCheck, text: 'Back it up to this card or with its Secret Recovery Phrase'},
    {icon: Wallet, text: 'Claim the gift into the new wallet'},
  ] : null;
  // The backup box adds and removes a step. The rest move first, then the
  // new step fades in, so the list does not jump. Steps already shown at mount do not
  // animate. No exit animation: on Android, an exiting step left the window
  // blank when this screen was replaced in the same request container.
  const stepList = steps && (
    <LayoutAnimationConfig skipEntering>
      <View style={[
        styles.steps,
        choice && smallDevice && styles.stepsSmallDevice,
        !choice && styles.introSteps,
      ]}>
        {steps.map(({icon: Icon, text}, index) => (
          <Animated.View
            entering={STEP_ENTERING}
            key={text}
            layout={STEP_LAYOUT}
            style={styles.step}>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.stepTrack}>
              <View style={styles.stepCircle}>
                <Icon color={theme.colors.textPrimary} size={18} strokeWidth={1.8} />
              </View>
              {index < steps.length - 1 && <View style={styles.stepConnector} />}
            </View>
            <Text style={[styles.stepText, index < steps.length - 1 && styles.stepTextSpacing]}>
              {text}
            </Text>
          </Animated.View>
        ))}
      </View>
    </LayoutAnimationConfig>
  );
  // Several assets: the claim review's flat rows, name left and amount right.
  const holdingsList = listedHoldings && (
    <View style={[
      reviewStyles.flatRows,
      styles.holdings,
      smallDevice && styles.holdingsSmallDevice,
    ]}>
      {listedHoldings.map((item, index) => (
        <View key={item.key} style={[reviewStyles.flatRow, index > 0 && reviewStyles.flatRowBorder]}>
          <Text numberOfLines={2} style={reviewStyles.rowTitle}>{item.name}</Text>
          {item.amount != null && (
            <Text numberOfLines={2} style={reviewStyles.rowAmount}>{item.amount}</Text>
          )}
        </View>
      ))}
    </View>
  );
  const continueFlow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!choice) await onCreate();
      else if (!backupSelected) await onClaim();
      else await onBackup();
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={flow.container}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.content,
          choice && smallDevice && styles.choiceContentSmallDevice,
          !choice && styles.introContent,
          !choice && flow.scrollContent,
          !choice && smallDevice && flow.scrollContentSmallDevice,
        ]}>
        <View style={!choice && flow.form}>
          {!choice && <StepGlyph icon={spendableKeyDetail ? Gift : Wallet} />}
          {preview.loading ? (
            <SkeletonLoader accessibilityLabel="Reading gift amount" style={styles.skeleton}>
              <SkeletonBlock height={36} width="90%" />
              <SkeletonBlock height={36} width="65%" style={styles.skeletonLine} />
            </SkeletonLoader>
          ) : (
            <Text accessibilityRole="header" style={[flow.title, smallDevice && flow.titleSmallDevice]}>
              {title}
            </Text>
          )}
          {holdingsList}
          {choice ? (
            <>
              <TouchableOpacity
                accessibilityLabel="Also back up my wallet to this card"
                accessibilityRole="checkbox"
                accessibilityState={{checked: backupSelected, disabled: busy}}
                activeOpacity={0.74}
                disabled={busy}
                onPress={() => onBackupSelectedChange(!backupSelected)}
                style={[
                  selectionStyles.row,
                  styles.backupChoice,
                  backupSelected && selectionStyles.selectedRow,
                ]}>
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={[selectionStyles.leading, busy && selectionStyles.disabledContent]}>
                  <SelectionCheckbox checked={backupSelected} />
                </View>
                <Text style={[
                  selectionStyles.rowTitle,
                  selectionStyles.copy,
                  busy && selectionStyles.disabledContent,
                ]}>
                  Also back up my wallet to this card
                </Text>
              </TouchableOpacity>
              {stepList}
            </>
          ) : stepList || (
            <Text style={flow.body}>
              Create a wallet, then write its backup to an NFC card.
            </Text>
          )}
        </View>
      </ScrollView>
      <SafeBottomActionStack
        bottomSpacing={choice && !smallDevice ? 36 : 30}
        gap={10}
        horizontalSpacing={choice ? 24 : theme.spacing.screenPadding}>
        <AppButton disabled={busy} onPress={continueFlow} variant="primary">
          {choice ? backupSelected ? 'Back up and claim' : 'Claim gift' : 'Create wallet'}
        </AppButton>
        <AppButton disabled={busy} onPress={cancel} variant="secondary">Cancel</AppButton>
      </SafeBottomActionStack>
    </SafeAreaView>
  );
}

const createStyles = theme => StyleSheet.create({
  content: {flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24},
  choiceContentSmallDevice: {paddingTop: theme.spacing.stepTopSmallDevice},
  introContent: {paddingHorizontal: theme.spacing.screenPadding},
  backupChoice: {marginVertical: 0},
  steps: {marginTop: 40},
  stepsSmallDevice: {marginTop: 32},
  // On the no-wallet screen the steps follow the title's own bottom margin.
  introSteps: {marginTop: 0},
  // The asset list repeats the title's own bottom margin below it.
  holdings: {marginBottom: theme.spacing.stepTitleMargin},
  holdingsSmallDevice: {marginBottom: theme.spacing.stepTitleMarginSmallDevice},
  step: {flexDirection: 'row', gap: 12},
  stepTrack: {width: 32, alignItems: 'center'},
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepConnector: {flex: 1, width: 1.5, marginVertical: 4, backgroundColor: theme.colors.border},
  stepText: {...theme.typography.bodyMd, color: theme.colors.textPrimary, flex: 1, minWidth: 0, paddingTop: 4},
  stepTextSpacing: {paddingBottom: 24},
  skeleton: {marginBottom: theme.spacing.stepTitleMargin},
  skeletonLine: {marginTop: 8},
});
