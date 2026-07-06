import React, { useState, useEffect, useCallback } from 'react';
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
import {
  deriveOfferIndexKey,
  buildListingDepositScript,
  buildListingOpReturnScript,
  IDENTITY_OFFER_BASE_KEY,
  OFFER_FOR_CURRENCY_BASE_KEY,
  fromBase58Check,
} from 'verus-typescript-primitives';

const { getFundedTxBuilder } = smarttxs;

// On-chain listing publication: the deposit that makes the offer indexable by
// getoffers (reclaimable by this wallet via closeoffers) and the network fee.
const LISTING_DEPOSIT_SATS = 10000;
const LISTING_FEE_SATS = 10000;
const ONE_DAY_BLOCKS = 1440;

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
const MarketplaceMakeOfferRequestInfo = props => {
  const { makeOfferRequest, cancel, next, response, request, detailIndex } = props;

  const activeCoin = useSelector(state => state.coins.activeCoin);

  const [identityName, setIdentityName] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isTestnet = request && request.isTestnet ? request.isTestnet() : true;
  const coinObj = isTestnet ? coinsList.VRSCTEST : coinsList.VRSC;

  const offerParams =
    makeOfferRequest && makeOfferRequest.containsOfferParams && makeOfferRequest.containsOfferParams()
      ? makeOfferRequest.offerParams
      : null;

  const description =
    makeOfferRequest && makeOfferRequest.containsDesc && makeOfferRequest.containsDesc()
      ? makeOfferRequest.offerDescription
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
        console.warn('[MarketplaceMakeOffer] identity name lookup failed:', e && e.message);
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

      // 3. Build the partial offer tx (same structure the daemon's makeoffer builds).
      const network = networks.verus;
      const txb = new TransactionBuilder(network);
      txb.setVersion(4);
      txb.setVersionGroupId(SAPLING_VERSION_GROUP_ID);
      txb.setExpiryHeight(expiryHeight);
      txb.addInput(idTxid, idVout, 0xffffffff);

      const payoutAddress = offerParams.payoutDestination.getAddressString();
      txb.addOutput(
        baddress.toOutputScript(payoutAddress, network),
        offerParams.forAmountSats.toNumber()
      );
      const unsignedHex = txb.buildIncomplete().toHex();
      console.log('[MarketplaceMakeOffer] built offer tx:', unsignedHex.length / 2, 'bytes');

      // 4. Decrypt the seller's spending key and sign the identity (CC) input.
      const coinTicker = (activeCoin && activeCoin.id) || coinObj.id;
      const spendingKey = await requestPrivKey(coinTicker, VRPC);
      const keyPair = ECPair.fromWIF(spendingKey, network);

      const fundedTxb = getFundedTxBuilder(unsignedHex, network, [ccScript]);
      fundedTxb.sign(0, keyPair, null, SIGHASH_SINGLE_ANYONECANPAY, inputSats);
      const signedHex = fundedTxb.buildIncomplete().toHex();
      console.log('[MarketplaceMakeOffer] signed offer, len=', signedHex.length);

      // 5. Publish the listing on-chain ourselves so getoffers indexes it:
      // a second tx funded from THIS wallet, carrying the tagged deposit
      // (which returns to us — spending it via closeoffers delists) and the
      // signed offer in an OP_RETURN. Best-effort: without funds the listing
      // still works platform-side via the response URI.
      let onchainListingTxid = null;
      try {
        const sellerAddress = keyPair.getAddress();
        const utxoRes = await endpoint.getAddressUtxos({ addresses: [sellerAddress] });
        // Plain P2PKH funds only: never spend cryptocondition outputs (e.g. the
        // offered identity's own UTXO, which would invalidate the signed offer).
        const utxos = ((utxoRes && utxoRes.result) || [])
          .filter(u => u.satoshis > 0 && u.script && u.script.startsWith('76a914'))
          .filter(u => !(u.txid === idTxid && u.outputIndex === idVout))
          .sort((a, b) => b.satoshis - a.satoshis);

        const needed = LISTING_DEPOSIT_SATS + LISTING_FEE_SATS;
        const picked = [];
        let total = 0;
        for (const u of utxos) {
          picked.push(u);
          total += u.satoshis;
          if (total >= needed) break;
        }
        if (total < needed) {
          throw new Error('no spendable funds for the listing deposit');
        }

        const offerKey = deriveOfferIndexKey(
          IDENTITY_OFFER_BASE_KEY,
          offerParams.offeredIdentityId
        );
        const forKey = deriveOfferIndexKey(
          OFFER_FOR_CURRENCY_BASE_KEY,
          offerParams.forCurrencyId
        );
        const ownerHash = fromBase58Check(sellerAddress).hash;

        const ltxb = new TransactionBuilder(network);
        ltxb.setVersion(4);
        ltxb.setVersionGroupId(SAPLING_VERSION_GROUP_ID);
        ltxb.setExpiryHeight(Math.min(expiryHeight, curHeight + ONE_DAY_BLOCKS));
        for (const u of picked) {
          ltxb.addInput(u.txid, u.outputIndex, 0xffffffff);
        }
        ltxb.addOutput(buildListingDepositScript(forKey, offerKey, ownerHash), LISTING_DEPOSIT_SATS);
        const changeSats = total - needed;
        if (changeSats > 0) {
          ltxb.addOutput(baddress.toOutputScript(sellerAddress, network), changeSats);
        }
        ltxb.addOutput(buildListingOpReturnScript(signedHex), 0);

        const unsignedListingHex = ltxb.buildIncomplete().toHex();
        const fundedLtxb = getFundedTxBuilder(
          unsignedListingHex,
          network,
          picked.map(u => Buffer.from(u.script, 'hex'))
        );
        for (let i = 0; i < picked.length; i++) {
          fundedLtxb.sign(i, keyPair, null, 1, picked[i].satoshis);
        }
        const listingHex = fundedLtxb.build().toHex();
        const sendRes = await endpoint.sendRawTransaction(listingHex);
        if (sendRes && sendRes.result && typeof sendRes.result === 'string') {
          onchainListingTxid = sendRes.result;
          console.log('[MarketplaceMakeOffer] listing published on-chain:', onchainListingTxid);
        } else {
          throw new Error((sendRes && sendRes.error && sendRes.error.message) || 'broadcast failed');
        }
      } catch (pubErr) {
        console.warn(
          '[MarketplaceMakeOffer] on-chain publication skipped:',
          pubErr && pubErr.message
        );
      }

      // 6. Return the signed offer (and listing txid, if published) to the requester.
      const responseURIs = (request && request.responseURIs) || [];
      if (responseURIs.length === 0) {
        throw new Error('Request has no response URI to return the signed offer to');
      }
      const responseUri = responseURIs[0].getUriString();

      const postRes = await fetch(responseUri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onchainListingTxid ? { signedHex, onchainListingTxid } : { signedHex }),
      }).then(r => r.json());

      if (postRes && postRes.error) {
        throw new Error(postRes.error);
      }

      createAlert(
        'Listing Signed',
        `Your sell offer was signed on this device.\n\nNFT: ${identityName || offerParams.offeredIdentityId}\nPrice: ${offerParams.forAmountSats.toNumber() / 1e8} ${coinObj.id}`
      );
      next(response, [detailIndex]);
    } catch (e) {
      console.error('[MarketplaceMakeOffer] confirm error:', e && e.message, e);
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

export default MarketplaceMakeOfferRequestInfo;
