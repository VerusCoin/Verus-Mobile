import BigNumber from "bignumber.js";
import { MID_VERIFICATION, NO_VERIFICATION } from "../../../../utils/constants/constants";
import { isNumber, satsToCoins, truncateDecimal } from "../../../../utils/math";
import { networks } from 'bitgo-utxo-lib';
import { extractIdentityAddress } from "../../../../utils/api/channels/dlight/callCreators";
import { createAlert } from "../../alert/dispatchers/alert";
import { send } from "../../../../utils/api/routers/send";
import { preflight } from "../../../../utils/api/routers/preflight";
import store from "../../../../store";

export class TraditionalCryptoSendFee {
  constructor (fee, isPerByte = false) {
    this.fee = fee
    this.isPerByte = isPerByte
  }

  getParamValue() {
    return isNumber(this.fee) ? BigNumber(this.fee) : null;
  }
}

export const traditionalCryptoSend = async (
  coinObj,
  channel,
  address,
  amount,
  memo,
  tradSendFee,
  returnTx = false,
  passthrough = {}
) => {
  const state = store.getState()

  const activeUser = state.authentication.activeAccount;
  const coinSettings = state.settings.coinSettings;
  const useIdShortcuts = state.settings.generalWalletSettings.verusIdShortcutsEnabled

  const network = networks[coinObj.id.toLowerCase()]
    ? networks[coinObj.id.toLowerCase()]
    : networks["default"];

  let verifyMerkle, verifyTxid;

  if (coinSettings[coinObj.id]) {
    verifyMerkle = coinSettings[coinObj.id].verificationLvl > MID_VERIFICATION ? true : false;
    verifyTxid = coinSettings[coinObj.id].verificationLvl > NO_VERIFICATION ? true : false;
  } else {
    console.warn(
      `No coin settings data found for ${coinObj.id} in ConfirmSend, assuming highest verification level`
    );
    verifyMerkle = true;
    verifyTxid = true;
  }

  try {
    let identity;
    let destinationAddress;

    if (address.includes("@")) {
      if (useIdShortcuts) {
        destinationAddress = await extractIdentityAddress(address, coinObj.id);
        identity = address;
      } else {
        throw new Error(
          'VerusID Shortcuts are not enabled. To enable them, turn them on in the "General Wallet Settings" menu.'
        );
      }
    } else {
      destinationAddress = address;
    }

    const params = [
      coinObj,
      activeUser,
      destinationAddress,
      amount,
      channel,
      {
        defaultFee:
          tradSendFee != null
            ? tradSendFee.isPerByte
              ? { feePerByte: tradSendFee.fee }
              : tradSendFee.fee
            : coinObj.fee,
        network,
        verifyMerkle,
        verifyTxid,
        memo,
        ...passthrough
      },
    ];

    const res = !returnTx ? await send(...params) : await preflight(...params);

    if (res.err || !res) {
      throw new Error(res ? res.result : "Unknown error");
    } else {
      if (!returnTx) {
        return {
          toAddress: destinationAddress,
          fees: [
            {
              amount:
                res.result.fee != null
                  ? new TraditionalCryptoSendFee(res.result.fee).getParamValue
                  : tradSendFee != null
                  ? tradSendFee.getParamValue
                  : coinObj.fee,
              isPerByte: tradSendFee != null && tradSendFee.isPerByte,
              currency: res.result.feeCurr == null ? coinObj.id : res.result.feeCurr,
            },
          ],
          utxoCrossChecked: true,
          coinObj,
          channel,
          memo,
          finalTxAmount: res.result.value != null ? res.result.value : amount.toString(),
          txid: res.result.txid,
        };
      } else {
        const feeTakenFromAmount = res.result.params.feeTakenFromAmount;

        const finalTxAmount = res.result.value

        const balanceDelta = BigNumber(0).minus(BigNumber(finalTxAmount)).minus(BigNumber(res.result.fee)).toString()
        
        let feeTakenMessage;

        if (feeTakenFromAmount) {
          if (
            res.result.unshieldedFunds == null ||
            res.result.unshieldedFunds.isEqualTo(BigNumber(0))
          ) {
            feeTakenMessage =
              "Your transaction amount has been changed to " +
              finalTxAmount +
              " " +
              coinObj.id +
              " as you do not have sufficient funds to cover your submitted amount of " +
              res.result.amountSubmitted +
              " " +
              coinObj.id +
              " + a fee of " +
              res.result.fee +
              " " +
              coinObj.id +
              ".";
          } else if (res.result.unshieldedFunds != null) {
            feeTakenMessage =
              "Your transaction amount has been changed to " +
              finalTxAmount +
              " " +
              coinObj.id +
              " as you do not have sufficient funds to cover your submitted amount of " +
              res.result.amountSubmitted +
              " " +
              coinObj.id +
              " + a fee of " +
              res.result.fee +
              " " +
              coinObj.id +
              ". This could be due to the " +
              satsToCoins(res.result.unshieldedFunds).toString() +
              " in unshielded " +
              coinObj.id +
              " your " +
              "wallet contains. Log into a native client and shield your mined funds to be able to use them.";
          }
        }

        return {
          toAddress: res.result.toAddress,
          identity,
          network: res.result.params.network,
          amountSubmitted: res.result.amountSubmitted,
          utxoCrossChecked: res.result.params.utxoVerified,
          coinObj: coinObj,
          channel,
          memo: res.result.memo,
          balanceDelta,
          finalTxAmount: finalTxAmount,
          fees: [
            {
              amount: res.result.fee,
              isPerByte: tradSendFee != null && tradSendFee.isPerByte,
              currency: res.result.feeCurr == null ? coinObj.id : res.result.feeCurr,
            },
          ],
          tradSendFee,
          txid: res.result.txid,
          feeTakenMessage,
        };
      }
    }
  } catch (e) {
    console.warn(e)

    if (e.message && e.message.includes("has no matching Script")) {
      throw new Error(`"${address}" is not a valid destination.`)
    } else if (e.message) {
      throw new Error(e.message)
    } else {
      throw new Error("Unknown error while building transaction, double check form data")
    }
  }
};
