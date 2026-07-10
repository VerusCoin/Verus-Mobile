import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Keyboard,
  SafeAreaView,
  ScrollView,
  TouchableWithoutFeedback,
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
  getGiftCardPendingFundings,
  hasGiftCardClaims,
  hasPendingGiftCardFunding,
  normalizeGiftCardServiceData,
  refreshGiftCardStatus,
  removeGiftCard,
  upsertGiftCard,
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
  return (
    <Portal>
      <Dialog visible={card != null} onDismiss={onCancel}>
        <Dialog.Title>Share Gift Card</Dialog.Title>
        <Dialog.Content>
          <ScrollView>
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
  const normalizedData = normalizeGiftCardServiceData(serviceData);
  const cards = useMemo(
    () =>
      Object.values(normalizedData.cards || {}).sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
      ),
    [normalizedData.cards],
  );

  const saveCard = useCallback(
    async card => {
      await saveServiceData(upsertGiftCard(normalizedData, card));
    },
    [normalizedData, saveServiceData],
  );

  const refreshAllCards = useCallback(async () => {
    const cardList = Object.values(normalizedData.cards || {});

    if (cardList.length === 0 || refreshAllRunningRef.current) return;

    refreshAllRunningRef.current = true;

    try {
      let nextData = normalizedData;
      let changed = false;

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
            nextData = upsertGiftCard(nextData, refreshed);
            changed = true;
          }
        } catch (e) {
          console.warn(e.message);
        }
      }

      if (changed) {
        await saveServiceData(nextData);
      }
    } finally {
      refreshAllRunningRef.current = false;
    }
  }, [activeCoinsForUser, normalizedData, saveServiceData]);

  useEffect(() => {
    let refreshInterval = null;

    const stopRefreshInterval = () => {
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

        await saveCard(refreshed);
        return refreshed;
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
      Alert.alert(
        'Pending Funding',
        'Wait for pending funding transactions to confirm before adding more funds.',
      );
      return;
    }

    if (card.status?.state === 'redeemed' || card.status?.redeemed) {
      Alert.alert('Redeemed', 'Redeemed gift cards cannot be funded.');
      return;
    }

    try {
      const refreshed = await refreshCard(card);

      if (hasPendingGiftCardFunding(refreshed)) {
        Alert.alert(
          'Pending Funding',
          'Wait for pending funding transactions to confirm before adding more funds.',
        );
        return;
      }

      if (refreshed.status?.state === 'redeemed' || refreshed.status?.redeemed) {
        Alert.alert('Redeemed', 'Redeemed gift cards cannot be funded.');
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
        await saveCard(refreshed);
        Alert.alert(
          'Cannot Delete',
          'This gift card still has funds, VerusIDs, or pending funding.',
        );
        return;
      }

      await saveServiceData(removeGiftCard(normalizedData, card.id));
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message);
    } finally {
      setBusyCardId(null);
    }
  };

  const confirmDeleteCard = card => {
    if (!canDeleteGiftCard(card)) return;

    Alert.alert(
      'Delete Gift Card',
      'Are you sure you want to delete this gift card from this device?',
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

  const shareQr = card => {
    setShareCardTarget(null);
    setQrCard(card);
  };

  const shareCopy = card => {
    setShareCardTarget(null);
    copyToClipboard(card.requestUri, {
      title: 'Copied',
      message: 'Gift card link copied to clipboard.',
    });
  };

  const shareNfcFromDialog = card => {
    setShareCardTarget(null);
    shareNfc(card);
  };

  const renderCard = card => {
    const systemRows = getSystemRows(card);
    const primaryAddress = getPrimaryAddress(card);
    const busy = busyCardId === card.id;
    const pendingFundings = getGiftCardPendingFundings(card);
    const pending = pendingFundings.length > 0;
    const hasClaims = hasGiftCardClaims(card);
    const deleteEnabled = canDeleteGiftCard(card);

    return (
      <Card key={card.id} style={{marginBottom: 12, borderRadius: 8}}>
        <Card.Title
          title={card.label}
          subtitle={`${getStatusLabel(card)}${card.encrypted ? ' • encrypted' : ''}${formatCardDate(card.createdAt) ? ` • ${formatCardDate(card.createdAt)}` : ''}`}
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
          {systemRows.length === 0 ? (
            <Text style={{color: Colors.verusDarkGray}}>
              No funds or VerusIDs found.
            </Text>
          ) : (
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
          )}
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
            disabled={card.status?.state === 'redeemed' || pending || busy}
            onPress={() => fundCard(card)}>
            Fund
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={Styles.defaultRoot}>
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
          style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
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
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default GiftCardServiceOverview;
