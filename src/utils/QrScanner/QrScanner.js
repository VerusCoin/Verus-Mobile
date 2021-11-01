import BigNumber from "bignumber.js";
import store from "../../store";
import { coinExistsInWallet, findCurrencyByImportId, getCoinFromActiveCoins } from "../CoinData/CoinData";
import { FORMAT_UNKNOWN, INCOMPATIBLE_COIN, INCOMPLETE_VERUS_QR, PARSE_ERROR } from "../constants/constants";
import { satsToCoins } from "../math";
import { isJson } from "../objectManip";
import { ProcessedPaymentRequest } from "./ProcessedQr";
import VerusPayParser from '../verusPay/index'
import { coinsList } from "../CoinData/CoinsList";
import { removeSpaces } from "../stringUtils";

class QrScanner {
  constructor() {}

  processGenericPaymentRequest(raw) {
    if (isJson(raw)) {
      let resultParsed = JSON.parse(raw);
      const { coinTicker, amount, address, note } = resultParsed;

      if (resultParsed.verusQR) {
        return this.processVerusQr(
          {
            coinTicker,
            address,
            note,
            amount: amount ? satsToCoins(BigNumber(amount)) : BigNumber(amount),
          },
          raw
        );
      } else if (resultParsed.address && resultParsed.amount && resultParsed.coin) {
        //TODO: Handle other style QR codes here
        return this.processVerusQr(
          {
            coinTicker: resultParsed.coin,
            amount: BigNumber(resultParsed.amount),
            address: resultParsed.address,
          },
          raw
        );
      } else {
        throw new Error(FORMAT_UNKNOWN);
      }
    } else if (typeof raw === "string") {
      try {
        const request = VerusPayParser.v0.readVerusPay(raw);
        const coinObj = findCurrencyByImportId(request);

        return this.processVerusQr(
          {
            coinTicker: coinObj.id,
            address: request.destination,
            amount: BigNumber(request.amount),
            note: request.note,
          },
          raw
        );
      } catch (e) {
        // Try parsing different types of coin URIs
        let parsedURI = this.processPaymentRequestURI(raw);

        if (parsedURI != null) {
          return this.processVerusQr(parsedURI, raw);
        } else {
          // Assume QR is simply an address QR and return an address
          return new ProcessedPaymentRequest(raw, null, raw, null, null);
        }
      }
    } else {
      throw new Error(FORMAT_UNKNOWN);
    }
  }

  processVerusQr(verusQR, raw) {
    const coinTicker = verusQR.coinTicker;
    const address = verusQR.address;
    const amount = verusQR.hasOwnProperty("amount") ? verusQR.amount : null;
    const note = verusQR.note;
    const state = store.getState();

    if (coinTicker != null && address != null) {
      if (coinExistsInWallet(coinTicker)) {
        let requestedCoin = getCoinFromActiveCoins(coinTicker, state.coins.activeCoinsForUser);

        if (requestedCoin) {
          return new ProcessedPaymentRequest(
            raw,
            requestedCoin,
            address,
            amount == null || amount.isLessThanOrEqualTo(0) ? null : amount,
            note
          );
        } else {
          throw new Error(
            `This invoice is requesting funds in ${coinTicker}. Activate ${coinTicker} and rescan to continue.`
          );
        }
      } else {
        //TODO: Handle adding coin that doesn't exist yet in wallet here
        throw new Error(INCOMPLETE_VERUS_QR);
      }
    } else {
      throw new Error(INCOMPLETE_VERUS_QR);
    }
  }

  processPaymentRequestURI = (uri) => {
    //TODO: Add support for messages in btc urls as well (&message=Hello)

    let fullURL = /^\w{1,30}:\w{33,36}\?amount\=[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)/;
    //<coinName>:<address>?amount=<amount>
    let partialURL = /\w{1,30}:\w{33,36}/;
    //<coinName>:<address>

    try {
      let firstTry = uri.match(fullURL);

      if (firstTry) {
        //parse full URL here
        let coinName = firstTry[0].substring(0, firstTry[0].indexOf(":"));
        let address = firstTry[0].substring(firstTry[0].indexOf(":") + 1, firstTry[0].indexOf("?"));
        let amount = firstTry[0].substring(firstTry[0].indexOf("=") + 1);

        if (coinName && address && amount) {
          //Find coin ticker from coin data here, URL uses full name

          for (key in coinsList) {
            if (
              coinsList[key] &&
              (removeSpaces(coinsList[key].display_name).toLowerCase() === coinName.toLowerCase() ||
                coinsList[key].alt_names.some((name) => name === coinName.toLowerCase()))
            ) {
              //Create verusQR compatible data from coin URL
              return {
                coinTicker: coinsList[key].id,
                address: address,
                amount: BigNumber(amount),
              };
            }
          }

          throw new Error(INCOMPATIBLE_COIN);
        }
      } else {
        let secondTry = uri.match(partialURL);

        if (secondTry) {
          //Parse partial URL here
          let coinName = secondTry[0].substring(0, secondTry[0].indexOf(":"));
          let address = secondTry[0].substring(secondTry[0].indexOf(":") + 1);

          for (key in coinsList) {
            const coinObj = coinsList[key];

            if (
              removeSpaces(coinObj.display_name).toLowerCase() === coinName.toLowerCase() ||
              coinObj.alt_names.some((name) => name === coinName.toLowerCase())
            ) {
              //Create verusQR compatible data from coin URL
              return {
                coinTicker: coinObj.id,
                address: address,
              };
            }
          }

          throw new Error(INCOMPATIBLE_COIN);
        } else {
          return null;
        }
      }
    } catch (e) {
      if (e.message !== INCOMPATIBLE_COIN) {
        console.warn(e);
        throw new Error(PARSE_ERROR);
      } else throw e;
    }
  };
}

export default new QrScanner()