import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { networks, ECPair, smarttxs, TransactionBuilder, Transaction, address as baddress } from '@bitgo/utxo-lib';
import Styles from '../../../styles';
import Colors from '../../../globals/colors';
import { requestPrivKey } from '../../../utils/auth/authBox';
import { VRPC } from '../../../utils/constants/intervalConstants';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import VrpcProvider from '../../../utils/vrpc/vrpcInterface';
import { coinsList } from '../../../utils/CoinData/CoinsList';
import { Identity, IdentityScript } from 'verus-typescript-primitives';

const { getFundedTxBuilder } = smarttxs;

// On-chain listing publication: the deposit that makes the offer indexable by
// getoffers (reclaimable by this wallet via closeoffers) and the network fee.
const TAKEOFFER_FEE_SATS = 10000;

// Verus makeoffer constants (must match the daemon's makeoffer):
// the maker's identity input is signed SIGHASH_SINGLE | SIGHASH_ANYONECANPAY so a
// taker can complete the offer by adding their own inputs/outputs.
const SAPLING_VERSION_GROUP_ID = 0x892f2085;
const SIGHASH_SINGLE_ANYONECANPAY = 131;

/**
 * Confirmation screen for marketplace makeoffer requests (GenericRequest ordinal,
 * vrsc::request.marketplace.makeoffer). Handles self-custodial sell listings:
 *
 * The request carries only OFFER PARAMETERS (identity for sale, price, payout
 * destination, expiry). This wallet constructs the partial makeoffer
 * transaction itself, entirely client-side:
 *   1. look up the offered identity's current definition UTXO on-chain
 *      (getidentity → txid/vout, getrawtransaction → CC script),
 *   2. build the partial offer tx (vin[0] = identity UTXO,
 *      vout[0] = requested payment to the payout destination),
 *   3. decrypt the seller key and sign the identity input locally,
 *   4. POST the signed offer to the request's response URI.
 *
 * The seller's key never leaves this device, and nothing about the offer is
 * trusted from the requester: the identity input and its script come from the
 * blockchain, and the user confirms the payout destination and price on screen.
 *
 * Signing MUST happen here (a mounted component driven by a user gesture) so
 * requestPrivKey can present the keychain/biometric prompt.
 */
const MarketplaceTakeOfferRequestInfo = props => {
  const { takeOfferRequest, cancel, next, response, request, detailIndex } = props;

  const activeCoin = useSelector(state => state.coins.activeCoin);

  const [identityName, setIdentityName] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isTestnet = request && request.isTestnet ? request.isTestnet() : true;
  const coinObj = isTestnet ? coinsList.VRSCTEST : coinsList.VRSC;

  const offerParams =
    takeOfferRequest && takeOfferRequest.containsOfferParams && takeOfferRequest.containsOfferParams()
      ? takeOfferRequest.offerParams
      : null;

  const description =
    takeOfferRequest && takeOfferRequest.containsDesc && takeOfferRequest.containsDesc()
      ? takeOfferRequest.offerDescription
      : null;

  useEffect(() => {
    if (!offerParams) {
      createAlert('Error', 'Marketplace makeoffer request is missing offer parameters');
      cancel();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const endpoint = VrpcProvider.getEndpoint(coinObj.system_id);
        const idRes = await endpoint.getIdentity(offerParams.offeredIdentityId);
        if (!cancelled && idRes && idRes.result) {
          setIdentityName(idRes.result.friendlyname || idRes.result.fullyqualifiedname);
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
          (idRes && idRes.error && idRes.error.message) || 'Could not fetch offered identity'
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
      const ccScript = Buffer.from(idOutput.scriptPubKey.hex, 'hex');
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
        .filter(u => u.satoshis > 0 && u.script && u.script.startsWith('76a914'))
        .sort((a, b) => b.satoshis - a.satoshis);
      const needed = priceSats + TAKEOFFER_FEE_SATS;
      const picked = [];
      let total = 0;
      for (const u of utxos) {
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

      const txb = TransactionBuilder.fromTransaction(offerTx, network);
      for (const u of picked) {
        txb.addInput(u.txid, u.outputIndex, 0xffffffff);
      }
      txb.addOutput(identityOutScript, inputSats);
      const changeSats = total - needed;
      if (changeSats > 0) {
        txb.addOutput(baddress.toOutputScript(buyerAddress, network), changeSats);
      }

      const incompleteHex = txb.buildIncomplete().toHex();
      const fundedTxb = getFundedTxBuilder(incompleteHex, network, [
        ccScript,
        ...picked.map(u => Buffer.from(u.script, 'hex')),
      ]);
      for (let i = 0; i < picked.length; i++) {
        fundedTxb.sign(i + 1, keyPair, null, 1, picked[i].satoshis);
      }
      const completedHex = fundedTxb.build().toHex();
      const sendRes = await endpoint.sendRawTransaction(completedHex);
      if (!sendRes || !sendRes.result || typeof sendRes.result !== 'string') {
        throw new Error((sendRes && sendRes.error && sendRes.error.message) || 'Broadcast failed');
      }
      const completedTxid = sendRes.result;
      console.log('[MarketplaceTakeOffer] swap completed on-chain:', completedTxid);

      // 6. Report the settlement to the requester.
      const responseURIs = (request && request.responseURIs) || [];
      if (responseURIs.length === 0) {
        throw new Error('Request has no response URI to return the signed offer to');
      }
      const responseUri = responseURIs[0].getUriString();

      const postRes = await fetch(responseUri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedTxid }),
      }).then(r => r.json());

      if (postRes && postRes.error) {
        throw new Error(postRes.error);
      }

      createAlert(
        'Purchase Complete',
        `You bought this NFT — the swap settled on-chain.\n\nNFT: ${identityName || offerParams.offeredIdentityId}\nPrice: ${offerParams.forAmountSats.toNumber() / 1e8} ${coinObj.id}`
      );
      next(response, [detailIndex]);
    } catch (e) {
      console.error('[MarketplaceTakeOffer] confirm error:', e && e.message, e);
      createAlert('Error', (e && e.message) || 'Failed to sign marketplace listing');
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
          Confirm Marketplace Listing
        </Text>
      </View>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 16 }}>
          You are creating a sell offer for an NFT you own. This device will build
          and sign the offer locally — your key never leaves this device.
        </Text>
        {offerParams && (
          <View style={{ backgroundColor: Colors.verusDarkGray, padding: 16, borderRadius: 8 }}>
            <Text style={{ color: Colors.secondaryColor, fontSize: 12 }}>NFT</Text>
            <Text style={{ color: Colors.secondaryColor, fontSize: 16, marginBottom: 12 }}>
              {identityName || offerParams.offeredIdentityId}
            </Text>
            <Divider />
            <Text style={{ color: Colors.secondaryColor, fontSize: 12, marginTop: 12 }}>Price</Text>
            <Text style={{ color: Colors.secondaryColor, fontSize: 16, marginBottom: 12 }}>
              {priceDisplay}
            </Text>
            <Divider />
            <Text style={{ color: Colors.secondaryColor, fontSize: 12, marginTop: 12 }}>
              Payment goes to
            </Text>
            <Text style={{ color: Colors.secondaryColor, fontSize: 14 }}>
              {offerParams.payoutDestination.getAddressString()}
            </Text>
            {description != null && (
              <Text style={{ color: Colors.secondaryColor, fontSize: 12, marginTop: 12 }}>
                {description}
              </Text>
            )}
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

export default MarketplaceTakeOfferRequestInfo;
