import BigNumber from 'bignumber.js';
import {primitives} from 'verusid-ts-client';
import {fromBase58Check} from 'verus-typescript-primitives';
import {coinsList} from '../../utils/CoinData/CoinsList';
import {I_ADDRESS_VERSION, R_ADDRESS_VERSION} from '../../utils/constants/constants';
import {coinsToSats, isNumber} from '../../utils/math';
import VerusPayParser from '../../utils/verusPay';

export const DEFAULT_SLIPPAGE_PERCENT = '0.5';

export const sanitizeNumericInput = value =>
  value == null ? '' : String(value).replace(/,/g, '.');

export const validateAmountInput = value => {
  if (!value) return 'Enter an amount.';
  if (!isNumber(value)) return 'Please enter a valid number.';
  if (Number(value) <= 0) return 'Enter an amount greater than 0.';
  return null;
};

export const validateSlippageInput = value => {
  if (!value) return 'Enter a maximum slippage.';
  if (!isNumber(value)) return 'Please enter a valid percentage.';
  if (Number(value) <= 0 || Number(value) > 100) {
    return 'Slippage must be greater than 0 and not exceed 100%.';
  }
  return null;
};

export const generateReceiveInvoice = async ({
  address,
  allowConversion,
  amountFiat,
  amountValue,
  coinObj,
  displayCurrency,
  maxSlippageValue,
  memo,
  priceMap,
  subWallet,
}) => {
  if (!coinObj || !subWallet || !address) {
    throw new Error('Missing Asset, Card, or address.');
  }

  let cryptoAmount = sanitizeNumericInput(amountValue);
  if (amountFiat) {
    const price = priceMap?.[displayCurrency];
    if (!price || Number(price) <= 0) {
      throw new Error(
        `Unable to convert ${displayCurrency} to ${coinObj.display_ticker}.`,
      );
    }
    cryptoAmount = BigNumber(cryptoAmount).dividedBy(price).toString();
  }

  const conversionEligible =
    coinObj.proto === 'vrsc' && subWallet.id !== 'PRIVATE_WALLET';

  if (!conversionEligible) {
    return {
      qrString: VerusPayParser.v0.writeVerusPayQR(
        coinObj,
        cryptoAmount,
        address,
        memo || undefined,
      ),
      showVerusIcon: false,
      cryptoAmount,
    };
  }

  const {hash, version} = fromBase58Check(address);
  const destinationType =
    version === I_ADDRESS_VERSION
      ? primitives.DEST_ID
      : version === R_ADDRESS_VERSION
        ? primitives.DEST_PKH
        : null;

  if (destinationType == null) {
    throw new Error('Unsupported address format for this payment request.');
  }

  const amountSats = new primitives.BigNumber(
    coinsToSats(BigNumber(cryptoAmount)).toString(),
    10,
  );
  const acceptsConversion = allowConversion === true;
  const verusSystem = coinObj.testnet
    ? coinsList.VRSCTEST.currency_id
    : coinsList.VRSC.currency_id;
  const acceptedSystems =
    subWallet.network && subWallet.network !== verusSystem
      ? [subWallet.network]
      : [];
  const slippage = maxSlippageValue || DEFAULT_SLIPPAGE_PERCENT;

  const details = new primitives.VerusPayInvoiceDetails({
    amount: amountSats,
    destination: new primitives.TransferDestination({
      type: destinationType,
      destinationBytes: hash,
    }),
    requestedcurrencyid: coinObj.currency_id,
    acceptedsystems: acceptedSystems,
    maxestimatedslippage: acceptsConversion
      ? new primitives.BigNumber(
          coinsToSats(BigNumber(slippage).dividedBy(100)).toString(),
          10,
        )
      : undefined,
  });

  details.setFlags({
    acceptsConversion,
    isTestnet: !!coinObj.testnet,
    acceptsNonVerusSystems: acceptedSystems.length > 0,
    acceptsAnyAmount: false,
  });

  // An unsigned GenericRequest with one invoice detail, not the deprecated
  // VerusPay v3 invoice link.
  const request = new primitives.GenericRequest({
    details: [new primitives.VerusPayInvoiceDetailsOrdinalVDXFObject({data: details})],
    flags: coinObj.testnet
      ? primitives.GenericRequest.FLAG_IS_TESTNET
      : primitives.GenericRequest.BASE_FLAGS,
  });

  return {
    qrString: request.toWalletDeeplinkUri(),
    showVerusIcon: true,
    cryptoAmount,
  };
};
