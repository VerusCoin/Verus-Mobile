import { fromJS } from "immutable";
import {
  SET_ACTIVE_IDENTITY,
  SET_CLAIMS,
  SET_CLAIM_CATEGORIES,
  SET_ATTESTATIONS,
  SET_ACTIVE_CLAIM_CATEGORY_ID,
  TOGGLE_ATTESTATION_PIN,
  SET_ACTIVE_CLAIM,
  SET_ACTIVE_ATTESTATION_ID,
  SET_IDENTITIES,
} from "../utils/constants/storeType";

const defaultState = fromJS({
  personalInformation: {},
});

export const identity = (state = defaultState, action) => {
  switch (action.type) {
    case SET_IDENTITIES:
      return state.setIn(["personalInformation", "identities"], {
        byId: fromJS(action.payload.identities.entities.identities),
        claimCategoriesIds: fromJS(action.payload.identities.result),
      });
    case SET_ACTIVE_IDENTITY:
      return state.setIn(
        ["personalInformation", "activeIdentity"],
        fromJS(action.payload.identity)
      );
    case SET_CLAIMS:
      return state.setIn(["personalInformation", "claims"], {
        byId: fromJS(action.payload.claims.entities.claims),
        claimIds: fromJS(action.payload.claims.result),
      });
    case SET_CLAIM_CATEGORIES:
      return state.setIn(["personalInformation", "claimCategories"], {
        byId: fromJS(action.payload.claimCategories.entities.claimCategories),
        claimCategoriesIds: fromJS(action.payload.claimCategories.result),
      });
    case SET_ATTESTATIONS:
      return state.mergeIn(["personalInformation", "attestations"], {
        byId: fromJS(action.payload.attestations.entities.attestations),
        attestationIds: fromJS(action.payload.attestations.result),
      });
    case SET_ACTIVE_CLAIM_CATEGORY_ID:
      return state.setIn(
        ["personalInformation", "activeClaimCategoryId"],
        fromJS(action.payload.activeClaimCategoryId)
      );
      case SET_ACTIVE_CLAIM:
        return state.setIn(
          ["personalInformation", "activeClaim"],
          fromJS(action.payload.activeClaim)
        );
      case SET_ACTIVE_ATTESTATION_ID:
        return state.setIn(['personalInformation', "activeAttestationId"], fromJS(action.payload.activeAttestationId));
      case TOGGLE_ATTESTATION_PIN:
        console.log(action.payload.attestationId, action.payload.value)
        return state.setIn(
          [
            "personalInformation",
            "attestations",
            "byId",
            action.payload.attestationId,
            "showOnHomeScreen"
          ],
          fromJS(action.payload.value)
        );
    default:
      return state;
  }
};
