import BigNumber from 'bignumber.js';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Checkbox,
  Divider,
  RadioButton,
  Text,
  TextInput,
} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import {copyToClipboard} from '../../../../../utils/clipboard/clipboard';
import {CoinDirectory} from '../../../../../utils/CoinData/CoinDirectory';
import {
  GIFT_CARD_FUNDING_BOTH,
  GIFT_CARD_FUNDING_FUNDS,
  GIFT_CARD_FUNDING_IDENTITY,
  addGiftCardPendingFunding,
  broadcastGiftCardFunding,
  discoverGiftCardIdentityFunds,
  getGiftCardFundingTopups,
  getSubmittedGiftCardFundingIdentities,
  hasGiftCardBeenShared,
  normalizeGiftCardServiceData,
  preflightGiftCardFunding,
  refreshGiftCardStatus,
  unlinkGiftCardFundingIdentitiesFromVerusIdData,
  upsertGiftCard,
  upsertGiftCardIfUnchanged,
} from '../../../../../utils/giftCard/giftCard';
import {GIFT_CARD_SERVICE_ID, VERUSID_SERVICE_ID} from '../../../../../utils/constants/services';
import {VRPC} from '../../../../../utils/constants/intervalConstants';
import {modifyServiceStoredDataForUser} from '../../../../../actions/actions/services/dispatchers/services';
import {requestServiceStoredData} from '../../../../../utils/auth/authBox';
import {truncateDecimal} from '../../../../../utils/math';
import {
  SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_COINS,
} from '../../../../../utils/spendableKey/spendableKey';
import Colors from '../../../../../globals/colors';
import Styles from '../../../../../styles';
import { unlinkGiftedIdentitiesForSession } from '../../../../../utils/spendableKey/claimMetadataSession';
import { unlinkVerusId } from '../../../../../actions/actions/services/dispatchers/verusid/verusid';
import { updateVerusIdWallet } from '../../../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager';
import { clearChainLifecycle, refreshActiveChainLifecycles } from '../../../../../actions/actions/intervals/dispatchers/lifecycleManager';
import { setUserCoins } from '../../../../../actions/actionCreators';
import { useObjectSelector } from '../../../../../hooks/useObjectSelector';

const STEP_MODE = 0;
const STEP_FUNDS = 1;
const STEP_IDS = 2;
const STEP_REVIEW = 3;

const hasAmount = amount => {
  try {
    return BigNumber(amount || 0).isGreaterThan(0);
  } catch (_) {
    return false;
  }
};

const getPrimaryAddress = card => {
  const addresses = Object.values(card.addressesBySystem || {});

  return addresses[0] || '';
};

const getSourceAddressForCoin = (coinObj, activeAccount) => {
  return activeAccount?.keys?.[coinObj.id]?.[VRPC]?.addresses?.[0];
};

const getCoinBalance = (coinObj, activeAccount, ledgerBalances) => {
  const sourceAddress = getSourceAddressForCoin(coinObj, activeAccount);

  if (!sourceAddress) return null;

  const channelId = `${VRPC}.${sourceAddress}.${coinObj.system_id}`;
  const balance = ledgerBalances?.[channelId]?.[coinObj.id];

  if (balance == null) return null;
  if (balance.confirmed != null) return balance.confirmed;
  if (balance.total != null) return balance.total;

  return balance;
};

const formatAmount = amount => {
  try {
    return truncateDecimal(amount, 8);
  } catch (_) {
    return String(amount);
  }
};

const getCurrencyName = (systemId, currencyId, activeCoinsForUser) => {
  const activeCoin = (activeCoinsForUser || []).find(coinObj => {
    return coinObj.system_id === systemId && coinObj.currency_id === currencyId;
  });

  if (activeCoin) {
    return activeCoin.display_ticker || activeCoin.id || currencyId;
  }

  try {
    const directoryCoin = CoinDirectory.findCoinObj(currencyId);

    if (directoryCoin) {
      return directoryCoin.display_ticker || directoryCoin.id || currencyId;
    }
  } catch (_) {}

  return currencyId;
};

const getMaxFundAmount = (coinObj, balance) => {
  if (balance == null) return null;

  const rawBalance = BigNumber(balance || 0);
  const nativeFundingFee =
    coinObj.currency_id === coinObj.system_id
      ? BigNumber(SPENDABLE_KEY_CLAIM_NON_NATIVE_FEE_COINS)
      : BigNumber(0);
  const maxAmount = rawBalance.minus(nativeFundingFee);

  return maxAmount.isGreaterThan(0) ? maxAmount : BigNumber(0);
};

const getFundingSteps = mode => {
  const steps = [STEP_MODE];

  if (mode === GIFT_CARD_FUNDING_FUNDS || mode === GIFT_CARD_FUNDING_BOTH) {
    steps.push(STEP_FUNDS);
  }

  if (mode === GIFT_CARD_FUNDING_IDENTITY || mode === GIFT_CARD_FUNDING_BOTH) {
    steps.push(STEP_IDS);
  }

  steps.push(STEP_REVIEW);
  return steps;
};

const GiftCardFund = props => {
  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);
  const activeCoinsForUser = useObjectSelector(state => state.coins.activeCoinsForUser);
  const dispatch = useDispatch();
  const sessionEpoch = useObjectSelector(
    state => state.authentication.sessionEpoch || 0,
  );
  const ledgerBalances = useObjectSelector(state => state.ledger.balances);
  const [serviceData, setServiceData] = useState(null);
  const [linkedIds, setLinkedIds] = useState({});
  const [mode, setMode] = useState(GIFT_CARD_FUNDING_FUNDS);
  const [stepIndex, setStepIndex] = useState(0);
  const [fundAmounts, setFundAmounts] = useState({});
  const [selectedIds, setSelectedIds] = useState({});
  const [identityFunding, setIdentityFunding] = useState([]);
  const [identityFundingLoading, setIdentityFundingLoading] = useState(false);
  const [identityFundingError, setIdentityFundingError] = useState(null);
  const [claimPassword, setClaimPassword] = useState('');
  const [preflightPlan, setPreflightPlan] = useState(null);
  const [pendingFundingBroadcast, setPendingFundingBroadcast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(null);
  const cardId = props.route.params.cardId;
  const pendingFundingId = props.route.params.pendingFundingId || null;

  const card = serviceData?.cards?.[cardId];
  const savedPendingFunding = pendingFundingId == null
    ? null
    : (card?.fundingHistory || []).find(
        entry => entry?.id === pendingFundingId,
      ) || null;
  const pendingFunding = pendingFundingBroadcast || savedPendingFunding;
  const steps = getFundingSteps(mode);
  const step = steps[stepIndex];

  useEffect(() => {
    props.navigation.setOptions({title: 'Fund Gift Card'});
  }, [props.navigation]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadingText('Loading gift card...');

    try {
      const giftCardData = normalizeGiftCardServiceData(
        await requestServiceStoredData(GIFT_CARD_SERVICE_ID),
      );
      const verusIdData = await requestServiceStoredData(VERUSID_SERVICE_ID);

      setServiceData(giftCardData);
      setLinkedIds(verusIdData.linked_ids || {});
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setLoadingText(null);
    }
  }, []);

  const unlinkGiftedIdentities = useCallback(
    async (identities, requestContext) =>
      unlinkGiftedIdentitiesForSession({
        identities,
        requestContext,
        activeAccount,
        activeCoinList,
        dispatch,
        unlinkIdentity: unlinkVerusId,
        updateIdentityWallet: updateVerusIdWallet,
        clearLifecycle: clearChainLifecycle,
        createSetUserCoinsAction: setUserCoins,
        refreshLifecycles: refreshActiveChainLifecycles,
      }),
    [activeAccount, activeCoinList, dispatch],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeFundingCoins = useMemo(() => {
    const seen = new Set();

    return (activeCoinsForUser || [])
      .filter(coinObj => {
        const key = `${coinObj.system_id}:${coinObj.currency_id}`;

        if (seen.has(key)) return false;
        seen.add(key);

        return (
          Array.isArray(coinObj.compatible_channels) &&
          coinObj.compatible_channels.includes(VRPC) &&
          getSourceAddressForCoin(coinObj, activeAccount) &&
          card?.addressesBySystem?.[coinObj.system_id]
        );
      })
      .sort((a, b) =>
        (a.display_ticker || a.id).localeCompare(b.display_ticker || b.id),
      );
  }, [activeAccount, activeCoinsForUser, card]);

  const linkedIdentityOptions = useMemo(() => {
    const options = [];

    for (const chain of Object.keys(linkedIds || {})) {
      let coinObj;

      try {
        coinObj = CoinDirectory.findCoinObj(chain);
      } catch (_) {
        continue;
      }

      if (!card?.addressesBySystem?.[coinObj.system_id]) continue;

      for (const iAddress of Object.keys(linkedIds[chain] || {})) {
        options.push({
          key: `${coinObj.system_id}:${iAddress}`,
          chain,
          systemId: coinObj.system_id,
          identityAddress: iAddress,
          fullyQualifiedName: linkedIds[chain][iAddress],
        });
      }
    }

    return options.sort((a, b) =>
      (a.fullyQualifiedName || a.identityAddress).localeCompare(
        b.fullyQualifiedName || b.identityAddress,
      ),
    );
  }, [card, linkedIds]);

  const selections = useMemo(() => {
    const funds =
      mode === GIFT_CARD_FUNDING_FUNDS || mode === GIFT_CARD_FUNDING_BOTH
        ? activeFundingCoins
            .filter(coinObj => hasAmount(fundAmounts[coinObj.id]))
            .map(coinObj => ({
              systemId: coinObj.system_id,
              currencyId: coinObj.currency_id,
              amount: fundAmounts[coinObj.id],
              coinObj,
            }))
        : [];
    const identities =
      mode === GIFT_CARD_FUNDING_IDENTITY || mode === GIFT_CARD_FUNDING_BOTH
        ? linkedIdentityOptions.filter(identity => selectedIds[identity.key])
        : [];

    return {
      funds,
      identities,
    };
  }, [
    activeFundingCoins,
    fundAmounts,
    linkedIdentityOptions,
    mode,
    selectedIds,
  ]);

  const topups = useMemo(
    () => getGiftCardFundingTopups(selections, {identityFunding}),
    [identityFunding, selections],
  );
  const identityFeeFundingTransactions = useMemo(
    () =>
      (preflightPlan?.transactions || []).filter(
        tx => tx.type === 'identity' && tx.usesIdentityFeeFunds,
      ),
    [preflightPlan],
  );
  const selectedIdentityKeys = useMemo(
    () => selections.identities.map(identity => identity.key).join('|'),
    [selections.identities],
  );

  useEffect(() => {
    setPreflightPlan(null);
  }, [mode, fundAmounts, selectedIds, claimPassword]);

  useEffect(() => {
    let cancelled = false;

    const loadIdentityFunding = async () => {
      if (step !== STEP_REVIEW || selections.identities.length === 0) {
        setIdentityFunding([]);
        setIdentityFundingError(null);
        setIdentityFundingLoading(false);
        return;
      }

      setIdentityFundingLoading(true);
      setIdentityFundingError(null);

      try {
        const fundedIdentities = await discoverGiftCardIdentityFunds({
          identities: selections.identities,
        });

        if (!cancelled) {
          setIdentityFunding(fundedIdentities);
        }
      } catch (e) {
        console.error(e);

        if (!cancelled) {
          setIdentityFunding([]);
          setIdentityFundingError(
            e.message || 'Unable to check funds held by selected VerusIDs.',
          );
        }
      } finally {
        if (!cancelled) {
          setIdentityFundingLoading(false);
        }
      }
    };

    loadIdentityFunding();

    return () => {
      cancelled = true;
    };
  }, [step, selectedIdentityKeys, selections.identities]);

  const updateCard = async updater => {
    const savedData = await modifyServiceStoredDataForUser(
      currentData => {
        const normalized = normalizeGiftCardServiceData(currentData);
        const currentCard = normalized.cards?.[cardId];

        if (!currentCard) {
          throw new Error('Gift card is no longer available.');
        }

        return updater(normalized, currentCard);
      },
      GIFT_CARD_SERVICE_ID,
      activeAccount.accountHash,
    );

    setServiceData(savedData);
    return savedData.cards?.[cardId] || null;
  };

  const loadLatestFundableCard = async () => {
    const latestData = normalizeGiftCardServiceData(
      await requestServiceStoredData(GIFT_CARD_SERVICE_ID),
    );
    const latestCard = latestData.cards?.[cardId];

    if (!latestCard) {
      throw new Error('Gift card is no longer available.');
    }

    if (hasGiftCardBeenShared(latestCard)) {
      throw new Error(
        'Shared gift cards cannot be funded. Create a new gift card instead.',
      );
    }

    setServiceData(latestData);
    return latestCard;
  };

  const currentStepPosition = steps.indexOf(step);
  const canGoNext = () => {
    if (step === STEP_FUNDS) return selections.funds.length > 0;
    if (step === STEP_IDS) return selections.identities.length > 0;
    return true;
  };

  const goNext = () => {
    if (!canGoNext()) {
      Alert.alert('Error', 'Select at least one item before continuing.');
      return;
    }

    setStepIndex(Math.min(stepIndex + 1, steps.length - 1));
  };

  const goBack = () => {
    if (stepIndex === 0) {
      props.navigation.goBack();
    } else {
      setStepIndex(stepIndex - 1);
    }
  };

  const copyAddressAndExit = () => {
    copyToClipboard(getPrimaryAddress(card), {
      title: 'Copied',
      message: 'Gift card address copied to clipboard.',
    });
    props.navigation.goBack();
  };

  const buildPreflight = async () => {
    setLoading(true);
    setLoadingText(
      card.encrypted
        ? 'Decrypting and verifying gift card address...'
        : 'Verifying gift card address...',
    );

    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      const latestCard = await loadLatestFundableCard();

      const plan = await preflightGiftCardFunding({
        card: latestCard,
        password: latestCard.encrypted ? claimPassword : undefined,
        selections,
        identityFunding,
        activeCoinsForUser,
        activeAccount,
      });

      setPreflightPlan(plan);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setLoadingText(null);
    }
  };

  const unlinkIdentitiesInContext = async (submittedIdentities) => {
    if (!submittedIdentities || submittedIdentities.length === 0) return;

    const unlinkContext = {
      sessionScope: {
        sessionScoped: true,
        accountHash: activeAccount.accountHash,
        sessionEpoch,
      },
    };
    
    return await unlinkGiftedIdentities(submittedIdentities, unlinkContext)
  }

  const persistFundingResult = async fundingResult => {
    const submittedIdentities =
      getSubmittedGiftCardFundingIdentities(fundingResult);
    let unlinkError = null;

    const pendingCard = await updateCard((currentData, currentCard) =>
      upsertGiftCard(
        currentData,
        addGiftCardPendingFunding(currentCard, fundingResult),
      ),
    );

    if (submittedIdentities.length > 0) {
      setLoadingText('Unlinking transferred VerusIDs...');

      try {
        await unlinkIdentitiesInContext(submittedIdentities);
      } catch (e) {
        console.error(e);
        unlinkError = e;
      }
    }

    setLoadingText('Refreshing gift card status...');

    try {
      const refreshed = await refreshGiftCardStatus({
        card: pendingCard,
        activeCoinsForUser,
      });

      await updateCard(currentData =>
        upsertGiftCardIfUnchanged(
          currentData,
          pendingCard,
          refreshed,
        ),
      );
    } catch (refreshError) {
      console.warn(refreshError.message);
    }

    return {
      pendingCard,
      submittedIdentities,
      unlinkError,
    };
  };

  const persistFundingBroadcast = async pendingBroadcast => {
    const updatedCard = await updateCard((currentData, currentCard) =>
      upsertGiftCard(
        currentData,
        addGiftCardPendingFunding(currentCard, {
          pendingBroadcast,
          results: pendingBroadcast.transactions,
        }),
      ),
    );

    setPendingFundingBroadcast(pendingBroadcast);
    return updatedCard;
  };

  const broadcast = async () => {
    if (!preflightPlan && !pendingFunding) return;

    setLoading(true);
    setLoadingText('Submitting signed gift card funding transactions...');

    try {
      await loadLatestFundableCard();
      const result = await broadcastGiftCardFunding({
        preflightPlan,
        pendingBroadcast: pendingFunding,
        persistPendingBroadcast: persistFundingBroadcast,
      });
      const {unlinkError} = await persistFundingResult(result);

      Alert.alert(
        unlinkError ? 'Funded' : 'Success',
        unlinkError
          ? `Gift card funding transactions were confirmed, but the transferred VerusID could not be unlinked locally: ${unlinkError.message}`
          : 'Gift card funding transactions were confirmed and saved as pending.',
      );
      props.navigation.goBack();
    } catch (e) {
      console.error(e);

      if (Array.isArray(e.results) && e.results.length > 0) {
        try {
          setLoadingText('Saving submitted gift card funding transactions...');

          const partialResult = {
            preflightPlan: e.preflightPlan || preflightPlan,
            pendingBroadcast: e.pendingBroadcast,
            results: e.results,
          };
          const {unlinkError} = await persistFundingResult(partialResult);
          const submittedCount = e.results.length;
          const submittedLabel =
            `${submittedCount} funding transaction${submittedCount === 1 ? '' : 's'}`;

          Alert.alert(
            'Funding partially completed',
            `${submittedLabel} ${submittedCount === 1 ? 'was' : 'were'} submitted before an error occurred: ${e.message || 'Unable to complete every funding transaction.'}${
              unlinkError
                ? ` One or more transferred VerusIDs could not be unlinked locally: ${unlinkError.message}`
                : ''
            }`,
          );
          props.navigation.goBack();
        } catch (saveError) {
          console.error(saveError);
          Alert.alert(
            'Error',
            `Some funding transactions were submitted, but the app could not save them locally: ${saveError.message}`,
          );
        }
      } else {
        Alert.alert(
          'Funding not confirmed',
          `${e.message}\n\nThe signed transaction was saved and can be retried safely.`,
        );
      }
    } finally {
      setLoading(false);
      setLoadingText(null);
    }
  };

  if (loading || !serviceData || !card) {
    return (
      <SafeAreaView style={Styles.defaultRoot}>
        <ScrollView
          contentContainerStyle={{
            ...Styles.centerContainer,
            flexGrow: 1,
            paddingHorizontal: 32,
          }}
          style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}>
          <ActivityIndicator animating color={Colors.primaryColor} size="large" />
          {loadingText && (
            <Text
              style={{
                color: Colors.verusDarkGray,
                fontSize: 18,
                fontWeight: 'bold',
                marginTop: 24,
                textAlign: 'center',
              }}>
              {loadingText}
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (pendingFundingId != null && pendingFunding == null) {
    return (
      <SafeAreaView style={Styles.defaultRoot}>
        <View style={{padding: 24}}>
          <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 12}}>
            Pending funding unavailable
          </Text>
          <Text style={{marginBottom: 16}}>
            This saved funding attempt no longer exists. Refresh the gift card before trying again.
          </Text>
          <Button onPress={() => props.navigation.goBack()}>Close</Button>
        </View>
      </SafeAreaView>
    );
  }

  if (pendingFunding != null) {
    return (
      <SafeAreaView style={Styles.defaultRoot}>
        <ScrollView
          contentContainerStyle={{padding: 24}}
          style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}>
          <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 12}}>
            Retry pending funding
          </Text>
          <Text style={{color: Colors.verusDarkGray, marginBottom: 16}}>
            These exact signed transactions were saved before broadcast. Retrying rebroadcasts any that are not already marked submitted.
          </Text>
          {(pendingFunding.transactions || []).map(transaction => (
            <View key={`${transaction.systemId}:${transaction.txid}`} style={{marginBottom: 12}}>
              <Text style={{fontWeight: 'bold'}}>{transaction.systemId}</Text>
              <Text selectable style={{fontSize: 12}}>{transaction.txid}</Text>
              <Text style={{color: Colors.verusDarkGray, fontSize: 12}}>
                {transaction.status || 'prepared'}
              </Text>
            </View>
          ))}
          <Button mode="contained" icon="send" onPress={broadcast}>
            Retry exact transactions
          </Button>
          <Button onPress={() => props.navigation.goBack()} style={{marginTop: 8}}>
            Close
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const renderMode = () => (
    <View>
      <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 16}}>
        What should this gift card hold?
      </Text>
      <RadioButton.Group onValueChange={setMode} value={mode}>
        <RadioButton.Item label="Funds only" value={GIFT_CARD_FUNDING_FUNDS} />
        <RadioButton.Item label="VerusID" value={GIFT_CARD_FUNDING_IDENTITY} />
        <RadioButton.Item label="Funds and VerusID" value={GIFT_CARD_FUNDING_BOTH} />
      </RadioButton.Group>
      <Button
        mode="text"
        icon="content-copy"
        onPress={copyAddressAndExit}
        style={{marginTop: 48}}>
        Copy address and fund externally
      </Button>
    </View>
  );

  const renderFunds = () => (
    <View>
      <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 12}}>
        Choose funds
      </Text>
      {activeFundingCoins.length === 0 ? (
        <Text>No active VRPC currencies are available for this gift card.</Text>
      ) : (
        activeFundingCoins.map(coinObj => {
          const balance = getCoinBalance(coinObj, activeAccount, ledgerBalances);
          const maxFundAmount = getMaxFundAmount(coinObj, balance);
          const ticker = coinObj.display_ticker || coinObj.id;

          return (
            <View key={coinObj.id}>
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                }}>
                <View style={{flex: 1, paddingRight: 12}}>
                  <Text style={{fontWeight: 'bold'}}>{ticker}</Text>
                  <Text style={{color: Colors.verusDarkGray, fontSize: 12}}>
                    {coinObj.display_name || coinObj.name || coinObj.currency_id}
                  </Text>
                  <Text style={{color: Colors.verusDarkGray, fontSize: 12}}>
                    Balance: {balance == null ? '-' : formatAmount(balance)} {ticker}
                  </Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <TextInput
                    mode="outlined"
                    dense
                    keyboardType="decimal-pad"
                    value={fundAmounts[coinObj.id] || ''}
                    onChangeText={value =>
                      setFundAmounts({
                        ...fundAmounts,
                        [coinObj.id]: value,
                      })
                    }
                    style={{width: 128}}
                  />
                  <Button
                    compact
                    disabled={maxFundAmount == null || !hasAmount(maxFundAmount)}
                    onPress={() =>
                      setFundAmounts({
                        ...fundAmounts,
                        [coinObj.id]: formatAmount(maxFundAmount),
                      })
                    }>
                    Max
                  </Button>
                </View>
              </View>
              <Divider />
            </View>
          );
        })
      )}
    </View>
  );

  const renderIds = () => (
    <View>
      <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 12}}>
        Choose VerusIDs
      </Text>
      {linkedIdentityOptions.length === 0 ? (
        <Text>No linked VerusIDs are available for this gift card.</Text>
      ) : (
        linkedIdentityOptions.map(identity => (
          <View key={identity.key}>
            <Checkbox.Item
              label={identity.fullyQualifiedName || identity.identityAddress}
              status={selectedIds[identity.key] ? 'checked' : 'unchecked'}
              onPress={() =>
                setSelectedIds({
                  ...selectedIds,
                  [identity.key]: !selectedIds[identity.key],
                })
              }
            />
            <Divider />
          </View>
        ))
      )}
    </View>
  );

  const renderReview = () => (
    <View>
      <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 12}}>
        Review funding
      </Text>
      {selections.funds.length > 0 && (
        <View style={{marginBottom: 12}}>
          <Text style={{fontWeight: 'bold'}}>Funds sent from wallet</Text>
          {selections.funds.map(fund => (
            <Text key={`${fund.systemId}:${fund.currencyId}`}>
              {fund.amount} {fund.coinObj.display_ticker || fund.coinObj.id}
            </Text>
          ))}
        </View>
      )}
      {selections.identities.length > 0 && (
        <View style={{marginBottom: 12}}>
          <Text style={{fontWeight: 'bold'}}>VerusIDs moved to gift card</Text>
          {selections.identities.map(identity => (
            <Text key={identity.key}>
              {identity.fullyQualifiedName || identity.identityAddress}
            </Text>
          ))}
        </View>
      )}
      {identityFundingLoading && (
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            marginTop: 4,
            marginBottom: 12,
          }}>
          <ActivityIndicator
            animating
            color={Colors.primaryColor}
            size="small"
            style={{marginRight: 8}}
          />
          <Text style={{color: Colors.verusDarkGray}}>
            Checking selected VerusID balances...
          </Text>
        </View>
      )}
      {identityFundingError != null && (
        <Text style={{color: Colors.warningButtonColor, marginBottom: 12}}>
          {identityFundingError}
        </Text>
      )}
      {!identityFundingLoading && identityFunding.length > 0 && (
        <View
          style={{
            backgroundColor: '#FFF4E8',
            borderColor: Colors.infoButtonColor,
            borderRadius: 8,
            borderWidth: 1,
            marginBottom: 16,
            padding: 12,
          }}>
          <Text style={{fontWeight: 'bold', marginBottom: 6}}>
            Selected VerusIDs already hold funds
          </Text>
          <Text style={{color: Colors.verusDarkGray, marginBottom: 8}}>
            These funds will move with the VerusID when it is transferred to the gift card.
          </Text>
          {identityFunding.map(identity => (
            <View key={identity.key} style={{marginBottom: 8}}>
              <Text style={{fontWeight: 'bold'}}>
                {identity.fullyQualifiedName || identity.identityAddress}
              </Text>
              {(identity.currencies || []).map(currency => (
                <Text key={`${identity.key}:${currency.currencyId}`}>
                  {formatAmount(currency.amount)}{' '}
                  {currency.display?.name ||
                    getCurrencyName(
                      identity.systemId,
                      currency.currencyId,
                      activeCoinsForUser,
                    )}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
      {Object.keys(topups).length > 0 && (
        <View style={{marginTop: 16}}>
          <Text style={{fontWeight: 'bold'}}>Native fee funds added</Text>
          {Object.values(topups).map(topup => (
            <Text key={topup.systemId}>
              {topup.amount}{' '}
              {getCurrencyName(topup.systemId, topup.systemId, activeCoinsForUser)}
            </Text>
          ))}
        </View>
      )}
      {card.encrypted && (
        <TextInput
          mode="outlined"
          label="Gift card claim password"
          value={claimPassword}
          onChangeText={setClaimPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={{marginTop: 16}}
        />
      )}
      {preflightPlan == null ? (
        <Button
          mode="contained"
          icon="shield-check"
          disabled={identityFundingLoading || (card.encrypted && !claimPassword)}
          onPress={buildPreflight}
          style={{marginTop: 16}}>
          Verify and Build
        </Button>
      ) : (
        <View style={{marginTop: 16}}>
          <Text style={{fontWeight: 'bold', marginBottom: 8}}>
            Transactions
          </Text>
          {preflightPlan.transactions.map((tx, index) => (
            <Text key={`${tx.systemId}:${index}`}>
              {tx.type === 'identity' ? 'VerusID update' : 'Currency transfer'} on {tx.systemId}
            </Text>
          ))}
          {identityFeeFundingTransactions.length > 0 && (
            <View
              style={{
                backgroundColor: '#FFF4E8',
                borderColor: Colors.infoButtonColor,
                borderRadius: 8,
                borderWidth: 1,
                marginTop: 16,
                padding: 12,
              }}>
              <Text style={{fontWeight: 'bold', marginBottom: 6}}>
                Fees taken from transferred VerusID
              </Text>
              <Text style={{color: Colors.verusDarkGray, marginBottom: 8}}>
                Sufficient wallet fee funds were not available, so the native network fee was paid from the VerusID being moved to this gift card.
              </Text>
              {identityFeeFundingTransactions.map(tx => (
                <Text key={`${tx.systemId}:${tx.identity.identityAddress}`}>
                  {tx.identity.fullyQualifiedName || tx.identity.identityAddress}
                </Text>
              ))}
            </View>
          )}
          <Button
            mode="contained"
            icon="send"
            onPress={broadcast}
            style={{marginTop: 16}}>
            Confirm
          </Button>
        </View>
      )}
    </View>
  );

  const renderStep = () => {
    if (step === STEP_MODE) return renderMode();
    if (step === STEP_FUNDS) return renderFunds();
    if (step === STEP_IDS) return renderIds();
    return renderReview();
  };

  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
        contentContainerStyle={{
          flexGrow: 1,
          padding: 16,
          paddingBottom: 160,
        }}>
        <Text
          style={{
            color: Colors.primaryColor,
            fontSize: 22,
            fontWeight: 'bold',
            marginBottom: 4,
          }}>
          {card.label}
        </Text>
        <Text style={{color: Colors.verusDarkGray, marginBottom: 24}}>
          Step {currentStepPosition + 1} of {steps.length}
        </Text>
        {renderStep()}
        <View
          style={{
            borderTopColor: Colors.tertiaryColor,
            borderTopWidth: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 32,
            paddingTop: 16,
          }}>
          <Button onPress={goBack}>{stepIndex === 0 ? 'Close' : 'Back'}</Button>
          {step !== STEP_REVIEW && (
            <Button mode="contained" onPress={goNext}>
              Next
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default GiftCardFund;
