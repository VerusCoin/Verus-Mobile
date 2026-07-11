/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
import { useSelector } from 'react-redux';
import {
  networks, ECPair, smarttxs, TransactionBuilder, address as baddress,
} from '@bitgo/utxo-lib';
import {
  buildIdentityOfferOutputScript,
  buildOfferOpret,
  buildOfferOpReturnScript,
} from '../../../utils/marketplace/onchainOfferScripts';
import Styles from '../../../styles';
import Colors from '../../../globals/colors';
import { requestPrivKey } from '../../../utils/auth/authBox';
import { VRPC } from '../../../utils/constants/intervalConstants';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import VrpcProvider from '../../../utils/vrpc/vrpcInterface';
import { coinsList } from '../../../utils/CoinData/CoinsList';
import { parseNftPreview } from '../../../utils/marketplace/parseNftPreview';
import { verifyNftContentHash } from '../../../utils/marketplace/nftIntegrity';
import { getSpendablePlainUtxos } from '../../../utils/marketplace/spendablePlainUtxos';
import MarketplaceAssetPreview from '../components/MarketplaceAssetPreview';
import MarketplaceActionStatus, {
  getMarketplaceActionError,
} from '../components/MarketplaceActionStatus';
import cardStyles from '../components/marketplaceCardStyles';

const { getFundedTxBuilder } = smarttxs;

// Native makeoffer constants. The offer CC output carries a dust value (the
// daemon's own makeoffer uses 0.0001); the seller's plain funds cover it + fees.
const OFFER_OUTPUT_SATS = 10000;
const OFFER_FEE_SATS = 10000;
const DUST_THRESHOLD_SATS = 1000;
const SAPLING_VERSION_GROUP_ID = 0x892f2085;
// The offer's takeable partial spends the offer CC output and is signed
// SIGHASH_SINGLE | SIGHASH_ANYONECANPAY so a taker can complete it.
const SIGHASH_SINGLE_ANYONECANPAY = 131;
const MAKE_OFFER_STEPS = [
  'Checking NFT ownership',
  'Unlocking wallet',
  'Publishing offer on-chain',
  'Recording offer terms',
  'Returning to marketplace',
];

/**
 * Confirmation screen for marketplace makeoffer requests. Builds a REAL native
 * Verus offer entirely on-device: the NFT identity is spent into an on-chain
 * offer CC output (so `getoffers` indexes it natively), and a second "opret"
 * transaction records the signed takeable partial (price + payout). No escrow,
 * no listing deposit, no server-held signed order — the seller's key never
 * leaves this device.
 */
const MarketplaceMakeOfferRequestInfo = (props) => {
  const {
    makeOfferRequest, cancel, next, response, request, detailIndex,
  } = props;

  const activeCoin = useSelector((state) => state.coins.activeCoin);

  const [identityName, setIdentityName] = useState(null);
  const [assetPreview, setAssetPreview] = useState(null);
  const [verification, setVerification] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState(0);
  const [submitError, setSubmitError] = useState(null);

  const isTestnet = request && request.isTestnet ? request.isTestnet() : true;
  const coinObj = isTestnet ? coinsList.VRSCTEST : coinsList.VRSC;

  const offerParams = makeOfferRequest && makeOfferRequest.containsOfferParams && makeOfferRequest.containsOfferParams()
    ? makeOfferRequest.offerParams
    : null;

  const description = makeOfferRequest && makeOfferRequest.containsDesc && makeOfferRequest.containsDesc()
    ? makeOfferRequest.offerDescription
    : null;

  useEffect(() => {
    if (!offerParams) {
      createAlert('Error', 'Marketplace makeoffer request is missing offer parameters');
      cancel();
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const endpoint = VrpcProvider.getEndpoint(coinObj.system_id);
        const idRes = await endpoint.getIdentity(offerParams.offeredIdentityId);
        if (!cancelled && idRes && idRes.result) {
          const name = idRes.result.friendlyname || idRes.result.fullyqualifiedname;
          setIdentityName(name);
          const cmm = idRes.result.identity && idRes.result.identity.contentmultimap;
          const preview = parseNftPreview(cmm);
          setAssetPreview(preview);
          setVerification(verifyNftContentHash(name, preview));
        }
      } catch (e) {
        console.warn('[MarketplaceMakeOffer] identity name lookup failed:', e && e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!offerParams) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitStep(0);
    try {
      const endpoint = VrpcProvider.getEndpoint(coinObj.system_id);
      const network = networks.verus;

      // 1. Locate the offered identity's current definition UTXO on-chain.
      const idRes = await endpoint.getIdentity(offerParams.offeredIdentityId);
      if (!idRes || idRes.error || !idRes.result) {
        throw new Error((idRes && idRes.error && idRes.error.message) || 'Could not fetch offered identity');
      }
      const identityJson = idRes.result.identity;
      const { txid: idTxid, vout: idVout } = idRes.result;
      if (idTxid == null || idVout == null) {
        throw new Error('Offered identity has no locatable definition output');
      }
      const txRes = await endpoint.getRawTransaction(idTxid, 1);
      if (!txRes || txRes.error || !txRes.result || !txRes.result.vout || !txRes.result.vout[idVout]) {
        throw new Error('Could not fetch the identity definition transaction');
      }
      const idOutput = txRes.result.vout[idVout];
      const idScript = Buffer.from(idOutput.scriptPubKey.hex, 'hex');
      const idValueSats = Math.round((idOutput.value || 0) * 1e8);

      // 2. Validate expiry against the chain.
      const infoRes = await endpoint.getInfo();
      const curHeight = infoRes && infoRes.result ? infoRes.result.longestchain || infoRes.result.blocks : 0;
      const expiryHeight = offerParams.expiryHeight.toNumber();
      if (expiryHeight <= curHeight) {
        throw new Error('This listing request has expired. Please create a new one.');
      }

      // 3. Unlock the seller key (this device only).
      setSubmitStep(1);
      const spendingKey = await requestPrivKey(coinObj.id, VRPC);
      const keyPair = ECPair.fromWIF(spendingKey, network);
      const sellerAddress = keyPair.getAddress();

      // 4. Gather plain funding UTXOs (never spend CC outputs like the identity).
      const { utxos: spendable, hasPendingSpends } = await getSpendablePlainUtxos(endpoint, sellerAddress);
      const funding = spendable.filter((u) => !(u.txid === idTxid && u.outputIndex === idVout));
      const needed = OFFER_OUTPUT_SATS + OFFER_FEE_SATS * 2 + DUST_THRESHOLD_SATS;
      const picked = [];
      let fundTotal = 0;
      for (let i = 0; i < funding.length; i += 1) {
        picked.push(funding[i]);
        fundTotal += funding[i].satoshis;
        if (fundTotal >= needed) break;
      }
      if (fundTotal < needed) {
        throw new Error(
          `no spendable plain ${coinObj.id} at ${sellerAddress}; need ${needed / 1e8}, have ${fundTotal / 1e8}.${
            hasPendingSpends ? ' A previous transaction is still confirming — wait a minute and retry.' : ''
          }`,
        );
      }

      // 5. OFFER TX: spend the identity + funding into the native offer CC output.
      setSubmitStep(2);
      const offerScript = buildIdentityOfferOutputScript(
        identityJson,
        offerParams.offeredIdentityId,
        offerParams.forCurrencyId,
      );
      const otx = new TransactionBuilder(network);
      otx.setVersion(4);
      otx.setVersionGroupId(SAPLING_VERSION_GROUP_ID);
      otx.setExpiryHeight(expiryHeight);
      otx.addInput(idTxid, idVout, 0xffffffff);
      for (let i = 0; i < picked.length; i += 1) otx.addInput(picked[i].txid, picked[i].outputIndex, 0xffffffff);
      otx.addOutput(offerScript, OFFER_OUTPUT_SATS);
      const offerChange = idValueSats + fundTotal - OFFER_OUTPUT_SATS - OFFER_FEE_SATS;
      otx.addOutput(baddress.toOutputScript(sellerAddress, network), offerChange);
      const offerPrev = [idScript, ...picked.map((u) => Buffer.from(u.script, 'hex'))];
      const offerFunded = getFundedTxBuilder(otx.buildIncomplete().toHex(), network, offerPrev);
      offerFunded.sign(0, keyPair, null, 1, idValueSats);
      for (let i = 0; i < picked.length; i += 1) offerFunded.sign(i + 1, keyPair, null, 1, picked[i].satoshis);
      const offerHex = offerFunded.build().toHex();
      const offerSend = await endpoint.sendRawTransaction(offerHex);
      if (!offerSend || !offerSend.result || typeof offerSend.result !== 'string') {
        throw new Error((offerSend && offerSend.error && offerSend.error.message) || 'offer broadcast failed');
      }
      const offerTxid = offerSend.result;

      // 6. Signed takeable partial: spend the offer output -> pay the seller.
      setSubmitStep(3);
      const ptx = new TransactionBuilder(network);
      ptx.setVersion(4);
      ptx.setVersionGroupId(SAPLING_VERSION_GROUP_ID);
      ptx.setExpiryHeight(expiryHeight);
      ptx.addInput(offerTxid, 0, 0xffffffff);
      ptx.addOutput(
        baddress.toOutputScript(offerParams.payoutDestination.getAddressString(), network),
        offerParams.forAmountSats.toNumber(),
      );
      const partialFunded = getFundedTxBuilder(ptx.buildIncomplete().toHex(), network, [offerScript]);
      partialFunded.sign(0, keyPair, null, SIGHASH_SINGLE_ANYONECANPAY, OFFER_OUTPUT_SATS);
      const partialHex = partialFunded.buildIncomplete().toHex();

      // 7. OPRET TX: record the serialized offer so getoffers reports it.
      const opret = buildOfferOpret(partialHex);
      const optx = new TransactionBuilder(network);
      optx.setVersion(4);
      optx.setVersionGroupId(SAPLING_VERSION_GROUP_ID);
      optx.setExpiryHeight(expiryHeight);
      optx.addInput(offerTxid, 1, 0xffffffff);
      optx.addOutput(baddress.toOutputScript(sellerAddress, network), offerChange - OFFER_FEE_SATS);
      optx.addOutput(buildOfferOpReturnScript(opret), 0);
      const opretPrev = [baddress.toOutputScript(sellerAddress, network)];
      const opretFunded = getFundedTxBuilder(optx.buildIncomplete().toHex(), network, opretPrev);
      opretFunded.sign(0, keyPair, null, 1, offerChange);
      const opretHex = opretFunded.build().toHex();
      const opretSend = await endpoint.sendRawTransaction(opretHex);
      if (!opretSend || !opretSend.result || typeof opretSend.result !== 'string') {
        throw new Error((opretSend && opretSend.error && opretSend.error.message) || 'offer terms broadcast failed');
      }

      // 8. Tell the marketplace the offer is live (it reads native getoffers).
      setSubmitStep(4);
      const responseURIs = (request && request.responseURIs) || [];
      if (responseURIs.length === 0) {
        throw new Error('Request has no response URI to return the offer to');
      }
      const postRes = await fetch(responseURIs[0].getUriString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onchainListingTxid: offerTxid, offerTxid, opretTxid: opretSend.result }),
      }).then((r) => r.json());
      if (postRes && postRes.error) throw new Error(postRes.error);

      createAlert(
        'Listing Live',
        `Your NFT is now offered on-chain.\n\nNFT: ${identityName || offerParams.offeredIdentityId}\nPrice: ${offerParams.forAmountSats.toNumber() / 1e8} ${coinObj.id}`,
      );
      next(response, [detailIndex]);
    } catch (e) {
      console.error('[MarketplaceMakeOffer] confirm error:', e && e.message, e);
      const actionError = getMarketplaceActionError(e, 'Failed to publish marketplace offer');
      setSubmitError(actionError);
      createAlert(actionError.title, actionError.message);
      setSubmitting(false);
    }
  }, [offerParams, activeCoin, request, response, detailIndex, identityName]);

  if (submitting) {
    return (
      <ScrollView style={Styles.flexBackground}>
        <MarketplaceActionStatus
          title="Listing NFT"
          message="Keep Verus Mobile open while the wallet publishes your offer on-chain."
          steps={MAKE_OFFER_STEPS}
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
          steps={MAKE_OFFER_STEPS}
          activeIndex={submitStep}
          error
          onRetry={handleConfirm}
          onCancel={cancel}
        />
      </ScrollView>
    );
  }

  const priceDisplay = offerParams
    ? `${offerParams.forAmountSats.toNumber() / 1e8} ${coinObj.id}`
    : '';

  return (
    <ScrollView style={Styles.flexBackground}>
      <View style={Styles.headerContainer}>
        <Text style={{ fontSize: 20, color: Colors.quaternaryColor, paddingBottom: 8 }}>
          Confirm Marketplace Listing
        </Text>
      </View>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 16 }}>
          You are creating a sell offer for an NFT you own. This device will build
          and sign the offer locally — your key never leaves this device.
        </Text>
        {offerParams && (
          <View style={cardStyles.card}>
            <MarketplaceAssetPreview
              preview={assetPreview}
              fallbackName={identityName || offerParams.offeredIdentityId}
              verification={verification}
            />
            <Text style={cardStyles.label}>Price</Text>
            <Text style={cardStyles.value}>{priceDisplay}</Text>
            <Divider style={cardStyles.divider} />
            <Text style={cardStyles.label}>Payment goes to</Text>
            <Text style={cardStyles.valueMono}>
              {offerParams.payoutDestination.getAddressString()}
            </Text>
            {description != null && <Text style={cardStyles.note}>{description}</Text>}
          </View>
        )}
      </View>
      <View style={Styles.footerContainer}>
        <Button mode="text" color={Colors.warningButtonColor} onPress={cancel}>
          Cancel
        </Button>
        <Button mode="contained" color={Colors.primaryColor} onPress={handleConfirm}>
          Sign &amp; List
        </Button>
      </View>
    </ScrollView>
  );
};

export default MarketplaceMakeOfferRequestInfo;
