import React, {useMemo, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import BigNumber from 'bignumber.js';
import {CONVERSION_DISABLED} from '../../../env/index';
import AppButton from '../../components/AppButton';
import {fontStyle} from '../../globals/fonts';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {extractLedgerData} from '../../utils/ledger/extractLedgerData';
import {extractDisplaySubWallets} from '../../utils/subwallet/extractSubWallets';
import {
  getPrivateSyncPercent,
  getSpendableBalance,
  isPrivateChannel,
  selectPrivateWalletInfo,
} from '../../utils/subwallet/privateWallet';
import {cardCanPay} from './privateSend';
import {WALLET_APP_SEND} from '../../utils/constants/apps';
import {
  API_GET_BALANCES,
  API_SEND,
} from '../../utils/constants/intervalConstants';
import {
  getScanRequestFields,
  SendWizardProvider,
  useSendWizard,
} from './SendWizardContext';
import SendWizardSelectSource from './SendWizardSelectSource';
import SendWizardSelectTarget from './SendWizardSelectTarget';
import SendWizardAmount from './SendWizardAmount';
import SendWizardRecipient from './SendWizardRecipient';
import SendWizardConfirm from './SendWizardConfirm';
import SendWizardSuccess from './SendWizardSuccess';
import {closeWizard} from './wizardNavigation';
import SendWizardHeader, {
  getSendWizardProgress,
} from './components/SendWizardHeader';
import {
  buildSendTarget,
  isConversionChannel,
  SEND_WIZARD_MODE,
  WIZARD_CONTEXT_STEP,
} from './wizardUtils';

const Stack = createStackNavigator();

// The band under the header reminds the user what is moving and where. Confirm
// and Success already show all of it.
const CONTEXT_STEPS = {
  SendWizardSelectSource: WIZARD_CONTEXT_STEP.SOURCE,
  SendWizardRecipient: WIZARD_CONTEXT_STEP.RECIPIENT,
};

// A pre-conversion skips Recipient (it goes to the source card's own address),
// so the progress bar counts one step less, as for a scanned recipient.
const WizardProgressHeader = ({
  hasInitialSource,
  mode,
  recipientFixed,
  routeName,
  ...props
}) => {
  const {state} = useSendWizard();
  return (
    <SendWizardHeader
      {...props}
      progress={getSendWizardProgress(
        routeName,
        mode,
        hasInitialSource,
        recipientFixed || Boolean(state.route?.preconvert),
      )}
    />
  );
};

const goBackOrClose = navigation => {
  if (navigation.canGoBack?.()) navigation.goBack();
  else closeWizard(navigation);
};

const SendWizardNavigator = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useOnboardingTheme();
  const requestedMode = route.params?.mode;
  const mode =
    requestedMode === SEND_WIZARD_MODE.CONVERT
      ? SEND_WIZARD_MODE.CONVERT
      : SEND_WIZARD_MODE.SEND;
  const initialCoinId = route.params?.initialCoinId;
  const initialSubWalletId = route.params?.initialSubWalletId;
  const presetTargetId =
    mode === SEND_WIZARD_MODE.CONVERT ? route.params?.presetTargetId || null : null;
  // A payment request from the Scan tab (see VerusPay): its recipient, and an
  // amount and note when the QR code has them.
  const scan = route.params?.scan || null;
  const recipientFixed = Boolean(scan?.address);
  // A Send or Convert from the VerusID page: {iAddress, name}. Select asset
  // then shows only the assets on that VerusID's cards.
  const sourceIdentityAddress = route.params?.sourceIdentity?.iAddress || null;
  const sourceIdentityName = sourceIdentityAddress
    ? route.params?.sourceIdentity?.name || null
    : null;
  const sourceIdentity = useMemo(
    () =>
      sourceIdentityAddress
        ? {iAddress: sourceIdentityAddress, name: sourceIdentityName}
        : null,
    [sourceIdentityAddress, sourceIdentityName],
  );
  const coins = useObjectSelector(state => state.coins.activeCoinsForUser);
  const cardsByCoin = useObjectSelector(state => extractDisplaySubWallets(state));
  const balances = useObjectSelector(state =>
    extractLedgerData(state, 'balances', API_GET_BALANCES),
  );
  const privateInfo = useObjectSelector(selectPrivateWalletInfo);
  const candidateInitialSource = useMemo(() => {
    if (!initialCoinId) return null;
    const sourceCoin = coins.find(coin => coin.id === initialCoinId);
    if (!sourceCoin) return null;

    const eligibleCards = (cardsByCoin[sourceCoin.id] || []).filter(
      card => {
        const channel = card.api_channels?.[API_SEND];
        const canSend =
          card.compatible_apps?.includes(WALLET_APP_SEND) && Boolean(channel);

        return (
          canSend &&
          (mode !== SEND_WIZARD_MODE.CONVERT ||
            (!CONVERSION_DISABLED && isConversionChannel(channel))) &&
          // Only the private card pays a private address, and not while it
          // still syncs.
          (!scan?.address || cardCanPay(channel, scan.address)) &&
          !(
            isPrivateChannel(channel) &&
            getPrivateSyncPercent(privateInfo?.[sourceCoin.id]) != null
          )
        );
      },
    );
    // A scanned request for an asset on several funded cards opens
    // The address chooser on Select asset first.
    if (
      scan &&
      !initialSubWalletId &&
      eligibleCards.filter(card =>
        BigNumber(
          getSpendableBalance(balances?.[sourceCoin.id]?.[card.id], card),
        ).isGreaterThan(0),
      ).length > 1
    ) {
      return {chooseCard: true};
    }
    let sourceSubWallet;
    if (initialSubWalletId) {
      sourceSubWallet = eligibleCards.find(
        card => card.id === initialSubWalletId,
      );
      if (
        !sourceSubWallet ||
        !BigNumber(
          getSpendableBalance(
            balances?.[sourceCoin.id]?.[sourceSubWallet.id],
            sourceSubWallet,
          ),
        ).isGreaterThan(0)
      ) {
        return null;
      }
    } else {
      sourceSubWallet = eligibleCards.find(card =>
        BigNumber(
          getSpendableBalance(balances?.[sourceCoin.id]?.[card.id], card),
        ).isGreaterThan(0),
      );
    }
    if (!sourceSubWallet) return null;

    return {
      sourceCoin,
      sourceSubWallet,
      sourceBalance: String(
        getSpendableBalance(
          balances?.[sourceCoin.id]?.[sourceSubWallet.id],
          sourceSubWallet,
        ),
      ),
      channel: sourceSubWallet.api_channels[API_SEND],
    };
  }, [
    balances,
    cardsByCoin,
    coins,
    initialCoinId,
    initialSubWalletId,
    mode,
    privateInfo,
    scan,
  ]);
  const scanChooseCard = Boolean(candidateInitialSource?.chooseCard);
  const sourceAtEntry = useRef(null);
  const entryKey = `${mode}:${initialCoinId || ''}:${initialSubWalletId || ''}`;
  if (sourceAtEntry.current?.key !== entryKey) {
    sourceAtEntry.current = {key: entryKey, source: null};
  }
  if (
    !sourceAtEntry.current.source &&
    candidateInitialSource &&
    !scanChooseCard
  ) {
    sourceAtEntry.current.source = candidateInitialSource;
  }
  // Keep the entry route/source stable when a send empties its Card. The
  // provider reads the live balance; a refresh must not unmount Success.
  const initialSource = sourceAtEntry.current.source;
  const initialState = useMemo(() => {
    const scanFields = getScanRequestFields(scan);
    if (!initialSource || mode !== SEND_WIZARD_MODE.SEND) {
      return initialSource
        ? {...initialSource, ...scanFields, sourceIdentity, presetTargetId}
        : {...scanFields, sourceIdentity, presetTargetId};
    }

    const sourceNetworkId =
      initialSource.channel?.split('.')[2] ||
      initialSource.sourceCoin.system_id ||
      initialSource.sourceCoin.id;
    const target = buildSendTarget(
      {},
      initialSource.sourceCoin,
      sourceNetworkId,
    );
    const directRoute =
      target.routes.find(candidate => !candidate.isCrossChain && !candidate.via) ||
      target.routes[0];

    return {
      ...initialSource,
      target,
      route: directRoute,
      ...scanFields,
      sourceIdentity,
    };
  }, [initialSource, mode, presetTargetId, scan, sourceIdentity]);
  const hasInitialSource = Boolean(initialSource);
  let initialRouteName = 'SendWizardSelectSource';
  if (hasInitialSource) {
    initialRouteName =
      mode === SEND_WIZARD_MODE.SEND
        ? 'SendWizardAmount'
        : 'SendWizardSelectTarget';
  }
  const invalidInitialSource = Boolean(
    initialCoinId && coins.length > 0 && !initialSource && !scanChooseCard,
  );
  const progressAnimation = useRef({
    generation: 0,
    value: new Animated.Value(
      getSendWizardProgress(
        initialRouteName,
        mode,
        hasInitialSource,
        recipientFixed,
      ),
    ),
  }).current;

  if (invalidInitialSource) {
    return (
      <View style={[styles.errorState, {backgroundColor: theme.colors.background}]}>
        <Text style={[styles.errorTitle, {color: theme.colors.textPrimary}]}>
          Transfer unavailable
        </Text>
        <Text style={[styles.errorBody, {color: theme.colors.textSecondary}]}>
          This Asset or Card is unavailable or has no spendable balance.
        </Text>
        <AppButton
          onPress={() => navigation.goBack()}
          style={styles.errorAction}
          variant="secondary">
          Close
        </AppButton>
      </View>
    );
  }

  return (
    <SendWizardProvider
      key={
        initialState?.sourceCoin
          ? `${mode}:${initialState.sourceCoin.id}:${initialState.sourceSubWallet.id}`
          : `${mode}:manual${
              sourceIdentity ? `:${sourceIdentity.iAddress}` : ''
            }`
      }
      initialState={initialState}
      mode={mode}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={() => ({
          title: '',
          cardStyle: {backgroundColor: theme.colors.background},
          header: ({navigation, options, route: headerRoute}) => (
            <WizardProgressHeader
              contextStep={CONTEXT_STEPS[headerRoute.name]}
              title={options.wizardTitle || options.title}
              disabled={Boolean(options.wizardNavigationDisabled)}
              hasInitialSource={hasInitialSource}
              mode={mode}
              onBack={
                options.wizardBackHidden
                  ? undefined
                  : options.wizardOnBack || (() => goBackOrClose(navigation))
              }
              onClose={() => closeWizard(navigation)}
              progressAnimation={progressAnimation}
              recipientFixed={recipientFixed}
              routeName={headerRoute.name}
            />
          ),
        })}>
        <Stack.Screen
          name="SendWizardSelectSource"
          component={SendWizardSelectSource}
          options={{title: 'Select asset'}}
        />
        <Stack.Screen
          name="SendWizardSelectTarget"
          component={SendWizardSelectTarget}
          options={{title: 'Convert to'}}
        />
        <Stack.Screen
          name="SendWizardAmount"
          component={SendWizardAmount}
          options={{title: 'Amount'}}
        />
        <Stack.Screen
          name="SendWizardRecipient"
          component={SendWizardRecipient}
          options={{title: 'Recipient'}}
        />
        <Stack.Screen
          name="SendWizardConfirm"
          component={SendWizardConfirm}
          options={{title: 'Confirm'}}
        />
        <Stack.Screen
          name="SendWizardSuccess"
          component={SendWizardSuccess}
          options={{gestureEnabled: false, headerShown: false}}
        />
      </Stack.Navigator>
    </SendWizardProvider>
  );
};

const styles = StyleSheet.create({
  errorState: {flex: 1, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center'},
  errorTitle: {fontSize: 20, lineHeight: 26, textAlign: 'center', ...fontStyle('bold')},
  errorBody: {fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'center', ...fontStyle('regular')},
  errorAction: {minWidth: 160, marginTop: 24},
});

export default SendWizardNavigator;
