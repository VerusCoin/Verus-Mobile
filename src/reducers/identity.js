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
  SET_SHOW_EMPTY_CLAIM_CATEGORIES,
  SET_NEW_CATEGORY,
  SET_CLAIM_VISIBILITY,
  TOGGLE_SHOW_HIDDEN_CLAIMS,
  UPDATE_SELECTED_CLAIMS,
  UPDATE_CATEGORY_FOR_CLAIMS,
  CLEAR_SELECTED_CLAIMS,
  SET_ATTESTATION_MODAL_VISIBILITY,
  SET_SCANINFO_MODAL_VISIBILITY,
  SET_HIDE_SELECTED_CLAIMS,
  SET_MEMO_DATA_FROM_TX,
  DELETE_CATEGORY,
} from '../utils/constants/storeType';

const defaultState = fromJS({
  personalInformation: {
    attestationModalVisibility:false,
    scanInfoModalVisibility:false,
    identities: {
      byId: {},
      identityIds: [],
    },
    activeIdentityId: '',
    claimCategories: {
      byId: {},
      claimCategoriesIds: [],
    },
    showEmptyClaimCategories: true,
    showHiddenClaims: false,
    activeClaimCategoryId: '',
    selectedClaims: [],
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
        byId: action.payload.claims.entities.claims || {},
        claimIds: action.payload.claims.result,
      }));
    case SET_CLAIM_CATEGORIES:
      return state.setIn(['personalInformation', 'claimCategories'], fromJS({
        byId: action.payload.claimCategories.entities.claimCategories,
        claimCategoriesIds: action.payload.claimCategories.result,
      }));
    case SET_ATTESTATIONS:
      return state.setIn(['personalInformation', 'attestations'], fromJS({
        byId: action.payload.attestations.entities.attestations || {},
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
      return state.updateIn(
        [
          'personalInformation',
          'attestations',
          'byId',
          action.payload.attestationId,
          'showOnHomeScreen',
        ],
        (showOnHomeScreen) => !showOnHomeScreen,
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
    case SET_NEW_CATEGORY:
      return state.withMutations((nextState) => {
        nextState.setIn(['personalInformation', 'claimCategories', 'byId', action.payload.category.id], fromJS(action.payload.category));
        nextState.updateIn(['personalInformation', 'claimCategories', 'claimCategoriesIds'], IList(), (claimCategoriesIds) => claimCategoriesIds.concat(action.payload.category.id));
      });
    case DELETE_CATEGORY:
      return state.withMutations((nextState) => {
        nextState.deleteIn(['personalInformation', 'claimCategories', 'byId', action.payload.category.get('name')]);
        nextState.updateIn(['personalInformation', 'claimCategories', 'claimCategoriesIds'], IList(), (claimCategoriesIds) => claimCategoriesIds.filter((claimCategoryId) => claimCategoryId !== action.payload.category.get('id', '')));
      });
    case SET_SHOW_EMPTY_CLAIM_CATEGORIES:
      return state.updateIn(['personalInformation', 'showEmptyClaimCategories'], (showEmptyClaimCategories) => !showEmptyClaimCategories);
    case TOGGLE_SHOW_HIDDEN_CLAIMS:
      return state.updateIn(['personalInformation', 'showHiddenClaims'], (showHiddenClaims) => !showHiddenClaims);
    case SET_CLAIM_VISIBILITY:
      return state.updateIn(['personalInformation', 'claims', 'byId', action.payload.claim, 'hidden'], (claimVisibility) => !claimVisibility);
    case UPDATE_SELECTED_CLAIMS:
      return state.updateIn(['personalInformation', 'selectedClaims'], IList(), (selectedClaims) => {
        if (selectedClaims.includes(action.payload.claims)) {
          return selectedClaims.filter((selectedClaim) => selectedClaim.get('id', '') !== action.payload.claims.get('id', ''));
        }
        return selectedClaims.push(action.payload.claims);
      });
    case CLEAR_SELECTED_CLAIMS:
      return state.setIn(['personalInformation', 'selectedClaims'], IList());
    case UPDATE_CATEGORY_FOR_CLAIMS:
      return state.withMutations((nextState) => {
        action.payload.claims.map(
          (claim) => nextState.setIn(
            ['personalInformation', 'claims', 'byId', claim.get('uid'), 'categoryId'], action.payload.categoryId,
          ),
        );
      });

    case SET_ATTESTATION_MODAL_VISIBILITY:
      return state.setIn(['personalInformation', 'attestationModalVisibility'], action.payload.value);
    case SET_SCANINFO_MODAL_VISIBILITY:
      return state.setIn(['personalInformation', 'scanInfoModalVisibility'], action.payload.value);

    case SET_HIDE_SELECTED_CLAIMS:
      return state.withMutations((nextState) => {
        action.payload.claims.map(
          (claim) => nextState.setIn(
            ['personalInformation', 'claims', 'byId', claim.get('uid'), 'hidden'], true,
          ),
        );
      });
    case SET_MEMO_DATA_FROM_TX:
      return state.withMutations((nextState) => {
        action.payload.memoData.map(
          (memo) => {
            if (memo.identityAttested) {
              return nextState.setIn(['personalInformation', 'attestations', 'byId', memo.uid], fromJS(memo));
            }
            return nextState.setIn(['personalInformation', 'claims', 'byId', memo.uid], fromJS(memo));
          },
        );
        action.payload.memoData.map(
          (memo) => {
            if (memo.identityAttested) {
              return nextState.updateIn(['personalInformation', 'attestations', 'attestationIds'], IList(), (attestationIds) => attestationIds.push(fromJS(memo.uid)));
            }
            return nextState.updateIn(['personalInformation', 'claims', 'claimIds'], IList(), (claimIds) => claimIds.push(fromJS(memo.uid)));
          },
        );
      });
    default:
      return state;
  }
};

export default identity;
