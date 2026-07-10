/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
import { useSelector } from 'react-redux';
import {
  networks, ECPair, TransactionBuilder, Transaction, address as baddress,
} from '@bitgo/utxo-lib';
import { Identity, IdentityScript } from 'verus-typescript-primitives';
import Styles from '../../../styles';
import Colors from '../../../globals/colors';
import { requestPrivKey } from '../../../utils/auth/authBox';
import { VRPC } from '../../../utils/constants/intervalConstants';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import VrpcProvider from '../../../utils/vrpc/vrpcInterface';
import { coinsList } from '../../../utils/CoinData/CoinsList';
import { parseNftPreview } from '../../../utils/marketplace/parseNftPreview';
import { verifyNftContentHash } from '../../../utils/marketplace/nftIntegrity';
import MarketplaceAssetPreview from '../components/MarketplaceAssetPreview';
import cardStyles from '../components/marketplaceCardStyles';

// On-chain listing publication: the deposit that makes the offer indexable by
// getoffers (reclaimable by this wallet via closeoffers) and the network fee.
const TAKEOFFER_FEE_SATS = 10000;
// Change below this is dust the daemon would reject; fold it into the fee.
const DUST_THRESHOLD_SATS = 1000;

/**
 * Confirmation screen for marketplace takeoffer requests (GenericRequest ordinal,
 * vrsc::request.marketplace.takeoffer). Handles self-custodial purchases:
 *
 * The request carries the seller's SIGNED partial offer (identity input signed
 * SIGHASH_SINGLE|ANYONECANPAY, payment output at the same index) plus the offer
 * parameters. This wallet completes the atomic swap itself, entirely client-side:
 *   1. verify the signed offer against the request terms and the chain
 *      (identity outpoint unmoved, payment amount matches, not expired),
 *   2. fund the purchase from this wallet's plain P2PKH UTXOs,
 *   3. add the identity output (transferred to this wallet's primary address,
 *      revocation/recovery authorities preserved) and change,
 *   4. sign only the buyer inputs locally and broadcast the completed swap,
 *   5. POST the settlement txid to the request's response URI.
 *
 * The buyer's key never leaves this device, and nothing about the offer is
 * trusted from the requester: the identity input and its script come from the
 * blockchain, and the user confirms the price and payment destination on screen.
 *
 * Signing MUST happen here (a mounted component driven by a user gesture) so
 * requestPrivKey can present the keychain/biometric prompt.
 */
const MarketplaceTakeOfferRequestInfo = (props) => {
  const {
    takeOfferRequest, cancel, next, response, request, detailIndex,
  } = props;

  const activeCoin = useSelector((state) => state.coins.activeCoin);

  const [identityName, setIdentityName] = useState(null);
  const [assetPreview, setAssetPreview] = useState(null);
  const [verification, setVerification] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isTestnet = request && request.isTestnet ? request.isTestnet() : true;
  const coinObj = isTestnet ? coinsList.VRSCTEST : coinsList.VRSC;

  const offerParams = takeOfferRequest && takeOfferRequest.containsOfferParams && takeOfferRequest.containsOfferParams()
    ? takeOfferRequest.offerParams
    : null;

  const description = takeOfferRequest && takeOfferRequest.containsDesc && takeOfferRequest.containsDesc()
    ? takeOfferRequest.offerDescription
    : null;

  useEffect(() => {
    if (!offerParams) {
      createAlert('Error', 'Marketplace takeoffer request is missing offer parameters');
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
        console.warn('[MarketplaceTakeOffer] identity name lookup failed:', e && e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!offerParams) return;
    setSubmitting(true);
    try {
      const endpoint = VrpcProvider.getEndpoint(coinObj.system_id);

      // 1. Locate the offered identity's current definition UTXO on-chain.
      const idRes = await endpoint.getIdentity(offerParams.offeredIdentityId);
      if (!idRes || idRes.error || !idRes.result) {
        throw new Error(
          (idRes && idRes.error && idRes.error.message) || 'Could not fetch offered identity',
        );
      }
      const { txid: idTxid, vout: idVout } = idRes.result;
      if (idTxid == null || idVout == null) {
        throw new Error('Offered identity has no locatable definition output');
      }

      const txRes = await endpoint.getRawTransaction(idTxid, 1);
      if (!txRes || txRes.error || !txRes.result || !txRes.result.vout || !txRes.result.vout[idVout]) {
        throw new Error('Could not fetch the identity definition transaction');
      }
      const idOutput = txRes.result.vout[idVout];
      const inputSats = Math.round((idOutput.value || 0) * 1e8);

      // 2. Validate expiry against the chain.
      const infoRes = await endpoint.getInfo();
      const curHeight = infoRes && infoRes.result ? infoRes.result.longestchain || infoRes.result.blocks : 0;
      const expiryHeight = offerParams.expiryHeight.toNumber();
      if (expiryHeight <= curHeight) {
        throw new Error('This listing request has expired. Please create a new one.');
      }

      // 3. Verify the signed offer matches the request terms and is still takeable.
      const signedOfferHex = takeOfferRequest.rawTransactionHex;
      if (!signedOfferHex) {
        throw new Error('Request is missing the signed offer transaction');
      }
      const network = networks.verus;
      const offerTx = Transaction.fromHex(signedOfferHex, network);
      if (offerTx.ins.length !== 1 || offerTx.outs.length !== 1) {
        throw new Error('Malformed offer transaction');
      }
      const offerPrevHash = Buffer.from(offerTx.ins[0].hash).reverse().toString('hex');
      if (offerPrevHash !== idTxid || offerTx.ins[0].index !== idVout) {
        throw new Error('This offer is no longer valid (the NFT has moved since it was signed)');
      }
      const priceSats = offerParams.forAmountSats.toNumber();
      if (offerTx.outs[0].value !== priceSats) {
        throw new Error('Offer payment does not match the request terms');
      }
      // Verify the payment DESTINATION baked into the seller-signed offer matches
      // the payout address shown on screen — the amount alone is not enough, a
      // hostile request could display one address while the funds go to another.
      const signedPayoutAddress = baddress.fromOutputScript(offerTx.outs[0].script, network);
      if (signedPayoutAddress !== offerParams.payoutDestination.getAddressString()) {
        throw new Error('Offer pays a different address than the request shows');
      }

      // 4. Fund the purchase from this wallet: price + fee in plain P2PKH utxos.
      // GenericRequests are signed for their own chain. Do not use the UI's
      // currently active coin here; it can point at another wallet namespace
      // and produce an address with no spendable UTXOs for this request.
      const coinTicker = coinObj.id;
      const spendingKey = await requestPrivKey(coinTicker, VRPC);
      const keyPair = ECPair.fromWIF(spendingKey, network);
      const buyerAddress = keyPair.getAddress();

      const utxoRes = await endpoint.getAddressUtxos({ addresses: [buyerAddress] });
      const utxos = ((utxoRes && utxoRes.result) || [])
        .filter((u) => u.satoshis > 0 && u.script && u.script.startsWith('76a914'))
        .sort((a, b) => b.satoshis - a.satoshis);
      const needed = priceSats + TAKEOFFER_FEE_SATS;
      const picked = [];
      let total = 0;
      for (let i = 0; i < utxos.length; i += 1) {
        const u = utxos[i];
        picked.push(u);
        total += u.satoshis;
        if (total >= needed) break;
      }
      if (total < needed) {
        throw new Error('Insufficient funds for this purchase');
      }

      // 5. Complete the atomic swap: keep the seller-signed identity input and
      // payment output, add our funds, the identity transferred to us, and change.
      // Only the primary addresses may change here: altering revocation or
      // recovery requires the CURRENT authority to co-sign, and the seller
      // only signed with the primary key — the chain rejects any other change.
      const newIdentity = Identity.fromJson({
        ...idRes.result.identity,
        primaryaddresses: [buyerAddress],
        minimumsignatures: 1,
      });
      const identityOutScript = IdentityScript.fromIdentity(newIdentity).toBuffer();

      // Assemble and sign on a single builder: getFundedTxBuilder rebuilds
      // every input from scratch and would drop the seller's scriptSig, so
      // the seller-signed input is kept untouched and only the buyer inputs
      // are signed here (SIGHASH_ALL).
      const txb = TransactionBuilder.fromTransaction(offerTx, network);
      for (let i = 0; i < picked.length; i += 1) {
        const u = picked[i];
        txb.addInput(u.txid, u.outputIndex, 0xffffffff, Buffer.from(u.script, 'hex'));
      }
      txb.addOutput(identityOutScript, inputSats);
      const changeSats = total - needed;
      if (changeSats >= DUST_THRESHOLD_SATS) {
        txb.addOutput(baddress.toOutputScript(buyerAddress, network), changeSats);
      }
      for (let i = 0; i < picked.length; i++) {
        txb.sign(i + 1, keyPair, null, Transaction.SIGHASH_ALL, picked[i].satoshis);
      }
      const completedHex = txb.build().toHex();
      const sendRes = await endpoint.sendRawTransaction(completedHex);
      if (!sendRes || !sendRes.result || typeof sendRes.result !== 'string') {
        throw new Error((sendRes && sendRes.error && sendRes.error.message) || 'Broadcast failed');
      }
      const completedTxid = sendRes.result;

      // 6. Report the settlement to the requester.
      const responseURIs = (request && request.responseURIs) || [];
      if (responseURIs.length === 0) {
        throw new Error('Request has no response URI to return the signed offer to');
      }
      const responseUri = responseURIs[0].getUriString();

      const postRes = await fetch(responseUri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedTxid, completedHex }),
      }).then((r) => r.json());

      if (postRes && postRes.error) {
        throw new Error(postRes.error);
      }

      createAlert(
        'Purchase Complete',
        `You bought this NFT — the swap settled on-chain.\n\nNFT: ${identityName || offerParams.offeredIdentityId}\nPrice: ${offerParams.forAmountSats.toNumber() / 1e8} ${coinObj.id}`,
      );
      next(response, [detailIndex]);
    } catch (e) {
      console.error('[MarketplaceTakeOffer] confirm error:', e && e.message, e);
      createAlert('Error', (e && e.message) || 'Failed to complete marketplace purchase');
      setSubmitting(false);
    }
  }, [offerParams, activeCoin, request, response, detailIndex, identityName]);

  if (submitting) {
    return <AnimatedActivityIndicatorBox />;
  }

  const priceDisplay = offerParams
    ? `${offerParams.forAmountSats.toNumber() / 1e8} ${coinObj.id}`
    : '';

  return (
    <ScrollView style={Styles.flexBackground}>
      <View style={Styles.headerContainer}>
        <Text style={{ fontSize: 20, color: Colors.quaternaryColor, paddingBottom: 8 }}>
          Confirm Marketplace Purchase
        </Text>
      </View>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 16 }}>
          You are buying this NFT with an atomic swap. This device verifies the
          seller signed offer and signs the purchase locally — your key never
          leaves this device.
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
          Sign &amp; Buy
        </Button>
      </View>
    </ScrollView>
  );
};

export default MarketplaceTakeOfferRequestInfo;
