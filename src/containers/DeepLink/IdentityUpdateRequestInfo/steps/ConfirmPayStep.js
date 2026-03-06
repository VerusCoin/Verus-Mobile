/*
  ConfirmPayStep (Step 4 / final step)
  - 2026-02-05: Created. Replaces IdentityUpdatePaymentConfiguration and the
    UpdateIdentity SendModal (Form/Confirm/Result).
  - 2026-02-05: Refactored to always render the confirm layout. Fund source
    selection is now triggered via a tappable card that opens a SemiModal sheet.
  - 2026-02-06: Replaced FundSourceSelectList with custom grey-card source list
    matching SendSourceSubwalletSheet visual style.
  - 2026-02-06: Cleaned up icons -- removed heavy icons from fee card and recap
    rows, kept wallet icon on payment source card. Added fiat fee display below
    crypto fee using Redux rates (WYRE_SERVICE -> GENERAL fallback).
*/
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { Button, Portal, Text } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { formatCurrency } from 'react-native-format-currency';
import Colors from '../../../../globals/colors';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedActivityIndicatorBox from '../../../../components/AnimatedActivityIndicatorBox';
import GradientButton from '../../../../components/GradientButton';
import SemiModal from '../../../../components/SemiModal';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';
import { coinsList } from '../../../../utils/CoinData/CoinsList';
import { CoinDirectory } from '../../../../utils/CoinData/CoinDirectory';
import { createUpdateIdentityTx, pushUpdateIdentityTx } from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import { requestPrivKey } from '../../../../utils/auth/authBox';
import { satsToCoins, truncateDecimal } from '../../../../utils/math';
import { API_GET_BALANCES, API_SEND, GENERAL, WYRE_SERVICE, USD } from '../../../../utils/constants/intervalConstants';
import BigNumber from 'bignumber.js';
import {
  CompactAddressObject,
  GenericResponse,
  IdentityUpdateResponseDetails,
  IdentityUpdateResponseOrdinalVDXFObject,
  VerifiableSignatureData,
} from 'verus-typescript-primitives';
import localStyles from '../styles/ConfirmPayStep.styles';

const ConfirmPayStep = ({
  details,
  requestIsTestnet,
  subjectIdentity,
  subjectIdTxHex,
  updateIdTxHex,
  friendlyNames,
  coinObj,
  responseBufferString,
  detailIndex,
  next,
  cancel,
  onGoBack,
  highRiskCount,
  contentCount,
  styles: parentStyles,
}) => {
  const [selectedSource, setSelectedSource] = useState(null);
  const [fee, setFee] = useState(null);
  const [feeCurrency, setFeeCurrency] = useState(null);
  const [txHex, setTxHex] = useState(null);
  const [utxos, setUtxos] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [sourceSheetVisible, setSourceSheetVisible] = useState(false);

  const activeCoinsForUser = useObjectSelector(state => state.coins.activeCoinsForUser);
  const allSubWallets = useObjectSelector(state => state.coinMenus.allSubWallets);
  const allBalances = useObjectSelector(state => state.ledger.balances);

  const signerIdentityAddress = subjectIdentity.identity
    ? subjectIdentity.identity.identityaddress
    : subjectIdentity.identityaddress;

  const requestedCurrency = useMemo(() => {
    if (details.containsSystem()) return details.systemID.toAddress();
    return requestIsTestnet ? coinsList.VRSCTEST.currency_id : coinsList.VRSC.currency_id;
  }, [details, requestIsTestnet]);

  const feeCurrencyDisplay = useMemo(() => {
    if (!feeCurrency) return '';
    if (friendlyNames[feeCurrency]) return friendlyNames[feeCurrency].replace('@', '');
    return feeCurrency;
  }, [feeCurrency, friendlyNames]);

  const hasFee = fee != null && !calculating;

  // --- Fiat fee display ---
  const rates = useObjectSelector(state => state.ledger.rates);
  const displayCurrency = useSelector(
    state => state.settings.generalWalletSettings.displayCurrency || USD,
  );

  const feeFiatDisplay = useMemo(() => {
    if (!fee || !feeCurrency) return null;

    // Find the coin ID for the fee currency to look up rate
    let feeCoinId = null;
    try {
      const coin = CoinDirectory.findCoinObj(feeCurrency);
      if (coin) feeCoinId = coin.id;
    } catch (e) {}

    if (!feeCoinId) return null;

    const rate = rates?.[WYRE_SERVICE]?.[feeCoinId]?.[displayCurrency] != null
      ? rates[WYRE_SERVICE][feeCoinId][displayCurrency]
      : rates?.[GENERAL]?.[feeCoinId]?.[displayCurrency] != null
        ? rates[GENERAL][feeCoinId][displayCurrency]
        : null;

    if (!rate) return null;

    try {
      const fiatValue = BigNumber(fee).multipliedBy(BigNumber(rate));
      if (fiatValue.isNaN() || !fiatValue.isFinite()) return null;
      const [formatted] = formatCurrency({
        amount: fiatValue.decimalPlaces(2, BigNumber.ROUND_HALF_UP).toNumber(),
        code: displayCurrency,
      });
      return formatted;
    } catch (e) {
      return null;
    }
  }, [fee, feeCurrency, rates, displayCurrency]);

  // --- Build available payment sources ---
  const paymentSources = useMemo(() => {
    const sources = [];

    for (const cObj of activeCoinsForUser) {
      if (cObj.currency_id !== requestedCurrency) continue;

      const chainTicker = cObj.id;
      const subWallets = allSubWallets[chainTicker] || [];

      for (const wallet of subWallets) {
        if (!wallet.network) continue;

        // Get balance for this wallet
        const balanceChannel = wallet.api_channels?.[API_GET_BALANCES];
        const balanceData = balanceChannel && allBalances[balanceChannel]?.[chainTicker];
        const balance = balanceData?.total != null ? BigNumber(balanceData.total) : BigNumber(0);

        if (balance.isGreaterThan(0)) {
          sources.push({
            coinObj: cObj,
            wallet,
            balance,
            balanceDisplay: truncateDecimal(balance, 4),
          });
        }
      }
    }

    return sources;
  }, [activeCoinsForUser, allSubWallets, allBalances, requestedCurrency]);

  // --- Handlers ---

  const handleSelectSource = useCallback(async (source) => {
    setSourceSheetVisible(false);
    setSelectedSource(source);
    setCalculating(true);
    setFee(null);
    setFeeCurrency(null);

    try {
      const [channelName, address, systemId] = source.wallet.channel.split('.');

      const updateIdentityTx = await createUpdateIdentityTx(
        systemId,
        details,
        address,
        subjectIdTxHex,
        subjectIdentity.blockheight,
        true,
        updateIdTxHex,
        requestIsTestnet,
      );

      if (updateIdentityTx.deltas.size !== 1) throw new Error('Unknown fees');

      const feeObj = Object.fromEntries(updateIdentityTx.deltas.entries());
      const currency = Object.keys(feeObj)[0];

      setFee(satsToCoins(BigNumber(updateIdentityTx.deltas.get(currency).abs().toString())).toString());
      setFeeCurrency(currency);
      setTxHex(updateIdentityTx.hex);
      setUtxos(updateIdentityTx.utxos);
    } catch (e) {
      setSelectedSource(null);
      Alert.alert('Error', e.message || 'Failed to calculate fee');
    }

    setCalculating(false);
  }, [details, subjectIdTxHex, subjectIdentity, updateIdTxHex, requestIsTestnet]);

  const handleUpdate = useCallback(async () => {
    setBroadcasting(true);

    try {
      const { wallet, coinObj: sourceCoinObj } = selectedSource;
      const [channelName, channelAddress, systemId] = wallet.api_channels[API_SEND].split('.');

      const spendingKey = await requestPrivKey(sourceCoinObj.id, channelName);

      const keys = [];
      for (let i = 0; i < utxos.length; i++) {
        keys.push([spendingKey]);
      }

      const result = await pushUpdateIdentityTx(systemId, txHex, utxos, keys);

      if (result.error) throw new Error(result.error.message);

      const txid = result.result;

      // Build response (mirrored from IdentityUpdatePaymentConfiguration)
      const baseResponse = new GenericResponse();
      if (responseBufferString && responseBufferString.length > 0) {
        baseResponse.fromBuffer(Buffer.from(responseBufferString, 'hex'), 0);
      }

      const responseDetail = new IdentityUpdateResponseOrdinalVDXFObject({
        data: new IdentityUpdateResponseDetails({
          requestID: details.containsRequestID() ? details.requestID : undefined,
          txid: txid ? Buffer.from(txid, 'hex').reverse() : undefined,
        }),
      });

      if (baseResponse.details == null) baseResponse.details = [];
      baseResponse.details = [...baseResponse.details, responseDetail];

      if (baseResponse.signature == null) {
        baseResponse.signature = new VerifiableSignatureData({
          systemID: CompactAddressObject.fromIAddress(coinObj.system_id),
          identityID: CompactAddressObject.fromIAddress(signerIdentityAddress),
        });
        baseResponse.setSigned();
      }

      if (next) {
        next(baseResponse, [detailIndex]);
      } else {
        cancel();
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to broadcast transaction');
      setBroadcasting(false);
    }
  }, [selectedSource, txHex, utxos, details, responseBufferString, coinObj, signerIdentityAddress, next, detailIndex, cancel]);

  // --- Full-screen broadcasting state ---
  if (broadcasting) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <AnimatedActivityIndicatorBox />
        <Text style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
          Broadcasting transaction...
        </Text>
      </View>
    );
  }

  // --- Always render confirm layout ---
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={parentStyles.scrollView}
        contentContainerStyle={parentStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={parentStyles.header}>
          <Text style={parentStyles.mainTitle}>Confirm update</Text>
          <Text style={parentStyles.subtitle}>Select a payment source and confirm the identity update</Text>
        </View>

        {/* Payment source card -- tappable to open sheet */}
        <TouchableOpacity
          style={localStyles.sourceSelectCard}
          onPress={() => setSourceSheetVisible(true)}
          activeOpacity={0.7}
        >
          <View style={localStyles.sourceSelectRow}>
            <MaterialCommunityIcons
              name={selectedSource ? 'wallet-outline' : 'wallet-plus-outline'}
              size={22}
              color={selectedSource ? Colors.primaryColor : '#888'}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={localStyles.sourceSelectLabel}>
                {selectedSource ? 'PAYING FROM' : 'PAYMENT SOURCE'}
              </Text>
              <Text style={localStyles.sourceSelectValue}>
                {selectedSource
                  ? `${selectedSource.coinObj.display_ticker} - ${selectedSource.wallet.name}`
                  : 'Select payment source'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#CCC" />
          </View>
        </TouchableOpacity>

        {/* Fee card */}
        <View style={localStyles.feeCard}>
          <Text style={localStyles.feeLabel}>Transaction fee</Text>
          {calculating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <ActivityIndicator size="small" color={Colors.primaryColor} style={{ marginRight: 8 }} />
              <Text style={localStyles.feeCalculating}>Calculating...</Text>
            </View>
          ) : hasFee ? (
            <View>
              <Text style={localStyles.feeValue}>{fee} {feeCurrencyDisplay}</Text>
              {feeFiatDisplay && (
                <Text style={localStyles.feeFiat}>{feeFiatDisplay}</Text>
              )}
            </View>
          ) : (
            <Text style={localStyles.feePlaceholder}>Select a payment source to see fee</Text>
          )}
        </View>

        {/* Recap card */}
        <View style={localStyles.recapCard}>
          <Text style={localStyles.recapTitle}>Changes recap</Text>
          {highRiskCount > 0 && (
            <View style={localStyles.recapRow}>
              <Text style={localStyles.recapText}>{highRiskCount} high-risk {highRiskCount === 1 ? 'change' : 'changes'} acknowledged</Text>
            </View>
          )}
          <View style={localStyles.recapRow}>
            <Text style={localStyles.recapText}>{contentCount} content {contentCount === 1 ? 'change' : 'changes'}</Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer: Back + Update */}
      <View style={parentStyles.footer}>
        <View style={parentStyles.ctaCol}>
          <Button
            mode="contained"
            onPress={onGoBack}
            style={parentStyles.secondaryCta}
            contentStyle={parentStyles.secondaryCtaContent}
            uppercase={false}
            buttonColor="#EBF6FF"
            textColor={Colors.primaryColor}
            labelStyle={parentStyles.secondaryCtaLabel}
          >
            Back
          </Button>
        </View>
        <View style={parentStyles.ctaCol}>
          <GradientButton
            onPress={handleUpdate}
            style={parentStyles.primaryCta}
            disabled={!hasFee}
          >
            Update
          </GradientButton>
        </View>
      </View>

      {/* Fund source selection sheet -- grey card style */}
      <Portal>
        <SemiModal
          animationType="slide"
          transparent={true}
          visible={sourceSheetVisible}
          onRequestClose={() => setSourceSheetVisible(false)}
          title="Select payment source"
          flexHeight={0.01}
          contentContainerStyle={{
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            flex: 0,
            width: '100%',
            alignSelf: 'flex-end',
            paddingBottom: 32,
            maxHeight: '70%',
          }}
        >
          <View style={localStyles.sheetDescription}>
            <Text style={localStyles.sheetDescriptionText}>
              Choose a wallet to pay the identity update fee from.
            </Text>
          </View>
          <ScrollView>
            <View style={localStyles.sheetListContainer}>
              {paymentSources.length === 0 ? (
                <View style={localStyles.sheetEmpty}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#999" style={{ marginBottom: 8 }} />
                  <Text style={localStyles.sheetEmptyText}>
                    No wallets with sufficient balance found.
                  </Text>
                </View>
              ) : (
                paymentSources.map((source, index) => (
                  <TouchableOpacity
                    key={`${source.coinObj.id}-${source.wallet.id}-${index}`}
                    style={localStyles.walletCard}
                    onPress={() => handleSelectSource(source)}
                    activeOpacity={0.7}
                  >
                    <View style={localStyles.walletAddressSection}>
                      <Text style={localStyles.walletAddressText} numberOfLines={1}>
                        {source.wallet.name || source.wallet.id}
                      </Text>
                    </View>
                    <View style={localStyles.walletBalanceSection}>
                      <Text style={localStyles.walletBalanceAmount}>
                        {source.balanceDisplay}
                      </Text>
                      <Text style={localStyles.walletBalanceTicker}>
                        {source.coinObj.display_ticker}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color="#CCC"
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </SemiModal>
      </Portal>
    </View>
  );
};

export default ConfirmPayStep;
