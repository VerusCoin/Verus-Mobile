import { requestSeeds } from "../../../../../utils/auth/authBox";
import { SUPPORTED_BANK_CURRENCIES } from "../../../../../utils/constants/currencies";
import { WYRE_SERVICE } from "../../../../../utils/constants/intervalConstants";
import WyreProvider from "../../../../../utils/services/WyreProvider";
import { extractWyreRates } from "../../../../../utils/standardization/extractWyreRates";

export const updateWyreAccount = async channelStore => {
  try {
    let accountId = channelStore.accountId;

    if (!channelStore.authenticated) {
      const seed = (await requestSeeds())[WYRE_SERVICE];
      if (seed == null) throw new Error('No Wyre seed present');
      accountId = (await WyreProvider.authenticate(seed)).authenticatedAs;
    }

    if (accountId == null) return {channel: WYRE_SERVICE, body: null};
    else {
      return {
        channel: WYRE_SERVICE,
        body: await WyreProvider.getAccount({accountId}),
      };
    }
  } catch (e) {
    throw e;
  }
};

export const updateWyrePaymentMethods = async channelStore => {
  try {
    if (!channelStore.authenticated) {
      const seed = (await requestSeeds())[WYRE_SERVICE];
      if (seed == null) throw new Error('No Wyre seed present');
      await WyreProvider.authenticate(seed);
    }

    const res = await WyreProvider.listPaymentMethods();
    let mapping = {};
    let list = [];

    res.data.map(paymentMethod => {
      mapping[paymentMethod.id] = paymentMethod;
      list.push(paymentMethod.id);
    });

    return {
      channel: WYRE_SERVICE,
      body: {
        list,
        mapping: mapping,
      },
    };
  } catch (e) {
    throw e;
  }
};

export const updateWyreRates = async () => {
  try {
    const res = await WyreProvider.getRates('PRICED');

    return {
      channel: WYRE_SERVICE,
      body: extractWyreRates(res, [
        'USDT',
        'USDC',
        'DAI',
        ...SUPPORTED_BANK_CURRENCIES,
      ]),
    };
  } catch (e) {
    throw e;
  }
};

export const updateWyreTransfers = async channelStore => {
  try {
    if (!channelStore.authenticated) {
      const seed = (await requestSeeds())[WYRE_SERVICE];
      if (seed == null) throw new Error('No Wyre seed present');
      await WyreProvider.authenticate(seed);
    }

    const res = await WyreProvider.getTransferHistory();

    return {
      channel: WYRE_SERVICE,
      body: res.data,
    };
  } catch (e) {
    throw e;
  }
};