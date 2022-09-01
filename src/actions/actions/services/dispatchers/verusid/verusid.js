import store from '../../../../../store';
import {requestServiceStoredData} from '../../../../../utils/auth/authBox';
import {VERUSID_SERVICE_ID} from '../../../../../utils/constants/services';
import {modifyServiceStoredDataForUser} from '../services';

export const linkVerusId = async (iAddress, friendlyName, chain) => {
  const state = store.getState();

  if (state.authentication.activeAccount == null) {
    throw new Error('You must be signed in to link VerusIDs');
  }

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  const currentLinkedIdentities =
    serviceData.linked_ids == null ? {} : serviceData.linked_ids;

  return await modifyServiceStoredDataForUser(
    {
      ...serviceData,
      linked_ids: {
        ...currentLinkedIdentities,
        [chain]: currentLinkedIdentities[chain]
          ? {
              ...currentLinkedIdentities[chain],
              [iAddress]: friendlyName,
            }
          : {[iAddress]: friendlyName},
      },
    },
    VERUSID_SERVICE_ID,
    state.authentication.activeAccount.accountHash,
  );
};

export const unlinkVerusId = async (iAddress, chain) => {
  const state = store.getState();

  if (state.authentication.activeAccount == null) {
    throw new Error('You must be signed in to unlink VerusIDs');
  }

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  let currentLinkedIdentities =
    serviceData.linked_ids == null ? {} : serviceData.linked_ids;

  if (currentLinkedIdentities[chain]) {
    delete currentLinkedIdentities[chain][iAddress];
  }
  
  return await modifyServiceStoredDataForUser(
    {
      ...serviceData,
      linked_ids: currentLinkedIdentities,
    },
    VERUSID_SERVICE_ID,
    state.authentication.activeAccount.accountHash,
  );
};
