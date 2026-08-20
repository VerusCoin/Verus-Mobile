import {
  ELECTRUM_AMBIGUOUS_BROADCAST_CODE,
  postElectrum,
} from '../callCreators'
import { getUnspentFormatted } from './getUnspent';
import { getOneTransaction } from './getTransaction';
import { maxSpendBalance, satsToCoins, coinsToSats, truncateDecimal } from '../../../../math'
import coinSelect from 'coinselect';
import { buildSignedTx } from '../../../../crypto/buildTx'
import { ELECTRUM } from '../../../../constants/intervalConstants';
import BigNumber from 'bignumber.js';
import { networks, Transaction } from 'bitgo-utxo-lib';
import { requestPrivKey } from '../../../../auth/authBox';
import { REQUEST_TIMEOUT_MS } from '../../../../../../env/index';
import {
  DEFAULT_MAX_FEE_RATE_PER_BYTE,
  assertAndUseReportedInputValues,
  assertAndUseVerifiedInputValues,
  assertFeeWithinLimits,
  assertSanePotentialTransactionFee,
  estimateLegacyTransactionByteSize,
} from '../transactionFee';
import {
  getParsedTransactionId,
  parseAndVerifyRawTransaction,
  parseRawTransaction,
} from '../transactionId';

export const ELECTRUM_BROADCAST_REJECTED_CODE =
  "ELECTRUM_BROADCAST_REJECTED";
export const ELECTRUM_RECONCILIATION_PROPAGATION_DELAY_MS = 30000;

const traditionalSendGuards = new Map();

const isTransactionId = value =>
  typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);

const normalizeIntentFee = defaultFee => {
  if (
    defaultFee != null &&
    typeof defaultFee === 'object' &&
    defaultFee.feePerByte != null
  ) {
    return `per-byte:${BigNumber(defaultFee.feePerByte).toString()}`;
  }

  return `fixed:${BigNumber(defaultFee || 0).toString()}`;
};

const createTraditionalSendIntent = ({
  outputAddress,
  value,
  defaultFee,
  memo,
}) => ({
  outputAddress,
  value: BigNumber(value).toString(),
  fee: normalizeIntentFee(defaultFee),
  memo: memo == null ? null : String(memo),
});

const traditionalSendIntentMatches = (first, second) => {
  return (
    first != null &&
    second != null &&
    first.outputAddress === second.outputAddress &&
    first.value === second.value &&
    first.fee === second.fee &&
    first.memo === second.memo
  );
};

const traditionalSendGuardKey = (coinId, ownerAddress) => {
  if (typeof coinId !== 'string' || coinId.length === 0) {
    throw new Error('The transaction coin ID is missing.');
  }

  if (typeof ownerAddress !== 'string' || ownerAddress.length === 0) {
    throw new Error('The transaction source address is missing.');
  }

  return `${coinId.toUpperCase()}:${ownerAddress}`;
};

const createPendingSendError = (
  pendingSend,
  message =
    'A transaction for this wallet still has an unresolved broadcast status. Only its exact signed transaction can be retried.',
) => {
  const error = new Error(message);

  error.code = ELECTRUM_AMBIGUOUS_BROADCAST_CODE;
  error.ambiguousBroadcast = true;
  error.pendingTraditionalSend = true;
  error.localTxid = pendingSend?.localTxid;
  return error;
};

const withPendingSendDetails = (broadcastResult, pendingSend) => ({
  ...broadcastResult,
  result: {
    ...broadcastResult.result,
    toAddress: pendingSend.intent.outputAddress,
    fromAddress: pendingSend.ownerAddress,
    value: pendingSend.intent.value,
    fee: pendingSend.fee,
    memo: pendingSend.intent.memo,
  },
});

const clearTraditionalSendGuard = pendingSend => {
  if (traditionalSendGuards.get(pendingSend.guardKey) === pendingSend) {
    traditionalSendGuards.delete(pendingSend.guardKey);
  }
};

// The guard is deliberately process-local. This export is only used to keep
// unit tests isolated; production callers clear entries through definitive
// broadcast outcomes below.
export const resetTraditionalSendGuards = () => {
  traditionalSendGuards.clear();
};

const broadcastErrorResult = ({
  ambiguous,
  code,
  message,
  response,
  localTxid,
  serverTxid,
}) => ({
  err: true,
  ambiguous,
  ambiguousBroadcast: ambiguous,
  code,
  localTxid,
  serverTxid,
  result: {
    message,
    response,
    localTxid,
    serverTxid,
  },
});

const withReconciliationTimeout = (request, timeoutMs) => {
  let timeoutId;
  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Electrum transaction reconciliation timed out.'));
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve(request), timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

const waitForPropagation = delayMs =>
  new Promise(resolve => setTimeout(resolve, delayMs));

const notifyReconciliationStatus = (onReconciliationStatus, status) => {
  if (typeof onReconciliationStatus !== 'function') return;

  try {
    onReconciliationStatus(status);
  } catch (_) {
    // Loading copy must never change transaction reconciliation semantics.
  }
};

const normalizeReconciliationOptions = options => {
  if (typeof options === 'number') {
    return {requestTimeoutMs: options};
  }

  return options != null && typeof options === 'object' ? options : {};
};

export const reconcileElectrumBroadcast = async (
  coinObj,
  localTxid,
  network,
  options = {},
) => {
  const {
    requestTimeoutMs = REQUEST_TIMEOUT_MS,
    propagationDelayMs = ELECTRUM_RECONCILIATION_PROPAGATION_DELAY_MS,
    wait = waitForPropagation,
    onReconciliationStatus,
  } = normalizeReconciliationOptions(options);

  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) return false;
  if (!Number.isFinite(propagationDelayMs) || propagationDelayMs < 0) return false;
  if (typeof wait !== 'function') return false;

  try {
    // A response can be lost after one backend accepts the transaction while
    // the backend selected for reconciliation has not indexed it yet.
    notifyReconciliationStatus(onReconciliationStatus, {
      phase: 'waiting',
      delayMs: propagationDelayMs,
      txid: localTxid,
      coinId: coinObj.id,
    });

    if (propagationDelayMs > 0) await wait(propagationDelayMs);

    notifyReconciliationStatus(onReconciliationStatus, {
      phase: 'checking',
      delayMs: propagationDelayMs,
      txid: localTxid,
      coinId: coinObj.id,
    });

    const response = await withReconciliationTimeout(
      getOneTransaction(coinObj, localTxid),
      requestTimeoutMs,
    );

    if (typeof response?.result !== 'string') return false;

    parseAndVerifyRawTransaction(response.result, localTxid, network);
    return true;
  } catch (_) {
    return false;
  }
};

const reconciledBroadcastResult = (localTxid, pendingSend = null) => {
  const result = {
    err: false,
    reconciled: true,
    result: {
      txid: localTxid,
      params: {reconciled: true},
    },
  };

  return pendingSend == null
    ? result
    : withPendingSendDetails(result, pendingSend);
};

export const pushTx = async (
  coinObj,
  _rawtx,
  reconciliationOptions = {},
) => {
  const callType = 'pushtx'
  let serverList = coinObj.electrum_endpoints
  let data = { rawtx: _rawtx }
  const network = networks[coinObj.id.toLowerCase()]
    ? networks[coinObj.id.toLowerCase()]
    : networks.default;
  let localTxid;

  try {
    localTxid = getParsedTransactionId(parseRawTransaction(_rawtx, network));
  } catch (error) {
    return broadcastErrorResult({
      ambiguous: false,
      code: ELECTRUM_BROADCAST_REJECTED_CODE,
      message: error?.message || 'Unable to parse the signed transaction.',
    });
  }

  const resolveAmbiguousBroadcast = async ({message, response, serverTxid}) => {
    const reconciled = await reconcileElectrumBroadcast(
      coinObj,
      localTxid,
      network,
      reconciliationOptions,
    );

    if (reconciled) return reconciledBroadcastResult(localTxid);

    return broadcastErrorResult({
      ambiguous: true,
      code: ELECTRUM_AMBIGUOUS_BROADCAST_CODE,
      message,
      response,
      localTxid,
      serverTxid,
    });
  };

  try {
    const response = await postElectrum(serverList, callType, data);
    const resultLooksLikeServerError =
      response?.result != null &&
      typeof response.result === "object" &&
      (response.result.code != null || response.result.message != null);

    if (
      response?.error != null ||
      response?.msg === "error" ||
      resultLooksLikeServerError
    ) {
      const responseError = response.error || response.result;
      const message =
        responseError?.message ||
        (typeof responseError === "string"
          ? responseError
          : "Electrum server rejected the transaction.");

      return broadcastErrorResult({
        ambiguous: false,
        code: responseError?.code || ELECTRUM_BROADCAST_REJECTED_CODE,
        message,
        response,
        localTxid,
      });
    }

    if (!isTransactionId(response?.result)) {
      return resolveAmbiguousBroadcast({
        message:
          "Transaction broadcast status is unknown because the Electrum proxy returned no valid transaction ID. Do not resend until you check transaction history.",
        response,
      });
    }

    if (response.result.toLowerCase() !== localTxid) {
      return resolveAmbiguousBroadcast({
        message:
          "Transaction broadcast status is unknown because the Electrum proxy returned a different transaction ID. Do not resend until you check transaction history.",
        response,
        serverTxid: response.result,
      });
    }

    return {
      err: false,
      result: {
        txid: localTxid,
        params: {},
      },
    };
  } catch (error) {
    const ambiguous = error?.ambiguousBroadcast === true;

    if (ambiguous) {
      return resolveAmbiguousBroadcast({
        message:
          "Transaction broadcast status is unknown because the Electrum response was lost. Do not resend until you check transaction history.",
      });
    }

    return broadcastErrorResult({
      ambiguous: false,
      code: error?.code || ELECTRUM_BROADCAST_REJECTED_CODE,
      message: error?.message || "Unable to broadcast transaction.",
      localTxid,
    });
  }
}

export const txPreflight = (
  coinObj,
  activeUser,
  outputAddress,
  value,
  params,
  signTx = false
) => {
  let { defaultFee, network, verifyMerkle, verifyTxid = true } = params;
  const requireVerifiedInputValues =
    verifyTxid !== false || coinObj.id === "KMD";
  value = BigNumber(truncateDecimal(coinsToSats(value), coinObj.decimals));

  return new Promise((resolve, reject) => {
    getUnspentFormatted(
      coinObj,
      activeUser,
      verifyMerkle,
      verifyTxid !== false,
    )
      .then(async (res) => {
        let utxoList = res.utxoList;
        let unshieldedFunds = res.unshieldedFunds;

        if (utxoList && utxoList.length) {
          let utxoListFormatted = [];
          let totalInterest = 0;
          let interestClaimThreshold = 200;
          let utxoVerified = true;
          let changeAddress;
          let feePerByte = 0;
          let btcFees = false;
          let feeTakenFromAmount = false;
          let amountSubmitted = value;

          if (
            typeof defaultFee === "object" &&
            defaultFee != null &&
            defaultFee.feePerByte != null
          ) {
            //BTC Fee style detected, changing fee unit to fee per byte and
            //feeding value into coinselect
            feePerByte = Number(defaultFee.feePerByte);

            if (!Number.isFinite(feePerByte) || feePerByte <= 0) {
              throw new Error("Invalid transaction fee rate.");
            }

            defaultFee = BigNumber(0);
            btcFees = true;
          }

          if (
            activeUser.keys[coinObj.id] != null &&
            activeUser.keys[coinObj.id].electrum != null &&
            activeUser.keys[coinObj.id].electrum.addresses.length > 0
          ) {
            changeAddress = activeUser.keys[coinObj.id].electrum.addresses[0];
          } else {
            throw new Error(
              "Error, " +
                activeUser.id +
                " user keys for active coin " +
                coinObj.display_ticker +
                " not found!"
            );
          }

          utxoListFormatted = requireVerifiedInputValues
            ? assertAndUseVerifiedInputValues(utxoList)
            : assertAndUseReportedInputValues(utxoList);

          const _maxSpendBalance = maxSpendBalance(utxoListFormatted);

          let targets = [
            {
              address: outputAddress,
              value: value,
            },
          ];

          //If a no fee per byte is passed, the default transaction fee is used
          if (feePerByte === 0) {
            //if transaction value is more than what is spendable with fee included, subtract fee from amount
            //else, add fee to amount to take fee from wallet
            if (value.isGreaterThan(_maxSpendBalance.minus(defaultFee))) {
              amountSubmitted = value;
              value = _maxSpendBalance.minus(defaultFee);
              targets[0].value = _maxSpendBalance;

              feeTakenFromAmount = true;
            } else {
              targets[0].value = targets[0].value.plus(defaultFee);
            }
          }

          targets[0].value = targets[0].value.toNumber();

          let { inputs, outputs, fee } = coinSelect(
            utxoListFormatted,
            targets,
            feePerByte
          );

          if (!outputs) {
            amountSubmitted = value;
            value = value.minus(BigNumber(fee));
            targets[0].value = value.toNumber();
            feeTakenFromAmount = true;

            let secondRun = coinSelect(utxoListFormatted, targets, feePerByte);
            inputs = secondRun.inputs;
            outputs = secondRun.outputs;
            fee = secondRun.fee;
          }

          if (!outputs) {
            throw new Error(
              "Insufficient funds. Failed to calculate acceptable transaction amount with fee of " +
                satsToCoins(BigNumber(fee ? fee : defaultFee)) +
                "."
            );
          }

          if (!fee) {
            outputs[0].value = BigNumber(outputs[0].value)
              .minus(defaultFee)
              .toNumber();
          }

          let _change = 0;

          if (outputs && outputs.length === 2) {
            _change = outputs[1].value;
          }

          // check if any outputs are unverified
          if (inputs && inputs.length) {
            for (let i = 0; i < inputs.length; i++) {
              //TODO: Warnings for both txid verification and merkle verification
              if (!inputs[i].verifiedMerkle) {
                utxoVerified = false;
                break;
              }
            }

            for (let i = 0; i < inputs.length; i++) {
              if (Number(inputs[i].interestSats) > interestClaimThreshold) {
                totalInterest += Number(inputs[i].interestSats);
              }
            }
          }

          if (value.isGreaterThan(_maxSpendBalance)) {
            const successObj = {
              err: true,
              result:
                `Spend value is too large. Max available amount is ${satsToCoins(
                  _maxSpendBalance
                ).toString()}.` +
                (unshieldedFunds.isGreaterThan(BigNumber(0))
                  ? `\n\nThis is most likely due to the fact that you have ${satsToCoins(
                      unshieldedFunds
                    ).toString()} ${coinObj.id}
          in unshielded funds received from mining in your wallet. Please unshield through a native client prior to sending through Verus Mobile`
                  : null),
            };

            resolve(successObj);
          } else {
            // account for KMD interest
            if (
              (network.coin === "komodo" || network.coin === "kmd") &&
              totalInterest > 0
            ) {
              // account for extra vout
              // const _feeOverhead = outputs.length === 1 ? estimateTxSize(0, 1) * feeRate : 0;
              const _feeOverhead = 0;

              if (__DEV__) {
                console.log(
                  `max interest to claim ${totalInterest} (${
                    totalInterest * 0.00000001
                  })`
                );
                console.log(`estimated fee overhead ${_feeOverhead}`);
                console.log(
                  `current change amount ${_change} (${
                    _change * 0.00000001
                  }), boosted change amount ${
                    _change + (totalInterest - _feeOverhead)
                  } (${
                    (_change + (totalInterest - _feeOverhead)) * 0.00000001
                  })`
                );
              }

              if (_maxSpendBalance.isEqualTo(value)) {
                _change = Math.abs(totalInterest) - _change - _feeOverhead;

                if (outputAddress === changeAddress) {
                  value = value.plus(BigNumber(_change));
                  _change = 0;
                  if (__DEV__) {
                    console.log(
                      `send to self ${outputAddress} = ${changeAddress}`
                    );
                    console.log(
                      `send to self old val ${value}, new val ${
                        value + _change
                      }`
                    );
                  }
                }
              } else {
                _change = _change + (Math.abs(totalInterest) - _feeOverhead);
              }
            }

            if (!inputs && !outputs) {
              const successObj = {
                err: true,
                result: "Can't find best fit utxo. Try lower amount.",
              };

              resolve(successObj);
            } else {
              const plannedFee = btcFees ? fee : defaultFee;
              const claimedInterest =
                network.coin === "komodo" || network.coin === "kmd"
                  ? totalInterest
                  : 0;
              const calculatedFee = assertSanePotentialTransactionFee(
                inputs,
                value,
                _change,
                plannedFee,
                claimedInterest,
                requireVerifiedInputValues,
              );
              const maxFeeRatePerByte =
                coinObj.max_fee_rate_per_byte == null
                  ? DEFAULT_MAX_FEE_RATE_PER_BYTE
                  : coinObj.max_fee_rate_per_byte;
              const maxAbsoluteFee = btcFees ? null : coinObj.fee;
              const estimatedTransactionSize = estimateLegacyTransactionByteSize(
                inputs.length,
                _change > 0 ? 2 : 1,
              );

              assertFeeWithinLimits(calculatedFee, estimatedTransactionSize, {
                maxAbsoluteFee,
                maxFeeRatePerByte,
              });

              let _rawtx;

              if (signTx) {
                _rawtx = buildSignedTx(
                  outputAddress,
                  changeAddress,
                  await requestPrivKey(coinObj.id, ELECTRUM),
                  network,
                  inputs,
                  _change,
                  value.toNumber(),
                  maxFeeRatePerByte
                );

                const signedTransaction = Transaction.fromHex(_rawtx, network);
                const signedOutputTotal = signedTransaction.outs.reduce(
                  (total, output) => total.plus(output.value),
                  BigNumber(0),
                );
                const actualSignedFee = assertSanePotentialTransactionFee(
                  inputs,
                  signedOutputTotal,
                  0,
                  plannedFee,
                  claimedInterest,
                  requireVerifiedInputValues,
                );
                assertFeeWithinLimits(
                  actualSignedFee,
                  signedTransaction.byteLength(),
                  {maxAbsoluteFee, maxFeeRatePerByte},
                );
              }
              
              const successObj = {
                err: false,
                result: {
                  fee: satsToCoins(calculatedFee).toString(),
                  value: satsToCoins(value).toString(),
                  toAddress: outputAddress,
                  fromAddress: changeAddress,
                  amountSubmitted: satsToCoins(amountSubmitted).toString(),
                  memo: null,
                  params: {
                    utxoSet: inputs,
                    change: _change,
                    inputs,
                    outputs,
                    feeTakenFromAmount,
                    network,
                    rawtx: _rawtx,
                    utxoVerified,
                    unshieldedFunds,
                  },
                },
              };

              resolve(successObj);
            }
          }
        } else {
          resolve({
            err: true,
            result:
              `No spendable funds found.` +
              (unshieldedFunds.isGreaterThan(BigNumber(0))
                ? `\n\nThis is most likely due to the fact that you have ${satsToCoins(
                    unshieldedFunds
                  ).toString()} ${coinObj.display_ticker}
        in unshielded funds received from mining in your wallet. Please unshield through a native client prior to sending through Verus Mobile`
                : null),
          });
        }
      })
      .catch((e) => {
        reject(e);
      });
  });
};

export const sendRawTx = async (
  coinObj,
  activeUser,
  outputAddress,
  value,
  params,
  channelIdOrReconciliationOptions,
  explicitReconciliationOptions,
) => {
  const {
    defaultFee,
    network,
    verifyMerkle,
    verifyTxid,
    reconciliationOptions: paramsReconciliationOptions,
    memo,
  } = params;
  // send() reserves the sixth argument for channelId. Direct callers and older
  // tests passed reconciliation options there, so continue accepting both
  // forms while preferring an explicit seventh argument when provided.
  let reconciliationOptions = paramsReconciliationOptions;

  if (explicitReconciliationOptions != null) {
    reconciliationOptions = explicitReconciliationOptions;
  } else if (
    channelIdOrReconciliationOptions != null &&
    typeof channelIdOrReconciliationOptions !== 'string'
  ) {
    reconciliationOptions = channelIdOrReconciliationOptions;
  }

  const ownerAddress =
    activeUser?.keys?.[coinObj.id]?.[ELECTRUM]?.addresses?.[0];
  const guardKey = traditionalSendGuardKey(coinObj.id, ownerAddress);
  const intent = createTraditionalSendIntent({
    outputAddress,
    value,
    defaultFee,
    memo,
  });
  const existing = traditionalSendGuards.get(guardKey);

  if (existing != null) {
    if (existing.status !== 'ambiguous') {
      throw createPendingSendError(
        existing,
        'A transaction for this wallet is already being prepared or broadcast.',
      );
    }

    existing.status = 'resolving';
    const alreadyAccepted = await reconcileElectrumBroadcast(
      coinObj,
      existing.localTxid,
      network,
      reconciliationOptions,
    );

    if (alreadyAccepted) {
      clearTraditionalSendGuard(existing);
      return reconciledBroadcastResult(existing.localTxid, existing);
    }

    if (!traditionalSendIntentMatches(existing.intent, intent)) {
      existing.status = 'ambiguous';
      throw createPendingSendError(
        existing,
        'Another transaction for this wallet still has an unresolved broadcast status. Retry the original transaction before creating a different one.',
      );
    }

    existing.status = 'broadcasting';
    const resumedResult = await pushTx(
      coinObj,
      existing.rawTx,
      reconciliationOptions,
    );

    if (resumedResult.err) {
      // A rejected retry cannot prove that the original ambiguous broadcast
      // was rejected, so keep guarding the exact signed transaction.
      existing.status = 'ambiguous';
      const error = createPendingSendError(
        existing,
        resumedResult.ambiguousBroadcast === true
          ? resumedResult.result.message
          : 'The pending transaction was not found and its exact rebroadcast was rejected. Its original broadcast status is still unknown.',
      );
      error.result = resumedResult;
      throw error;
    }

    clearTraditionalSendGuard(existing);
    return withPendingSendDetails(resumedResult, existing);
  }

  const pendingSend = {
    guardKey,
    ownerAddress,
    intent,
    rawTx: null,
    localTxid: null,
    fee: null,
    status: 'preparing',
  };
  traditionalSendGuards.set(guardKey, pendingSend);

  let preflightResult;

  try {
    preflightResult = await txPreflight(
      coinObj,
      activeUser,
      outputAddress,
      value,
      {
        defaultFee,
        network,
        verifyMerkle,
        verifyTxid,
      },
      true,
    );

    if (preflightResult.err) {
      const preflightError = new Error(
        typeof preflightResult.result === 'string'
          ? preflightResult.result
          : 'Transaction preflight failed.',
      );
      preflightError.result = preflightResult;
      throw preflightError;
    }

    const rawTx = preflightResult.result.params.rawtx;
    const localTxid = getParsedTransactionId(parseRawTransaction(rawTx, network));
    pendingSend.rawTx = rawTx;
    pendingSend.localTxid = localTxid;
    pendingSend.fee = preflightResult.result.fee;
    pendingSend.status = 'broadcasting';
  } catch (error) {
    clearTraditionalSendGuard(pendingSend);
    throw error;
  }

  const broadcastResult = await pushTx(
    coinObj,
    pendingSend.rawTx,
    reconciliationOptions,
  );

  if (broadcastResult.err) {
    if (broadcastResult.ambiguousBroadcast === true) {
      pendingSend.status = 'ambiguous';
    } else {
      clearTraditionalSendGuard(pendingSend);
    }

    const broadcastError = new Error(broadcastResult.result.message);
    broadcastError.code = broadcastResult.code;
    broadcastError.ambiguousBroadcast = broadcastResult.ambiguousBroadcast;
    broadcastError.localTxid = broadcastResult.localTxid;
    broadcastError.serverTxid = broadcastResult.serverTxid;
    broadcastError.result = broadcastResult;
    broadcastError.pendingTraditionalSend =
      broadcastResult.ambiguousBroadcast === true;
    throw broadcastError;
  }

  clearTraditionalSendGuard(pendingSend);
  return broadcastResult;
}
