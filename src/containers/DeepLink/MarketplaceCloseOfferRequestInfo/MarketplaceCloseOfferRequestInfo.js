/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useSelector } from 'react-redux';
import {
  networks, ECPair, smarttxs, TransactionBuilder, address as baddress,
} from '@bitgo/utxo-lib';
import { Identity, IdentityScript } from 'verus-typescript-primitives';
import Styles from '../../../styles';
import Colors from '../../../globals/colors';
import { requestPrivKey } from '../../../utils/auth/authBox';
import { VRPC } from '../../../utils/constants/intervalConstants';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import VrpcProvider from '../../../utils/vrpc/vrpcInterface';
import { coinsList } from '../../../utils/CoinData/CoinsList';
import { getIdentity } from '../../../utils/api/channels/verusid/requests/getIdentity';
import { parseNftPreview } from '../../../utils/marketplace/parseNftPreview';
import { verifyNftContentHash } from '../../../utils/marketplace/nftIntegrity';
import MarketplaceAssetPreview from '../components/MarketplaceAssetPreview';
import MarketplaceActionStatus, {
  getMarketplaceActionError,
} from '../components/MarketplaceActionStatus';
import cardStyles from '../components/marketplaceCardStyles';

const { getFundedTxBuilder } = smarttxs;

const CLOSEOFFER_FEE_SATS = 1000;
const SAPLING_VERSION_GROUP_ID = 0x892f2085;
const CLOSE_OFFER_STEPS = [
  'Checking offer ownership',
  'Unlocking wallet',
  'Closing offer on-chain',
  'Returning to marketplace',
];

/**
 * Confirmation screen for marketplace closeoffer requests. A native offer locks
 * the NFT identity inside the offer CC output; closing it is simply spending
 * that output back into a normal identity output owned by the seller. That single
 * spend both recovers the NFT and invalidates the offer's takeable partial (which
 * spends the same output), so no separate identity-move is needed.
 */
const MarketplaceCloseOfferRequestInfo = (props) => {
  const {
    closeOfferRequest, cancel, next, response, request, detailIndex,
  } = props;

  const activeCoin = useSelector((state) => state.coins.activeCoin);
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState(0);
  const [submitError, setSubmitError] = useState(null);
  const [identityName, setIdentityName] = useState(null);
  const [assetPreview, setAssetPreview] = useState(null);
  const [verification, setVerification] = useState(null);

  const isTestnet = request && request.isTestnet ? request.isTestnet() : true;
  const coinObj = isTestnet ? coinsList.VRSCTEST : coinsList.VRSC;

  const closeParams = closeOfferRequest
    && closeOfferRequest.containsCloseOfferParams
    && closeOfferRequest.containsCloseOfferParams()
    ? closeOfferRequest.closeOfferParams
    : null;

  // The NFT identity ref this closeoffer applies to rides in offerDescription.
  const description = closeOfferRequest && closeOfferRequest.containsDesc && closeOfferRequest.containsDesc()
    ? closeOfferRequest.offerDescription
    : null;

  useEffect(() => {
    if (!description) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const idRes = await getIdentity(coinObj.system_id, description);
        if (!cancelled && idRes && idRes.result) {
          const name = idRes.result.friendlyname || idRes.result.fullyqualifiedname;
          setIdentityName(name);
          const cmm = idRes.result.identity && idRes.result.identity.contentmultimap;
          const preview = parseNftPreview(cmm);
          setAssetPreview(preview);
          setVerification(verifyNftContentHash(name, preview));
        }
      } catch (e) {
        console.warn('[MarketplaceCloseOffer] identity preview lookup failed:', e && e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!closeParams) {
      createAlert('Error', 'Marketplace closeoffer request is missing close parameters');
      cancel();
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitStep(0);
    try {
      const { offerTxid } = closeParams;
      const endpoint = VrpcProvider.getEndpoint(coinObj.system_id);
      const network = networks.verus;

      // 1. Fetch the on-chain offer output (the identity locked in the offer).
      const offerTxRes = await endpoint.getRawTransaction(offerTxid, 1);
      if (!offerTxRes || offerTxRes.error || !offerTxRes.result
        || !offerTxRes.result.vout || !offerTxRes.result.vout[0]) {
        throw new Error((offerTxRes && offerTxRes.error && offerTxRes.error.message)
          || 'Could not fetch the offer transaction');
      }
      const offerOutput = offerTxRes.result.vout[0];
      const offerScript = Buffer.from(offerOutput.scriptPubKey.hex, 'hex');
      const inputSats = Math.round((offerOutput.value || 0) * 1e8);
      if (inputSats <= CLOSEOFFER_FEE_SATS) {
        throw new Error('Offer output is too small to close');
      }

      // 2. Unlock the seller key (this chain's key, not the UI's active coin).
      setSubmitStep(1);
      const spendingKey = await requestPrivKey(coinObj.id, VRPC);
      const keyPair = ECPair.fromWIF(spendingKey, network);
      const ownerAddress = keyPair.getAddress();

      // 3. Resolve the identity and confirm this wallet controls it.
      if (!description) throw new Error('Close request is missing the NFT identity');
      const idRes = await getIdentity(coinObj.system_id, description);
      if (idRes.error || !idRes.result) {
        throw new Error((idRes.error && idRes.error.message) || 'Could not resolve the NFT identity');
      }
      const identityJson = idRes.result.identity;
      const primaries = (identityJson && identityJson.primaryaddresses) || [];
      if (!primaries.includes(ownerAddress)) {
        throw new Error('This wallet does not control the offered NFT identity');
      }

      // 4. Close = spend the offer output back into a normal identity output.
      setSubmitStep(2);
      const identityScript = IdentityScript.fromIdentity(Identity.fromJson(identityJson)).toBuffer();
      const txb = new TransactionBuilder(network);
      txb.setVersion(4);
      txb.setVersionGroupId(SAPLING_VERSION_GROUP_ID);
      txb.addInput(offerTxid, 0, 0xffffffff);
      txb.addOutput(identityScript, inputSats - CLOSEOFFER_FEE_SATS);
      const funded = getFundedTxBuilder(txb.buildIncomplete().toHex(), network, [offerScript]);
      funded.sign(0, keyPair, null, 1, inputSats);
      const closeHex = funded.build().toHex();
      const sendRes = await endpoint.sendRawTransaction(closeHex);
      if (!sendRes || sendRes.error || !sendRes.result || typeof sendRes.result !== 'string') {
        throw new Error((sendRes && sendRes.error && sendRes.error.message) || 'Broadcast failed');
      }
      const closeTxid = sendRes.result;

      // 5. Report the close to the marketplace.
      setSubmitStep(3);
      const responseURIs = (request && request.responseURIs) || [];
      if (responseURIs.length === 0) throw new Error('Request has no response URI to report closeoffer');
      const postRes = await fetch(responseURIs[0].getUriString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerTxid, closeTxid, closeHex }),
      }).then((r) => r.json());
      if (postRes && postRes.error) throw new Error(postRes.error);

      createAlert('Offer Closed', 'Your NFT was returned and the offer removed on-chain.');
      next(response, [detailIndex]);
    } catch (e) {
      console.error('[MarketplaceCloseOffer] confirm error:', e && e.message, e);
      const actionError = getMarketplaceActionError(e, 'Failed to close marketplace offer');
      setSubmitError(actionError);
      createAlert(actionError.title, actionError.message);
      setSubmitting(false);
    }
  }, [closeParams, activeCoin, request, response, detailIndex, description]);

  if (submitting) {
    return (
      <ScrollView style={Styles.flexBackground}>
        <MarketplaceActionStatus
          title="Closing Offer"
          message="Keep Verus Mobile open while the wallet closes the offer on-chain and returns the result."
          steps={CLOSE_OFFER_STEPS}
          activeIndex={submitStep}
        />
      </ScrollView>
    );
  }

  if (submitError) {
    return (
      <ScrollView style={Styles.flexBackground}>
        <MarketplaceActionStatus
          title={submitError.title}
          message={submitError.message}
          steps={CLOSE_OFFER_STEPS}
          activeIndex={submitStep}
          error
          onRetry={handleConfirm}
          onCancel={cancel}
        />
      </ScrollView>
    );
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
          You are closing a marketplace offer from this wallet. The wallet signs a transaction
          that spends the on-chain offer, returning the NFT to you and removing the listing.
        </Text>
        {closeParams && (
          <View style={cardStyles.card}>
            {description != null && (
              <MarketplaceAssetPreview
                preview={assetPreview}
                fallbackName={identityName || description}
                verification={verification}
              />
            )}
            <Text style={cardStyles.label}>Offer transaction</Text>
            <Text style={cardStyles.valueMono}>{closeParams.offerTxid}</Text>
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
