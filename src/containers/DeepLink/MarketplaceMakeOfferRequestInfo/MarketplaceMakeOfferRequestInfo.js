/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
import { useSelector } from 'react-redux';
import {
  networks, ECPair, smarttxs, TransactionBuilder, address as baddress,
} from '@bitgo/utxo-lib';
import {
  deriveOfferIndexKey,
  buildListingDepositScript,
  buildListingOpReturnScript,
  IDENTITY_OFFER_BASE_KEY,
  OFFER_FOR_CURRENCY_BASE_KEY,
  fromBase58Check,
} from 'verus-typescript-primitives';
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

const { getFundedTxBuilder } = smarttxs;

// On-chain listing publication: the deposit that makes the offer indexable by
// getoffers (reclaimable by this wallet via closeoffers) and the network fee.
// Must match COnChainOffer::MIN_LISTING_DEPOSIT in the daemon.
const LISTING_DEPOSIT_SATS = 100000000;
const LISTING_FEE_SATS = 10000;
// Change below this is dust the daemon would reject; fold it into the fee.
const DUST_THRESHOLD_SATS = 1000;
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
const MarketplaceMakeOfferRequestInfo = (props) => {
  const {
    makeOfferRequest, cancel, next, response, request, detailIndex,
  } = props;

  const activeCoin = useSelector((state) => state.coins.activeCoin);

  const [identityName, setIdentityName] = useState(null);
  const [assetPreview, setAssetPreview] = useState(null);
  const [verification, setVerification] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
        offerParams.forAmountSats.toNumber(),
      );
      const unsignedHex = txb.buildIncomplete().toHex();

      // 4. Decrypt the seller's spending key and sign the identity (CC) input.
      // GenericRequests are signed for their own chain. Do not use the UI's
      // currently active coin here; it can point at another wallet namespace
      // and produce an address with no spendable UTXOs for this request.
      const coinTicker = coinObj.id;
      const spendingKey = await requestPrivKey(coinTicker, VRPC);
      const keyPair = ECPair.fromWIF(spendingKey, network);

      const fundedTxb = getFundedTxBuilder(unsignedHex, network, [ccScript]);
      fundedTxb.sign(0, keyPair, null, SIGHASH_SINGLE_ANYONECANPAY, inputSats);
      const signedHex = fundedTxb.buildIncomplete().toHex();

      // 5. Publish the listing on-chain ourselves so getoffers indexes it:
      // a second tx funded from THIS wallet, carrying the tagged deposit
      // (which returns to us — spending it via closeoffers delists) and the
      // signed offer in an OP_RETURN. Publication is MANDATORY: a listing
      // that only exists on a marketplace server is not a real offer, and
      // the marketplace rejects callbacks without the listing txid.
      let onchainListingTxid = null;
      let listingHex = null;
      let publishError = null;
      let publishFundingAddress = null;
      let publishPlainSats = 0;
      try {
        const sellerAddress = keyPair.getAddress();
        publishFundingAddress = sellerAddress;
        const utxoRes = await endpoint.getAddressUtxos({ addresses: [sellerAddress] });
        // Plain P2PKH funds only: never spend cryptocondition outputs (e.g. the
        // offered identity's own UTXO, which would invalidate the signed offer).
        const utxos = ((utxoRes && utxoRes.result) || [])
          .filter((u) => u.satoshis > 0 && u.script && u.script.startsWith('76a914'))
          .filter((u) => !(u.txid === idTxid && u.outputIndex === idVout))
          .sort((a, b) => b.satoshis - a.satoshis);
        publishPlainSats = utxos.reduce((sum, u) => sum + u.satoshis, 0);

        const needed = LISTING_DEPOSIT_SATS + LISTING_FEE_SATS;
        const picked = [];
        let total = 0;
        for (let i = 0; i < utxos.length; i += 1) {
          const u = utxos[i];
          picked.push(u);
          total += u.satoshis;
          if (total >= needed) break;
        }
        if (total < needed) {
          throw new Error(
            `no spendable plain ${coinObj.id} UTXOs at ${sellerAddress}; found ${publishPlainSats / 1e8}, need ${needed / 1e8}`,
          );
        }

        const offerKey = deriveOfferIndexKey(
          IDENTITY_OFFER_BASE_KEY,
          offerParams.offeredIdentityId,
        );
        const forKey = deriveOfferIndexKey(
          OFFER_FOR_CURRENCY_BASE_KEY,
          offerParams.forCurrencyId,
        );
        const ownerHash = fromBase58Check(sellerAddress).hash;

        const ltxb = new TransactionBuilder(network);
        ltxb.setVersion(4);
        ltxb.setVersionGroupId(SAPLING_VERSION_GROUP_ID);
        ltxb.setExpiryHeight(Math.min(expiryHeight, curHeight + ONE_DAY_BLOCKS));
        for (let i = 0; i < picked.length; i += 1) {
          const u = picked[i];
          ltxb.addInput(u.txid, u.outputIndex, 0xffffffff);
        }
        ltxb.addOutput(buildListingDepositScript(forKey, offerKey, ownerHash), LISTING_DEPOSIT_SATS);
        const changeSats = total - needed;
        if (changeSats >= DUST_THRESHOLD_SATS) {
          ltxb.addOutput(baddress.toOutputScript(sellerAddress, network), changeSats);
        }
        ltxb.addOutput(buildListingOpReturnScript(signedHex), 0);

        const unsignedListingHex = ltxb.buildIncomplete().toHex();
        const fundedLtxb = getFundedTxBuilder(
          unsignedListingHex,
          network,
          picked.map((u) => Buffer.from(u.script, 'hex')),
        );
        for (let i = 0; i < picked.length; i++) {
          fundedLtxb.sign(i, keyPair, null, 1, picked[i].satoshis);
        }
        listingHex = fundedLtxb.build().toHex();
        const sendRes = await endpoint.sendRawTransaction(listingHex);
        if (sendRes && sendRes.result && typeof sendRes.result === 'string') {
          onchainListingTxid = sendRes.result;
        } else {
          throw new Error((sendRes && sendRes.error && sendRes.error.message) || 'broadcast failed');
        }
      } catch (pubErr) {
        publishError = pubErr;
        console.warn(
          '[MarketplaceMakeOffer] on-chain publication failed:',
          pubErr && pubErr.message,
        );
      }

      if (!onchainListingTxid) {
        const detail = publishError && publishError.message ? publishError.message : 'unknown publish error';
        const fundingDetail = publishFundingAddress
          ? ` Funding address: ${publishFundingAddress}; plain balance seen by wallet: ${publishPlainSats / 1e8} ${coinObj.id}.`
          : '';
        throw new Error(
          `Could not publish the listing on-chain: ${detail}.${fundingDetail}`,
        );
      }

      // 6. Return the signed offer, the listing txid, AND the raw listing hex
      // to the requester. The marketplace server re-broadcasts the listing hex
      // to its own node if P2P propagation hasn't delivered it yet, eliminating
      // the race where the wallet's node sees the tx but the server's doesn't.
      const responseURIs = (request && request.responseURIs) || [];
      if (responseURIs.length === 0) {
        throw new Error('Request has no response URI to return the signed offer to');
      }
      const responseUri = responseURIs[0].getUriString();

      const postRes = await fetch(responseUri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedHex,
          onchainListingTxid,
          onchainListingHex: listingHex,
        }),
      }).then((r) => r.json());

      if (postRes && postRes.error) {
        throw new Error(postRes.error);
      }

      createAlert(
        'Listing Signed',
        `Your sell offer was signed on this device.\n\nNFT: ${identityName || offerParams.offeredIdentityId}\nPrice: ${offerParams.forAmountSats.toNumber() / 1e8} ${coinObj.id}`,
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
