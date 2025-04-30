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
import { CoinDirectory } from "../CoinData/CoinDirectory";

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
            systemId: request.system_id
          },
          raw
        );
      } catch (e) {
        // Try parsing different types of coin URIs
        let parsedURI = this.processPaymentRequestURI(raw);

        if (parsedURI != null) {
          return this.processVerusQr(parsedURI, raw);
        } else if (raw.length < 100) {
          // Assume QR is simply an address QR and return an address
          return new ProcessedPaymentRequest(raw, null, raw, null, null);
        } else {
          throw new Error(e.message);
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
    const systemId = verusQR.systemId;
    const state = store.getState();

    if (coinTicker != null && address != null) {
      if (CoinDirectory.coinExistsInDirectory(coinTicker)) {
        let requestedCoin = getCoinFromActiveCoins(coinTicker, state.coins.activeCoinsForUser);

        if (requestedCoin) {
          return new ProcessedPaymentRequest(
            raw,
            requestedCoin,
            address,
            amount == null || amount.isLessThanOrEqualTo(0) ? null : amount,
            note,
            systemId
          );
        } else {
          throw new Error(
            `This invoice is requesting funds in ${coinTicker}. Activate ${coinTicker} and re-scan to continue.`
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
    const fullURL = /^\w{1,30}:\w{1,100}(\?[^ ]+)?$/;
    const partialURL = /^\w{1,30}:\w{1,100}/;
  
    const parseQueryString = (queryString) => {
      const params = {};
      if (!queryString) return params;
  
      queryString.split("&").forEach((pair) => {
        const [key, value] = pair.split("=");
        if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || "");
      });
  
      return params;
    };
  
    try {
      const [schemePart, pathPartRaw] = uri.split(":");
      if (!pathPartRaw) return null;
  
      const coinName = schemePart;
      const [pathPart, queryStringRaw] = pathPartRaw.split("?");
      const queryParams = parseQueryString(queryStringRaw);
  
      const amount = queryParams.amount;
  
      // Handle Ethereum ERC20 special case
      if (coinName.toLowerCase() === "ethereum" && pathPart.includes("/transfer")) {
        const [contractAddress] = pathPart.split("/");
  
        const destination = queryParams.address;
        if (!destination) throw new Error(PARSE_ERROR);
  
        for (const key in coinsList) {
          const coinObj = coinsList[key];
          if (
            coinObj.currency_id &&
            coinObj.currency_id.toLowerCase() === contractAddress.toLowerCase()
          ) {
            return {
              coinTicker: coinObj.id,
              address: destination,
              ...(amount ? { amount: BigNumber(amount) } : {}),
            };
          }
        }
  
        throw new Error(INCOMPATIBLE_COIN);
      }
  
      // Handle normal full URL: coinName:address?amount=x
      const fullMatch = uri.match(fullURL);
      if (fullMatch) {
        const address = pathPart;
  
        for (const key in coinsList) {
          const coinObj = coinsList[key];
          if (
            removeSpaces(coinObj.display_name).toLowerCase() === coinName.toLowerCase() ||
            coinObj.alt_names.some((name) => name === coinName.toLowerCase())
          ) {
            return {
              coinTicker: coinObj.id,
              address: address,
              ...(amount ? { amount: BigNumber(amount) } : {}),
            };
          }
        }
  
        throw new Error(INCOMPATIBLE_COIN);
      }
  
      // Handle partial URI: coinName:address
      const partialMatch = uri.match(partialURL);
      if (partialMatch) {
        const address = pathPart;
  
        for (const key in coinsList) {
          const coinObj = coinsList[key];
          if (
            removeSpaces(coinObj.display_name).toLowerCase() === coinName.toLowerCase() ||
            coinObj.alt_names.some((name) => name === coinName.toLowerCase())
          ) {
            return {
              coinTicker: coinObj.id,
              address: address,
            };
          }
        }
  
        throw new Error(INCOMPATIBLE_COIN);
      }
  
      return null;
    } catch (e) {
      if (e.message !== INCOMPATIBLE_COIN) {
        console.warn(e);
        throw new Error(PARSE_ERROR);
      } else throw e;
    }
  };
}

export default new QrScanner()