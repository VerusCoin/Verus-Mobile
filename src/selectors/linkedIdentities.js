import {createSelector} from 'reselect';
import {API_GET_LINKED_IDENTITIES, VERUSID} from '../utils/constants/intervalConstants';

const selectLinkedIdentitiesReducerState = state =>
  state.ledger.linkedIdentities;

const selectActiveCoin = state => state.coins.activeCoin;

const selectErrors = state => state.errors;

export const selectLinkedIdentities = createSelector(
  [selectLinkedIdentitiesReducerState, selectActiveCoin, selectErrors],
  (ids, activeCoin, errors) => {
    const activeCoinId = activeCoin.id;

    return {
      results: ids[VERUSID][activeCoinId],
      errors: errors[API_GET_LINKED_IDENTITIES][VERUSID][activeCoinId],
    };
  },
);

export default selectLinkedIdentities;
