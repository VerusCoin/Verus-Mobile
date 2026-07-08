import React, { useCallback, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { networks, ECPair, smarttxs, TransactionBuilder, address as baddress } from '@bitgo/utxo-lib';
import Styles from '../../../styles';
import Colors from '../../../globals/colors';
import { requestPrivKey } from '../../../utils/auth/authBox';
import { VRPC } from '../../../utils/constants/intervalConstants';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import VrpcProvider from '../../../utils/vrpc/vrpcInterface';
import { coinsList } from '../../../utils/CoinData/CoinsList';
import { fromBase58Check } from 'verus-typescript-primitives';

const { getFundedTxBuilder } = smarttxs;

const CLOSEOFFER_FEE_SATS = 1000;
const SAPLING_VERSION_GROUP_ID = 0x892f2085;
const LISTING_DEPOSIT_OWNER_HASH_OFFSET = 56;
const LISTING_DEPOSIT_OWNER_HASH_LENGTH = 20;

const getListingDepositOwnerHash = script => {
  if (!Buffer.isBuffer(script)) return null;
  if (script.length < LISTING_DEPOSIT_OWNER_HASH_OFFSET + LISTING_DEPOSIT_OWNER_HASH_LENGTH) {
    return null;
  }
  return script.slice(
    LISTING_DEPOSIT_OWNER_HASH_OFFSET,
    LISTING_DEPOSIT_OWNER_HASH_OFFSET + LISTING_DEPOSIT_OWNER_HASH_LENGTH,
  );
};

const MarketplaceCloseOfferRequestInfo = props => {
  const { closeOfferRequest, cancel, next, response, request, detailIndex } = props;

  const activeCoin = useSelector(state => state.coins.activeCoin);
  const [submitting, setSubmitting] = useState(false);

  const isTestnet = request && request.isTestnet ? request.isTestnet() : true;
  const coinObj = isTestnet ? coinsList.VRSCTEST : coinsList.VRSC;

  const closeParams =
    closeOfferRequest &&
    closeOfferRequest.containsCloseOfferParams &&
    closeOfferRequest.containsCloseOfferParams()
      ? closeOfferRequest.closeOfferParams
      : null;

  const description =
    closeOfferRequest && closeOfferRequest.containsDesc && closeOfferRequest.containsDesc()
      ? closeOfferRequest.offerDescription
      : null;

  const handleConfirm = useCallback(async () => {
    if (!closeParams) {
      createAlert('Error', 'Marketplace closeoffer request is missing close parameters');
      cancel();
      return;
    }

    setSubmitting(true);
    try {
      const offerTxid = closeParams.offerTxid;
      const endpoint = VrpcProvider.getEndpoint(coinObj.system_id);

      const listingTxRes = await endpoint.getRawTransaction(offerTxid, 1);
      if (
        !listingTxRes ||
        listingTxRes.error ||
        !listingTxRes.result ||
        !listingTxRes.result.vout ||
        !listingTxRes.result.vout[0]
      ) {
        throw new Error(
          (listingTxRes && listingTxRes.error && listingTxRes.error.message) ||
            'Could not fetch listing deposit transaction',
        );
      }

      const depositOutput = listingTxRes.result.vout[0];
      const depositScript = Buffer.from(depositOutput.scriptPubKey.hex, 'hex');
      const inputSats = Math.round((depositOutput.value || 0) * 1e8);
      if (inputSats <= CLOSEOFFER_FEE_SATS) {
        throw new Error('Listing deposit is too small to close');
      }

      // GenericRequests are signed for their own chain. Do not use the UI's
      // currently active coin here; it can point at another wallet namespace
      // and produce a key that does not own the listing deposit.
      const coinTicker = coinObj.id;
      const spendingKey = await requestPrivKey(coinTicker, VRPC);
      const network = networks.verus;
      const keyPair = ECPair.fromWIF(spendingKey, network);
      const ownerAddress = keyPair.getAddress();
      const ownerHash = fromBase58Check(ownerAddress).hash;
      const depositOwnerHash = getListingDepositOwnerHash(depositScript);

      if (!depositOwnerHash || !depositOwnerHash.equals(ownerHash)) {
        throw new Error('This wallet does not own the listing deposit for this offer');
      }

      const txb = new TransactionBuilder(network);
      txb.setVersion(4);
      txb.setVersionGroupId(SAPLING_VERSION_GROUP_ID);
      txb.addInput(offerTxid, 0, 0xffffffff);
      txb.addOutput(
        baddress.toOutputScript(ownerAddress, network),
        inputSats - CLOSEOFFER_FEE_SATS,
      );

      const unsignedHex = txb.buildIncomplete().toHex();
      const fundedTxb = getFundedTxBuilder(unsignedHex, network, [depositScript]);
      fundedTxb.sign(0, keyPair, null, 1, inputSats);
      const closeHex = fundedTxb.build().toHex();
      const sendRes = await endpoint.sendRawTransaction(closeHex);
      if (!sendRes || sendRes.error || !sendRes.result || typeof sendRes.result !== 'string') {
        throw new Error((sendRes && sendRes.error && sendRes.error.message) || 'Broadcast failed');
      }
      const closeTxid = sendRes.result;
      console.log('[MarketplaceCloseOffer] listing deposit spent:', closeTxid);

      const responseURIs = (request && request.responseURIs) || [];
      if (responseURIs.length === 0) {
        throw new Error('Request has no response URI to report closeoffer');
      }
      const responseUri = responseURIs[0].getUriString();

      const postRes = await fetch(responseUri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerTxid, closeTxid, closeHex }),
      }).then(r => r.json());

      if (postRes && postRes.error) {
        throw new Error(postRes.error);
      }

      createAlert('Offer Closed', 'Your listing close transaction was signed and broadcast by this wallet.');
      next(response, [detailIndex]);
    } catch (e) {
      console.error('[MarketplaceCloseOffer] confirm error:', e && e.message, e);
      createAlert('Error', (e && e.message) || 'Failed to close marketplace offer');
      setSubmitting(false);
    }
  }, [closeParams, activeCoin, request, response, detailIndex]);

  if (submitting) {
    return <AnimatedActivityIndicatorBox />;
  }

  return (
    <ScrollView style={Styles.flexBackground}>
      <View style={Styles.headerContainer}>
        <Text style={{ fontSize: 20, color: Colors.quaternaryColor, paddingBottom: 8 }}>
          Confirm Marketplace Unlist
        </Text>
      </View>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 16 }}>
          You are closing a marketplace listing from this wallet. The wallet signs a transaction
          that spends the listing deposit, which removes the offer from the on-chain index.
        </Text>
        {closeParams && (
          <View style={{ backgroundColor: Colors.verusDarkGray, padding: 16, borderRadius: 8 }}>
            <Text style={{ color: Colors.secondaryColor, fontSize: 12 }}>Listing transaction</Text>
            <Text style={{ color: Colors.secondaryColor, fontSize: 13, marginBottom: 12 }}>
              {closeParams.offerTxid}
            </Text>
            {description != null && (
              <>
                <Divider />
                <Text style={{ color: Colors.secondaryColor, fontSize: 12, marginTop: 12 }}>
                  {description}
                </Text>
              </>
            )}
          </View>
        )}
      </View>
      <View style={Styles.footerContainer}>
        <Button mode="text" color={Colors.warningButtonColor} onPress={cancel}>
          Cancel
        </Button>
        <Button mode="contained" color={Colors.primaryColor} onPress={handleConfirm}>
          Close Offer
        </Button>
      </View>
    </ScrollView>
  );
};

export default MarketplaceCloseOfferRequestInfo;
