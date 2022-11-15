import {
  ERROR_LINKED_IDENTITIES,
  SET_LINKED_IDENTITIES,
} from '../../../../utils/constants/storeType';
import {VERUSID} from '../../../../utils/constants/intervalConstants';
import {updateLedgerValue} from './UpdateLedgerValue';
import {updateLinkedVerusIds} from './verusid/updates';

const fetchChannels = () => {
  return {
    [VERUSID]: coinObj => updateLinkedVerusIds(coinObj),
  };
};

export const updateLinkedIdentities = (
  state,
  dispatch,
  channels,
  chainTicker,
) => {  
  return updateLedgerValue(
    state,
    dispatch,
    channels,
    chainTicker,
    SET_LINKED_IDENTITIES,
    ERROR_LINKED_IDENTITIES,
    fetchChannels,
  );
};