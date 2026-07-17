/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
import utxoLib from '@bitgo/utxo-lib';

const { networks, ECPair, Transaction } = utxoLib;
import Styles from '../../../styles';
import Colors from '../../../globals/colors';
import { requestPrivKey } from '../../../utils/auth/authBox';
import { VRPC } from '../../../utils/constants/intervalConstants';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import VrpcProvider from '../../../utils/vrpc/vrpcInterface';
import { coinsList } from '../../../utils/CoinData/CoinsList';
import cardStyles from '../components/marketplaceCardStyles';
import {
  signRegisterIdentityCommitmentInput,
  findCommitmentVin,
} from '../../../utils/crypto/signRegisterIdentityCommitment';

/**
 * Confirmation screen for registeridentity GenericRequest ordinal 18
 * (vrsc::request.identity.register).
 *
 * Signs ONLY the name-commitment input by *appending* a SmartTransactionSignature
 * onto any existing parent/funding fulfillments. Does NOT use getFundedTxBuilder
 * (that replaces the whole CC blob and breaks vrealv1 2-of-2). Never broadcasts —
 * POSTs { signedHex } to the response URI for API parent finalization.
 */
const RegisterIdentityRequestInfo = (props) => {
  const {
    registerIdentityRequest, cancel, next, response, request, detailIndex,
  } = props;

  const [submitting, setSubmitting] = useState(false);

  const isTestnet = request && request.isTestnet ? request.isTestnet() : true;
  const coinObj = isTestnet ? coinsList.VRSCTEST : coinsList.VRSC;

  const registerParams = registerIdentityRequest
    && registerIdentityRequest.containsRegisterParams
    && registerIdentityRequest.containsRegisterParams()
    ? registerIdentityRequest.registerParams
    : null;

  const description = registerIdentityRequest
    && registerIdentityRequest.containsDesc
    && registerIdentityRequest.containsDesc()
    ? registerIdentityRequest.description
    : null;

  useEffect(() => {
    if (!registerParams && !(registerIdentityRequest && registerIdentityRequest.containsReturnTx
      && registerIdentityRequest.containsReturnTx())) {
      createAlert('Error', 'Register identity request is missing registration parameters');
      cancel();
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    try {
      const returnTxHex = registerIdentityRequest
        && registerIdentityRequest.containsReturnTx
        && registerIdentityRequest.containsReturnTx()
        ? registerIdentityRequest.returnTxHex
        : null;
      if (!returnTxHex) {
        throw new Error('Request is missing the registeridentity return transaction');
      }

      const responseURIs = (request && request.responseURIs) || [];
      if (responseURIs.length === 0) {
        throw new Error('Request has no response URI to return the signed transaction to');
      }
      const responseUri = responseURIs[0].getUriString();

      const network = networks.verus;
      const spendingKey = await requestPrivKey(coinObj.id, VRPC);
      const keyPair = ECPair.fromWIF(spendingKey, network);
      const endpoint = VrpcProvider.getEndpoint(coinObj.system_id);

      // Prefer commitment txid from request params; fall back to scanning vins.
      let commitmentTxid = null;
      if (registerParams && registerParams.commitmentTxid) {
        commitmentTxid = registerParams.commitmentTxid;
      } else if (registerParams && registerParams.commitment_txid) {
        commitmentTxid = registerParams.commitment_txid;
      }

      let commitVin = commitmentTxid
        ? findCommitmentVin(returnTxHex, commitmentTxid, network)
        : -1;

      if (commitVin < 0) {
        // Fallback: find vin whose prevout has a commitmenthash
        const tx = Transaction.fromHex(returnTxHex, network);
        for (let i = 0; i < tx.ins.length; i += 1) {
          const prevHash = Buffer.from(tx.ins[i].hash).reverse().toString('hex');
          // Inputs must be checked in transaction order until the commitment prevout is found.
          // eslint-disable-next-line no-await-in-loop
          const txRes = await endpoint.getRawTransaction(prevHash, 1);
          const vout = txRes
            && txRes.result
            && txRes.result.vout
            && txRes.result.vout[tx.ins[i].index];
          if (vout && vout.scriptPubKey && vout.scriptPubKey.commitmenthash) {
            commitVin = i;
            commitmentTxid = prevHash;
            break;
          }
        }
      }

      if (commitVin < 0 || !commitmentTxid) {
        throw new Error('Could not locate the name-commitment input to sign');
      }

      const tx = Transaction.fromHex(returnTxHex, network);
      const prevHash = Buffer.from(tx.ins[commitVin].hash).reverse().toString('hex');
      const prevIndex = tx.ins[commitVin].index;
      const txRes = await endpoint.getRawTransaction(prevHash, 1);
      if (!txRes || txRes.error || !txRes.result || !txRes.result.vout
        || !txRes.result.vout[prevIndex]) {
        throw new Error('Could not fetch commitment prevout');
      }
      const vout = txRes.result.vout[prevIndex];
      if (!vout.scriptPubKey || !vout.scriptPubKey.hex) {
        throw new Error('Commitment prevout missing scriptPubKey');
      }
      const prevOutScript = Buffer.from(vout.scriptPubKey.hex, 'hex');
      const satoshis = Math.round((vout.value || 0) * 1e8);

      const signedHex = signRegisterIdentityCommitmentInput(
        returnTxHex,
        commitVin,
        keyPair,
        prevOutScript,
        satoshis,
        network,
      );

      const postRes = await fetch(responseUri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedHex }),
      }).then((r) => r.json());

      if (postRes && postRes.error) {
        throw new Error(postRes.error);
      }

      createAlert(
        'Registration Signed',
        `Your signatures were returned to the requester.${
          registerParams && registerParams.name
            ? `\n\nIdentity: ${registerParams.name}`
            : ''
        }`,
      );
      next(response, [detailIndex]);
    } catch (e) {
      console.error('[RegisterIdentity] confirm error:', e && e.message, e);
      createAlert('Signing failed', (e && e.message) || String(e));
    } finally {
      setSubmitting(false);
    }
  }, [registerIdentityRequest, request, coinObj, cancel, next, response, detailIndex, registerParams]);

  const name = registerParams && registerParams.name ? registerParams.name : '—';
  const parent = registerParams && registerParams.parent ? registerParams.parent : '—';
  let primaries = '—';
  if (registerParams && registerParams.primaryAddresses) {
    primaries = registerParams.primaryAddresses.join('\n');
  } else if (registerParams && registerParams.primaryaddresses) {
    primaries = [].concat(registerParams.primaryaddresses).join('\n');
  }

  return (
    <View style={Styles.flexBackground}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 20, color: Colors.quaternaryColor, paddingBottom: 8 }}>
          Register VerusID
        </Text>
        {description ? (
          <Text style={{ fontSize: 14, marginBottom: 12 }}>{description}</Text>
        ) : null}
        <View style={cardStyles.card}>
          <Text style={{ fontWeight: '600', marginBottom: 4 }}>Name</Text>
          <Text style={{ marginBottom: 8 }}>{name}</Text>
          <Divider style={{ marginVertical: 8 }} />
          <Text style={{ fontWeight: '600', marginBottom: 4 }}>Parent</Text>
          <Text style={{ marginBottom: 8 }}>{parent}</Text>
          <Divider style={{ marginVertical: 8 }} />
          <Text style={{ fontWeight: '600', marginBottom: 4 }}>Primary address(es)</Text>
          <Text>{primaries}</Text>
        </View>
        <Text style={{ fontSize: 13, marginTop: 12, opacity: 0.8 }}>
          This signs the name-commitment input only. The requester attaches the
          namespace co-signature and broadcasts — your wallet will not broadcast.
        </Text>
      </ScrollView>
      <View style={{ flexDirection: 'row', padding: 16 }}>
        <Button mode="outlined" onPress={cancel} disabled={submitting} style={{ flex: 1, marginRight: 8 }}>
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={submitting}
          disabled={submitting}
          style={{ flex: 1 }}
        >
          Sign
        </Button>
      </View>
    </View>
  );
};

export default RegisterIdentityRequestInfo;
