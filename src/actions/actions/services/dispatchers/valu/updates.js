import { requestSeeds } from "../../../../../utils/auth/authBox";
import { SUPPORTED_BANK_CURRENCIES } from "../../../../../utils/constants/currencies";
import { VALU_SERVICE } from "../../../../../utils/constants/intervalConstants";
import { VALU_SERVICE_ID } from "../../../../../utils/constants/services"
import ValuInterface from "../../../../../utils/services/ValuProvider";
import { extractWyreRates } from "../../../../../utils/standardization/extractWyreRates";
import store from "../../../../../store"
import { requestServiceStoredData } from "../../../../../utils/auth/authBox"
import { modifyServiceStoredDataForUser } from "../services"

export const storeLoginDetails = async (loginDetails) => {
  const state = store.getState()

  if (state.authentication.activeAccount == null) {
    throw new Error(
      "You must be signed in to store VALU OnRamp Login Data"
    );
  }

  let serviceData = await requestServiceStoredData(VALU_SERVICE_ID)

  if(!serviceData.loginDetails) serviceData.loginDetails = {};
  serviceData.loginDetails = loginDetails;
  serviceData.KYCState = 1;

  return await modifyServiceStoredDataForUser(
    {
      ...serviceData
    },
    VALU_SERVICE_ID,
    state.authentication.activeAccount.accountHash
  );
}

export const updateKYCStage = async (KYCStage) => {
  const state = store.getState()

  if (state.authentication.activeAccount == null) {
    throw new Error(
      "You must be signed in to store VALU OnRamp Login Data"
    );
  }

  let serviceData = await requestServiceStoredData(VALU_SERVICE_ID)

  serviceData.KYCState = KYCStage;

  return await modifyServiceStoredDataForUser(
    {
      ...serviceData
    },
    VALU_SERVICE_ID,
    state.authentication.activeAccount.accountHash
  );
}

export const storeIdChoice = async (idChoice) => {
  const state = store.getState()

  if (state.authentication.activeAccount == null) {
    throw new Error(
      "You must be signed in to store VALU OnRamp Login Data"
    );
  }

  let serviceData = await requestServiceStoredData(VALU_SERVICE_ID)

  serviceData.idRequested = idChoice.idRequested;

  if(idChoice.idName)
    serviceData.idName = idChoice.idName;

  return await modifyServiceStoredDataForUser(
    {
      ...serviceData
    },
    VALU_SERVICE_ID,
    state.authentication.activeAccount.accountHash
  );
}

export const updateValuAccount = async channelStore => {
  try {
    let accountId = channelStore.accountId;

    if (!channelStore.authenticated) {
      const seed = (await requestSeeds())[VALU_SERVICE];
      if (seed == null) throw new Error('No Wyre seed present');
      accountId = (await ValuInterface.authenticate(seed)).authenticatedAs;
      console.log(1)
    }

    if (accountId == null) return {channel: VALU_SERVICE, body: null};
    else {
      return {
        channel: VALU_SERVICE,
        body: await ValuInterface.getAccount(accountId),
      };
    }
  } catch (e) {
    console.log(1)
    throw e;
  }
};

export const updateValuPaymentMethods = async channelStore => {
  try {
    if (!channelStore.authenticated) {
      const seed = (await requestSeeds())[VALU_SERVICE];
      if (seed == null) throw new Error('No Wyre seed present');
      await ValuInterface.authenticate(seed);
      console.log(2)
    }

    const res = await ValuInterface.listPaymentMethods();
    let mapping = {};
    let list = [];

    res.data.map(paymentMethod => {
      mapping[paymentMethod.id] = paymentMethod;
      list.push(paymentMethod.id);
    });

    return {
      channel: VALU_SERVICE,
      body: {
        list,
        mapping: mapping,
      },
    };
  } catch (e) {
    console.log(2)
    throw e;
  }
};

export const updateValuRates = async () => {
  try {
    const res = await ValuInterface.getRates('PRICED');

    return {
      channel: VALU_SERVICE,
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

export const updateValuTransfers = async channelStore => {
  try {
    if (!channelStore.authenticated) {
      const seed = (await requestSeeds())[VALU_SERVICE];
      if (seed == null) throw new Error('No Wyre seed present');
      await ValuInterface.authenticate(seed);
      console.log(3)
    }

    const res = await ValuInterface.getTransferHistory();

    return {
      channel: VALU_SERVICE,
      body: res.data,
    };
  } catch (e) {
    console.log(3)
    throw e;
  }
};

export const resetAccount = async () => {
  const state = store.getState()

  if (state.authentication.activeAccount == null) {
    throw new Error(
      "You must be signed in to store VALU OnRamp Login Data"
    );
  }

  await ValuInterface.reset();
  return await modifyServiceStoredDataForUser(
    {},
    VALU_SERVICE_ID,
    state.authentication.activeAccount.accountHash
  );
}

export const storePlaidTokens = async (accessToken, processToken, accountID, publicToken ) => {
  const state = store.getState()

  if (state.authentication.activeAccount == null) {
    throw new Error(
      "You must be signed in to store VALU OnRamp Login Data"
    );
  }

  let serviceData = await requestServiceStoredData(VALU_SERVICE_ID)

  if(!serviceData.accessToken) serviceData.accessToken = {};
  serviceData.accessToken = accessToken;

  if(!serviceData.processToken) serviceData.processToken = {};
  serviceData.processToken = processToken;
  
  if(!serviceData.accountID) serviceData.accountID = {};
  serviceData.accountID = accountID;
  
  if(!serviceData.publicToken) serviceData.publicToken = {};
  serviceData.publicToken = publicToken;

  return await modifyServiceStoredDataForUser(
    {
      ...serviceData
    },
    VALU_SERVICE_ID,
    state.authentication.activeAccount.accountHash
  );
}