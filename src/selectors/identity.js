import { Map as IMap, List as IList } from 'immutable';
import { createSelector } from 'reselect';

export const selectIdentities = (state) => state.identity.getIn(['personalInformation', 'identities', 'byId'], IMap());

export const selectIdentityObj = (state) => state.identity.getIn(['personalInformation', 'identities'], IMap());

export const selectActiveIdentityId = (state) => state.identity.getIn(['personalInformation', 'activeIdentityId'], '');

export const selectActiveIdentity = createSelector(
  [selectIdentities, selectActiveIdentityId],
  (identities, activeIdentityId) => identities.get(activeIdentityId, IMap()),
);

export const selectClaimCategories = (state) => state.identity.getIn(
  ['personalInformation', 'claimCategories', 'byId'],
  IMap(),
);

export const selectShowEmptyClaimCategories = (state) => state.identity.getIn(['personalInformation', 'showEmptyClaimCategories'], false);

export const selectClaimCategoriesToDisplay = createSelector(
  [selectClaimCategories, selectShowEmptyClaimCategories],
  (claimCategories, showEmptyClaimCategories) => {
    if (!showEmptyClaimCategories) {
      return claimCategories.filter((claimCategory) => claimCategory.get('claims', IList()).size > 0);
    }
    return claimCategories;
  },
);

const selectClaims = (state) => state.identity.getIn(['personalInformation', 'claims', 'byId'], IMap());

const selectActiveClaimCategoryId = (state) => state.identity.getIn(['personalInformation', 'activeClaimCategoryId'], '');

const selectActiveCategory = createSelector(
  [selectActiveClaimCategoryId, selectClaimCategories],
  (claimCategoryId, claimCategories) => claimCategories.filter((claimCategory) => claimCategory.get('id', '') === claimCategoryId),
);

export const selectClaimsByCategoryId = createSelector(
  [selectActiveClaimCategoryId, selectActiveCategory, selectClaims],
  (activeCategoryId, activeCategory, claims) => claims.filter((claim) => activeCategory.getIn([activeCategoryId, 'claims'], IList()).indexOf(claim.get('id', '')) > -1),
);

const selectAttestations = (state) => state.identity.getIn(['personalInformation', 'attestations', 'byId'], IMap());

const selectActiveClaim = (state) => state.identity.getIn(['personalInformation', 'activeClaim'], IMap());

export const selectParentClaimsById = createSelector(
  [selectClaims, selectActiveClaim],
  (claims, activeClaim) => claims.filter((claim) => activeClaim.get('parent_claims').includes(claim.get('id'))),
);

export const selectChildClaimsById = createSelector(
  [selectClaims, selectActiveClaim],
  (claims, activeClaim) => claims.filter((claim) => activeClaim.get('child_claims').includes(claim.get('id'))),
);
export const selectAttestationsObject = (state) => state.identity.getIn(['personalInformation', 'attestations'], IMap());

export const selectAttestationsByClaimId = createSelector(
  [selectAttestations, selectActiveClaim],
  (attestations, activeClaim) => attestations.filter((attestation) => attestation.get('claim_id', '') === activeClaim.get('id', '')),
);

export const selectPinnedAttestations = createSelector(
  selectAttestations,
  (attestations) => attestations.filter(
    (attestation) => attestation.get('showOnHomeScreen') === true,
  ),
);

export const selectActiveAttestationId = (state) => state.identity.getIn(['personalInformation', 'activeAttestationId'], '');

export const selectActiveAttestation = createSelector(
  [selectActiveAttestationId, selectAttestations],
  (attestationId, attestations) => attestations.get(attestationId),
);
