import { Map as IMap, List as IList } from "immutable";
import { createSelector } from "reselect";

export const selectIdentities = (state) => state.identity.getIn(["personalInformation", "identities", "byId"], IMap());

export const selectActiveIdentity = (state) =>
  state.identity.getIn(["personalInformation", "activeIdentity"], IMap());

export const selectActiveIdentityId = (state) =>
  state.identity.getIn(["personalInformation", "activeIdentity", "name"], "");

export const selectClaimCategories = (state) =>
  state.identity.getIn(
    ["personalInformation", "claimCategories", "byId"],
    IMap()
  );

const selectClaims = (state) =>
  state.identity.getIn(["personalInformation", "claims", "byId"], IMap());

const selectActiveClaimCategoryId = (state) => state.identity.getIn(['personalInformation', 'activeClaimCategoryId'], '');

const selectActiveCategory = createSelector(
  [selectActiveClaimCategoryId, selectClaimCategories],
  (claimCategoryId, claimCategories) => claimCategories.filter((claimCategory) => claimCategory.get('id', '') === claimCategoryId)
);

export const selectClaimsByCategoryId = createSelector(
  [selectActiveClaimCategoryId, selectActiveCategory, selectClaims],
  (activeCategoryId, activeCategory, claims) => claims.filter((claim) =>
    activeCategory.getIn([activeCategoryId, 'claims'], IList()).indexOf(claim.get('id', '')) > -1)
);

const selectAttestations = (state) =>
  state.identity.getIn(["personalInformation", "attestations", "byId"], IMap());

const selectActiveClaim = (state) => state.identity.getIn(["personalInformation", "activeClaim"], IMap());

export const selectAttestationsObject = (state) => state.identity.getIn(["personalInformation", "attestations"], IMap());

export const selectAttestationsByClaimId = createSelector(
  [selectAttestations, selectActiveClaim],
  (attestations, activeClaim) => attestations.filter((attestation) => attestation.get("claim_id", "") === activeClaim.get('id', ''))
);

export const selectPinnedAttestations = createSelector(
  selectAttestations,
  (attestations) =>
    attestations.filter(
      (attestation) => attestation.get("showOnHomeScreen") === true
    )
);

export const selectActiveAttestationId = (state) => state.identity.getIn(["personalInformation", "activeAttestationId"], '');

export const selectActiveAttestation = createSelector(
  [selectActiveAttestationId, selectAttestations],
  (attestationId, attestations) => attestations.filter((attestation) => attestation.get('id', '') === attestationId)
)