import { fromJS, List as IList } from 'immutable';
import {
  SET_ACTIVE_IDENTITY,
  SET_CLAIMS,
  SET_CLAIM_CATEGORIES,
  SET_ATTESTATIONS,
  SET_ACTIVE_CLAIM_CATEGORY_ID,
  SET_ATTESTATION_PINNED,
  SET_ACTIVE_CLAIM,
  SET_ACTIVE_ATTESTATION_ID,
  SET_IDENTITIES,
  ADD_NEW_IDENTITY,
  DESELECT_ACTIVE_IDENTITY,
  SET_NEW_ACTIVE_IDENTITY,
} from '../utils/constants/storeType';

const defaultState = fromJS({
  personalInformation: {
    identities: {
      byId: {},
      identityIds: [],
    },
    activeIdentityId: '',
    claimCategories: {
      byId: {},
      claimCategoriesIds: [],
    },
    activeClaimCategoryId: '',
    claims: {
      byId: {},
      claimIds: [],
    },
    activeClaimId: '',
    attestations: {
      byId: {},
      attestationIds: [],
    },
  },
});

const identity = (state = defaultState, action) => {
  switch (action.type) {
    case SET_IDENTITIES:
      return state.setIn(['personalInformation', 'identities'], fromJS({
        byId: action.payload.identities.entities.identities,
        identityIds: action.payload.identities.result,
      }));
    case SET_ACTIVE_IDENTITY:
      return state.setIn(['personalInformation', 'activeIdentityId'], fromJS(action.payload.identityId));
    case SET_CLAIMS:
      return state.setIn(['personalInformation', 'claims'], fromJS({
        byId: action.payload.claims.entities.claims,
        claimIds: action.payload.claims.result,
      }));
    case SET_CLAIM_CATEGORIES:
      return state.setIn(['personalInformation', 'claimCategories'], fromJS({
        byId: action.payload.claimCategories.entities.claimCategories,
        claimCategoriesIds: action.payload.claimCategories.result,
      }));
    case SET_ATTESTATIONS:
      return state.setIn(['personalInformation', 'attestations'], fromJS({
        byId: action.payload.attestations.entities.attestations,
        attestationIds: action.payload.attestations.result,
      }));
    case SET_ACTIVE_CLAIM_CATEGORY_ID:
      return state.setIn(
        ['personalInformation', 'activeClaimCategoryId'],
        fromJS(action.payload.activeClaimCategoryId),
      );
    case SET_ACTIVE_CLAIM:
      return state.setIn(['personalInformation', 'activeClaim'], fromJS(action.payload.activeClaim));
    case SET_ACTIVE_ATTESTATION_ID:
      return state.setIn(['personalInformation', 'activeAttestationId'], fromJS(action.payload.activeAttestationId));
    case SET_ATTESTATION_PINNED:
      return state.setIn(
        [
          'personalInformation',
          'attestations',
          'byId',
          action.payload.attestationId,
          'showOnHomeScreen',
        ],
        fromJS(action.payload.value),
      );
    case ADD_NEW_IDENTITY:
      return state.withMutations((nextState) => {
        nextState.setIn(['personalInformation', 'identities', 'byId', action.payload.identity.name], fromJS(action.payload.identity));
        nextState.updateIn(['personalInformation', 'identities', 'identityIds'], IList(), (identityIds) => identityIds.concat(action.payload.identity.name));
      });
    case DESELECT_ACTIVE_IDENTITY:
      if (action.payload.activeIdentityId) {
        return state.setIn(['personalInformation', 'identities', 'byId', action.payload.activeIdentityId, 'active'], false);
      }
      return state;
    case SET_NEW_ACTIVE_IDENTITY:
      return state.withMutations((nextState) => {
        nextState.setIn(['personalInformation', 'identities', 'byId', action.payload.newActiveIdentityId, 'active'], true);
        nextState.setIn(['personalInformation', 'activeIdentityId'], action.payload.newActiveIdentityId);
      });
    default:
      return state;
  }
};

export default identity;
