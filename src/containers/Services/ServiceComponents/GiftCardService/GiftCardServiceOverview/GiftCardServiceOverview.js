import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  Divider,
  IconButton,
  Portal,
  Text,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';
import {
  GENERIC_REQUEST_DEEPLINK_VDXF_KEY,
} from 'verus-typescript-primitives';
import QRModal from '../../../../../components/QRModal';
import {copyToClipboard} from '../../../../../utils/clipboard/clipboard';
import {GIFT_CARD_SERVICE_ID} from '../../../../../utils/constants/services';
import {
  buildGiftCardNfcDeeplinkUri,
  canDeleteGiftCard,
  canStartGiftCardFunding,
  getGiftCardClaimInfo,
  getGiftCardIdentityLookupErrors,
  getGiftCardPendingFundings,
  getRetryableGiftCardFunding,
  hasGiftCardBeenShared,
  hasGiftCardClaims,
  hasGiftCardMempoolTransactions,
  hasPendingGiftCardFunding,
  markGiftCardShared,
  normalizeGiftCardServiceData,
  refreshGiftCardStatus,
  removeGiftCardIfUnchangedAndDeletable,
  upsertGiftCard,
  upsertGiftCardIfUnchanged,
} from '../../../../../utils/giftCard/giftCard';
import {writeDeeplinkUriToNfc} from '../../../../../utils/walletBackup/walletBackupNfc';
import {SET_DEEPLINK_DATA} from '../../../../../utils/constants/storeType';
import Colors from '../../../../../globals/colors';
import Styles from '../../../../../styles';

const fieldWidth = 320;
const GIFT_CARD_REFRESH_INTERVAL_MS = 30000;

const formatCardDate = timestamp => {
  if (!timestamp) return '';

  try {
    return new Date(timestamp).toLocaleDateString();
  } catch (_) {
    return '';
  }
};

const formatCardDateTime = timestamp => {
  if (!timestamp) return '';

  try {
    return new Date(timestamp).toLocaleString();
  } catch (_) {
    return '';
  }
};

const truncateAddress = address => {
  if (!address || address.length <= 22) return address || '';
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
};

const getPrimaryAddress = card => {
  const addresses = Object.values(card.addressesBySystem || {});

  return addresses[0] || '';
};

const getStatusLabel = card => {
  if (card.status?.state === 'redeemed') return 'Redeemed';
  if (hasPendingGiftCardFunding(card)) return 'Pending funding';
  if (card.status?.state === 'funded') return 'Funded';
  return 'Created';
};

const getSystemRows = card => {
  return (card.status?.systems || []).filter(system => {
    return (
      (system.currencies || []).length > 0 ||
      (system.identities || []).length > 0
    );
  });
};

const needsUnfundedShareWarning = card => {
  return (
    card != null &&
    !hasGiftCardClaims(card) &&
    card.status?.state !== 'redeemed' &&
    !card.status?.redeemed
  );
};

const getClaimedByLabel = claimInfo => {
  const addresses = claimInfo?.claimedByAddresses || [];

  if (addresses.length === 0) return 'recipient unavailable';
  if (addresses.length === 1) return truncateAddress(addresses[0]);

  return `${truncateAddress(addresses[0])} +${addresses.length - 1} more`;
};

const getRefreshComparableCard = card => {
  const status = card.status
    ? {
      ...card.status,
      lastCheckedAt: null,
    }
    : null;

  return JSON.stringify({
    fundingHistory: card.fundingHistory || [],
    status,
  });
};

const ShareGiftCardDialog = ({card, onCancel, onCopy, onNfc, onQr}) => {
  const unfunded = needsUnfundedShareWarning(card);

  return (
    <Portal>
      <Dialog visible={card != null} onDismiss={onCancel}>
        <Dialog.Title>Share Gift Card</Dialog.Title>
        <Dialog.Content>
          <ScrollView>
            <Text
              style={{
                color: Colors.verusDarkGray,
                marginBottom: 12,
              }}>
              Sharing exposes the spendable gift-card key. Anyone with this key
              can spend the card.
            </Text>
            {unfunded && (
              <View
                style={{
                  backgroundColor: '#FFF4E8',
                  borderColor: Colors.infoButtonColor,
                  borderRadius: 8,
                  borderWidth: 1,
                  marginBottom: 12,
                  padding: 10,
                }}>
                <View style={{alignItems: 'center', flexDirection: 'row'}}>
                  <MaterialCommunityIcons
                    name="alert-outline"
                    color={Colors.infoButtonColor}
                    size={20}
                    style={{marginRight: 6}}
                  />
                  <Text style={{fontWeight: 'bold'}}>Unfunded gift card</Text>
                </View>
                <Text
                  style={{
                    color: Colors.verusDarkGray,
                    fontSize: 12,
                    marginTop: 6,
                  }}>
                  Anyone who gets the key can spend funds as soon as they arrive.
                  Treat this card as single-use and fund it only once.
                </Text>
              </View>
            )}
            <Button
              mode="contained"
              icon="qrcode"
              onPress={() => onQr(card)}
              style={{marginBottom: 8}}>
              QR Code
            </Button>
            <Button
              mode="contained"
              icon="content-copy"
              onPress={() => onCopy(card)}
              style={{marginBottom: 8}}>
              Copy Link
            </Button>
            <Button
              mode="contained"
              icon="credit-card-wireless"
              onPress={() => onNfc(card)}>
              Write NFC
            </Button>
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel}>Cancel</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const GiftCardServiceOverview = ({
  navigation,
  serviceData,
  saveServiceData,
}) => {
  const dispatch = useDispatch();
  const activeCoinsForUser = useSelector(state => state.coins.activeCoinsForUser);
  const [qrCard, setQrCard] = useState(null);
  const [shareCardTarget, setShareCardTarget] = useState(null);
  const [busyCardId, setBusyCardId] = useState(null);
  const [nfcStatus, setNfcStatus] = useState(null);
  const refreshAllRunningRef = useRef(false);
  const refreshGenerationRef = useRef(0);
  const normalizedData = normalizeGiftCardServiceData(serviceData);
  const cards = useMemo(
    () =>
      Object.values(normalizedData.cards || {}).sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
      ),
    [normalizedData.cards],
  );

  const saveCard = useCallback(
    async (card, expectedCard = null) => {
      const savedData = await saveServiceData(currentData => {
        return expectedCard == null
          ? upsertGiftCard(currentData, card)
          : upsertGiftCardIfUnchanged(currentData, expectedCard, card);
      });

      return savedData.cards?.[card.id] || null;
    },
    [saveServiceData],
  );

  const refreshAllCards = useCallback(async () => {
    const cardList = Object.values(normalizedData.cards || {});
    const refreshGeneration = refreshGenerationRef.current;

    if (cardList.length === 0 || refreshAllRunningRef.current) return;

    refreshAllRunningRef.current = true;

    try {
      const refreshes = [];

      for (const card of cardList) {
        try {
          const refreshed = await refreshGiftCardStatus({
            card,
            activeCoinsForUser,
          });

          if (
            getRefreshComparableCard(refreshed) !==
            getRefreshComparableCard(card)
          ) {
            refreshes.push({
              expectedCard: card,
              refreshedCard: refreshed,
            });
          }
        } catch (e) {
          console.warn(e.message);
        }
      }

      if (
        refreshes.length > 0 &&
        refreshGeneration === refreshGenerationRef.current
      ) {
        await saveServiceData(currentData => {
          return refreshes.reduce(
            (nextData, refresh) =>
              upsertGiftCardIfUnchanged(
                nextData,
                refresh.expectedCard,
                refresh.refreshedCard,
              ),
            currentData,
          );
        });
      }
    } finally {
      refreshAllRunningRef.current = false;
    }
  }, [activeCoinsForUser, normalizedData, saveServiceData]);

  useEffect(() => {
    let refreshInterval = null;

    const stopRefreshInterval = () => {
      refreshGenerationRef.current += 1;

      if (refreshInterval != null) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
    };

    const startRefreshInterval = () => {
      stopRefreshInterval();
      refreshAllCards();
      refreshInterval = setInterval(
        refreshAllCards,
        GIFT_CARD_REFRESH_INTERVAL_MS,
      );
    };

    const unsubscribeFocus = navigation.addListener('focus', startRefreshInterval);
    const unsubscribeBlur = navigation.addListener('blur', stopRefreshInterval);

    if (navigation.isFocused == null || navigation.isFocused()) {
      startRefreshInterval();
    }

    return () => {
      stopRefreshInterval();
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, refreshAllCards]);

  const refreshCard = useCallback(
    async card => {
      setBusyCardId(card.id);

      try {
        const refreshed = await refreshGiftCardStatus({
          card,
          activeCoinsForUser,
        });

        const savedCard = await saveCard(refreshed, card);
        return savedCard || refreshed;
      } catch (e) {
        console.error(e);
        Alert.alert('Network Error', e.message || 'Unable to refresh gift card.');
        throw e;
      } finally {
        setBusyCardId(null);
      }
    },
    [activeCoinsForUser, saveCard],
  );

  const fundCard = async card => {
    if (hasPendingGiftCardFunding(card)) {
      const retryableFunding = getRetryableGiftCardFunding(card);

      if (retryableFunding != null) {
        navigation.navigate('GiftCardFund', {
          cardId: card.id,
          pendingFundingId: retryableFunding.id,
        });
      } else {
        Alert.alert(
          'Pending Funding',
          'Wait for pending funding transactions to confirm before adding more funds.',
        );
      }
      return;
    }

    if (card.status?.state === 'redeemed' || card.status?.redeemed) {
      Alert.alert('Redeemed', 'Redeemed gift cards cannot be funded.');
      return;
    }

    if (hasGiftCardBeenShared(card) && !canStartGiftCardFunding(card)) {
      Alert.alert(
        'Single-use Gift Card',
        'This shared gift card already has funds or a recorded funding attempt. Create a new gift card instead of funding it again.',
      );
      return;
    }

    try {
      const refreshed = await refreshCard(card);

      if (hasPendingGiftCardFunding(refreshed)) {
        const retryableFunding = getRetryableGiftCardFunding(refreshed);

        if (retryableFunding != null) {
          navigation.navigate('GiftCardFund', {
            cardId: refreshed.id,
            pendingFundingId: retryableFunding.id,
          });
        } else {
          Alert.alert(
            'Pending Funding',
            'Wait for pending funding transactions to confirm before adding more funds.',
          );
        }
        return;
      }

      if (refreshed.status?.state === 'redeemed' || refreshed.status?.redeemed) {
        Alert.alert('Redeemed', 'Redeemed gift cards cannot be funded.');
        return;
      }

      if (
        hasGiftCardBeenShared(refreshed) &&
        !canStartGiftCardFunding(refreshed)
      ) {
        Alert.alert(
          'Single-use Gift Card',
          'This shared gift card already has funds or a recorded funding attempt. Create a new gift card instead of funding it again.',
        );
        return;
      }

      navigation.navigate('GiftCardFund', {cardId: card.id});
    } catch (_) {}
  };

  const openCancelFlow = card => {
    Alert.alert(
      'Cancel Gift Card',
      'Redeem this gift card to your own wallet to cancel it and make the shared link unspendable.',
      [
        {text: 'Back', style: 'cancel'},
        {
          text: 'Redeem',
          onPress: () => {
            dispatch({
              type: SET_DEEPLINK_DATA,
              payload: {
                id: GENERIC_REQUEST_DEEPLINK_VDXF_KEY.vdxfid,
                data: card.requestBufferString,
                fromService: GIFT_CARD_SERVICE_ID,
                passthrough: {
                  skipWalletBackupRequests: true,
                },
              },
            });
            navigation.navigate('DeepLink');
          },
        },
      ],
    );
  };

  const cancelCard = async card => {
    if (hasPendingGiftCardFunding(card)) {
      Alert.alert(
        'Pending Funding',
        'Wait for pending funding transactions to confirm before canceling this gift card.',
      );
      return;
    }

    try {
      const refreshed = await refreshCard(card);

      if (hasPendingGiftCardFunding(refreshed)) {
        Alert.alert(
          'Pending Funding',
          'Wait for pending funding transactions to confirm before canceling this gift card.',
        );
        return;
      }

      if (!hasGiftCardClaims(refreshed)) {
        Alert.alert(
          'Empty Gift Card',
          'This gift card has no funds or VerusIDs to redeem.',
        );
        return;
      }

      openCancelFlow(refreshed);
    } catch (_) {}
  };

  const deleteCard = async card => {
    setBusyCardId(card.id);

    try {
      const refreshed = await refreshGiftCardStatus({
        card,
        activeCoinsForUser,
      });

      if (!canDeleteGiftCard(refreshed)) {
        await saveCard(refreshed, card);
        Alert.alert(
          'Cannot Delete',
          'This gift card still has funds, VerusIDs, pending funding, or could not be fully checked.',
        );
        return;
      }

      if (await hasGiftCardMempoolTransactions(refreshed)) {
        await saveCard(refreshed, card);
        Alert.alert(
          'Cannot Delete',
          'This gift card has a pending transaction in the mempool. Wait for it to confirm, then refresh the card before deleting it.',
        );
        return;
      }

      const savedData = await saveServiceData(currentData =>
        removeGiftCardIfUnchangedAndDeletable(currentData, card),
      );

      if (savedData.cards?.[card.id] != null) {
        Alert.alert(
          'Cannot Delete',
          'This gift card changed while deletion checks were running. Refresh it and try again.',
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert(
        'Unable to Delete',
        e.message || 'Unable to verify that this gift card can be deleted.',
      );
    } finally {
      setBusyCardId(null);
    }
  };

  const confirmDeleteCard = card => {
    if (!canDeleteGiftCard(card)) return;

    const hasBeenClaimed =
      card.status?.state === 'redeemed' || card.status?.redeemed;
    const message = hasBeenClaimed
      ? 'Are you sure you want to delete this gift card from this device?'
      : 'Are you sure you want to delete this gift card from this device? If there are any pending funds coming to the card, they will be permanently lost if the card is deleted.';

    Alert.alert(
      'Delete Gift Card',
      message,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCard(card),
        },
      ],
    );
  };

  const explainDeleteUnavailable = card => {
    if (hasPendingGiftCardFunding(card)) {
      Alert.alert(
        'Cannot Delete',
        'This gift card has pending funding transactions. Refresh after they confirm before deleting it.',
      );
      return;
    }

    if (hasGiftCardClaims(card)) {
      Alert.alert(
        'Cannot Delete',
        'This gift card still has funds or VerusIDs. Redeem or empty it, then refresh before deleting it.',
      );
      return;
    }

    Alert.alert(
      'Cannot Delete',
      'Refresh the gift card status before deleting it.',
    );
  };

  const shareNfc = async card => {
    if (!card) return;

    setNfcStatus('Preparing NFC writer...');

    try {
      await writeDeeplinkUriToNfc(buildGiftCardNfcDeeplinkUri(card), {
        onStatus: setNfcStatus,
      });
      Alert.alert('Success', 'Gift card written to NFC card.');
    } catch (e) {
      console.error(e);
      Alert.alert('NFC Error', e.message);
    } finally {
      setNfcStatus(null);
    }
  };

  const shareCard = card => {
    setShareCardTarget(card);
  };

  const markCardSharedForAction = async card => {
    if (hasGiftCardBeenShared(card)) return card;

    const savedData = await saveServiceData(currentData => {
      const normalized = normalizeGiftCardServiceData(currentData);
      const currentCard = normalized.cards?.[card.id];

      if (currentCard == null) {
        throw new Error('Gift card is no longer available.');
      }

      return upsertGiftCard(
        normalized,
        markGiftCardShared(currentCard),
      );
    });
    const sharedCard = savedData.cards?.[card.id];

    if (!hasGiftCardBeenShared(sharedCard)) {
      throw new Error(
        'Gift card state changed before it could be marked as shared.',
      );
    }

    return sharedCard;
  };

  const runShareAction = async (card, action) => {
    setShareCardTarget(null);
    setBusyCardId(card.id);

    try {
      const sharedCard = await markCardSharedForAction(card);
      await action(sharedCard);
    } catch (e) {
      console.error(e);
      Alert.alert('Unable to Share', e.message || 'Unable to share gift card.');
    } finally {
      setBusyCardId(null);
    }
  };

  const shareQr = card => {
    runShareAction(card, sharedCard => {
      setQrCard(sharedCard);
    });
  };

  const shareCopy = card => {
    runShareAction(card, sharedCard => {
      copyToClipboard(sharedCard.requestUri, {
        title: 'Copied',
        message: 'Gift card link copied to clipboard.',
      });
    });
  };

  const shareNfcFromDialog = card => {
    runShareAction(card, shareNfc);
  };

  const renderCard = card => {
    const systemRows = getSystemRows(card);
    const primaryAddress = getPrimaryAddress(card);
    const busy = busyCardId === card.id;
    const pendingFundings = getGiftCardPendingFundings(card);
    const pending = pendingFundings.length > 0;
    const retryableFunding = getRetryableGiftCardFunding(card);
    const hasClaims = hasGiftCardClaims(card);
    const deleteEnabled = canDeleteGiftCard(card);
    const claimInfo = getGiftCardClaimInfo(card);
    const claimedAt = formatCardDateTime(claimInfo?.claimedAt);
    const identityLookupErrors = getGiftCardIdentityLookupErrors(card);
    const unfundedShareWarning = needsUnfundedShareWarning(card);

    return (
      <Card key={card.id} style={{marginBottom: 12, borderRadius: 8}}>
        <Card.Title
          title={card.label}
          subtitle={`${getStatusLabel(card)}${card.encrypted ? ' • encrypted' : ''}${hasGiftCardBeenShared(card) ? ' • shared' : ''}${formatCardDate(card.createdAt) ? ` • ${formatCardDate(card.createdAt)}` : ''}`}
          left={props => (
            <MaterialCommunityIcons
              {...props}
              name="gift-outline"
              color={Colors.primaryColor}
              size={32}
            />
          )}
          right={props =>
            busy ? (
              <ActivityIndicator
                {...props}
                animating
                color={Colors.primaryColor}
                style={{marginRight: 16}}
              />
            ) : (
              <IconButton
                {...props}
                icon="refresh"
                onPress={() => refreshCard(card)}
              />
            )
          }
        />
        <Card.Content>
          <Text
            style={{
              color: Colors.verusDarkGray,
              fontSize: 12,
              marginBottom: 8,
            }}>
            {truncateAddress(primaryAddress)}
          </Text>
          {claimInfo != null && (
            <View
              style={{
                backgroundColor: '#F3FAF7',
                borderColor: Colors.verusGreenColor,
                borderRadius: 8,
                borderWidth: 1,
                marginBottom: 10,
                padding: 10,
              }}>
              <View style={{alignItems: 'center', flexDirection: 'row'}}>
                <MaterialCommunityIcons
                  name="account-check-outline"
                  color={Colors.verusGreenColor}
                  size={18}
                  style={{marginRight: 6}}
                />
                <Text style={{color: Colors.verusDarkGray, fontSize: 12}}>
                  {`Claimed by ${getClaimedByLabel(claimInfo)}`}
                </Text>
              </View>
              <Text
                style={{
                  color: Colors.verusDarkGray,
                  fontSize: 12,
                  marginTop: 4,
                }}>
                {claimedAt
                  ? `Claimed at ${claimedAt}`
                  : claimInfo.height
                  ? `Claimed at block ${claimInfo.height}`
                  : 'Claim time unavailable'}
              </Text>
            </View>
          )}
          {systemRows.length === 0 && claimInfo == null ? (
            <Text style={{color: Colors.verusDarkGray}}>
              {identityLookupErrors.length > 0
                ? 'VerusID lookup unavailable on this endpoint. ID-only cards funded outside this wallet require an endpoint started with -idindex=1.'
                : 'No funds or VerusIDs found.'}
            </Text>
          ) : systemRows.length > 0 ? (
            systemRows.map(system => (
              <View key={system.systemId} style={{marginBottom: 8}}>
                <Text style={{fontWeight: 'bold'}}>
                  {system.coinObj?.display_ticker || system.coinObj?.id || system.systemId}
                </Text>
                {(system.currencies || []).map(currency => (
                  <Text key={currency.currencyId}>
                    {currency.amount} {currency.display?.name || currency.currencyId}
                  </Text>
                ))}
                {(system.identities || []).map(identity => (
                  <Text key={identity.identityAddress}>
                    {identity.fullyQualifiedName || identity.identityAddress}
                  </Text>
                ))}
              </View>
            ))
          ) : null}
          {pendingFundings.length > 0 && (
            <View
              style={{
                backgroundColor: '#FFF4E8',
                borderColor: Colors.infoButtonColor,
                borderRadius: 8,
                borderWidth: 1,
                marginTop: 12,
                padding: 10,
              }}>
              <Text style={{fontWeight: 'bold', marginBottom: 6}}>
                Pending funding
              </Text>
              {pendingFundings.map((entry, entryIndex) =>
                <View key={entryIndex}>
                  {(entry.identities || []).map(identity => (
                    <Text
                      key={`${entryIndex}:${identity.identityAddress}`}
                      style={{
                        color: Colors.verusDarkGray,
                        fontSize: 12,
                        marginTop: 2,
                      }}>
                      Waiting for {identity.fullyQualifiedName || identity.identityAddress}
                    </Text>
                  ))}
                  {(entry.txids || []).map(txid => (
                    <View
                      key={`${entryIndex}:${txid}`}
                      style={{
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 4,
                      }}>
                      <Text
                        selectable
                        style={{
                          color: Colors.verusDarkGray,
                          flex: 1,
                          fontSize: 12,
                          marginRight: 8,
                        }}>
                        {txid}
                      </Text>
                      <IconButton
                        icon="content-copy"
                        size={18}
                        onPress={() =>
                          copyToClipboard(txid, {
                            title: 'Copied',
                            message: 'Transaction ID copied to clipboard.',
                          })
                        }
                      />
                    </View>
                  ))}
                </View>,
              )}
            </View>
          )}
        </Card.Content>
        <Divider style={{marginTop: 8}} />
        <Card.Actions style={{justifyContent: 'space-between'}}>
          <Button
            compact
            icon="cash-plus"
            disabled={
              card.status?.state === 'redeemed' ||
              (pending && retryableFunding == null) ||
              busy
            }
            onPress={() => fundCard(card)}>
            {retryableFunding == null ? 'Fund' : 'Retry'}
          </Button>
          <Button
            compact
            icon="close-circle-outline"
            disabled={busy || pending || !hasClaims}
            onPress={() => cancelCard(card)}>
            Cancel
          </Button>
          <Button
            compact
            icon="share-variant"
            disabled={busy}
            onPress={() => shareCard(card)}>
            Share
          </Button>
          <IconButton
            icon="delete-outline"
            disabled={busy}
            iconColor={deleteEnabled ? Colors.warningButtonColor : Colors.verusDarkGray}
            style={!deleteEnabled ? {opacity: 0.45} : null}
            onPress={() =>
              deleteEnabled
                ? confirmDeleteCard(card)
                : explainDeleteUnavailable(card)
            }
          />
        </Card.Actions>
      </Card>
    );
  };

  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <View style={{...Styles.fullWidth, flex: 1}}>
        <ShareGiftCardDialog
          card={shareCardTarget}
          onCancel={() => setShareCardTarget(null)}
          onCopy={shareCopy}
          onNfc={shareNfcFromDialog}
          onQr={shareQr}
        />
        <QRModal
          animationType="slide"
          visible={qrCard != null}
          qrString={qrCard?.requestUri || ''}
          title="Gift Card QR"
          description={qrCard?.label || 'Gift Card'}
          fileName={qrCard ? `GiftCard-${qrCard.id}` : 'GiftCard'}
          showVerusIconInQr
          cancel={() => setQrCard(null)}
        />
        {nfcStatus != null && (
          <View
            style={{
              alignItems: 'center',
              backgroundColor: Colors.secondaryColor,
              bottom: 0,
              justifyContent: 'center',
              left: 0,
              paddingHorizontal: 32,
              position: 'absolute',
              right: 0,
              top: 0,
              zIndex: 99,
            }}>
            <MaterialCommunityIcons
              name="credit-card-wireless"
              size={64}
              color={Colors.primaryColor}
              style={{marginBottom: 24}}
            />
            <ActivityIndicator animating color={Colors.primaryColor} size="large" />
            <Text
              style={{
                color: Colors.verusDarkGray,
                fontSize: 22,
                fontWeight: 'bold',
                marginTop: 24,
                textAlign: 'center',
              }}>
              {nfcStatus}
            </Text>
          </View>
        )}
        <ScrollView
          style={{
            ...Styles.fullWidth,
            ...Styles.backgroundColorWhite,
            flex: 1,
          }}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 120,
          }}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
            <Text
              style={{
                color: Colors.primaryColor,
                fontSize: 22,
                fontWeight: 'bold',
              }}>
              Gift Cards
            </Text>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => navigation.navigate('GiftCardCreate')}>
              Create
            </Button>
          </View>
          {cards.length === 0 ? (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 24,
                paddingVertical: 64,
              }}>
              <MaterialCommunityIcons
                name="gift-outline"
                size={56}
                color={Colors.primaryColor}
                style={{marginBottom: 16}}
              />
              <Text
                style={{
                  color: Colors.verusDarkGray,
                  maxWidth: fieldWidth,
                  textAlign: 'center',
                }}>
                No gift cards have been created for this profile.
              </Text>
            </View>
          ) : (
            cards.map(renderCard)
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default GiftCardServiceOverview;
