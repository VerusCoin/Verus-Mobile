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

export const selectClaimCategoriesObj = (state) => state.identity.getIn(['personalInformation', 'claimCategories'], IMap());

export const selectShowEmptyClaimCategories = (state) => state.identity.getIn(['personalInformation', 'showEmptyClaimCategories'], false);

export const selectClaims = (state) => state.identity.getIn(['personalInformation', 'claims', 'byId'], IMap());

export const selectClaimCategoriesToDisplay = createSelector(
  [selectClaimCategories, selectShowEmptyClaimCategories, selectClaims],
  (claimCategories, showEmptyClaimCategories, claims) => {
    if (!showEmptyClaimCategories) {
      return claimCategories.filter((claimCategory) => claims.some((claim) => claim.get('categoryId', '') === claimCategory.get('id', '')));
    }
    return claimCategories;
  },
);

export const selectClaimsObj = (state) => state.identity.getIn(['personalInformation', 'claims'], IMap());

const selectActiveClaimCategoryId = (state) => state.identity.getIn(['personalInformation', 'activeClaimCategoryId'], '');

export const selectShowHiddenClaims = (state) => state.identity.getIn(['personalInformation', 'showHiddenClaims'], false);

export const selectSelectedClaims = (state) => state.identity.getIn(['personalInformation', 'selectedClaims'], IList());

const selectActiveCategory = createSelector(
  [selectActiveClaimCategoryId, selectClaimCategories],
  (claimCategoryId, claimCategories) => claimCategories.filter((claimCategory) => claimCategory.get('id', '') === claimCategoryId),
);

export const selectClaimsByCategoryId = createSelector(
  [selectActiveClaimCategoryId, selectClaims],
  (activeCategoryId, claims) => claims.filter((claim) => claim.get('categoryId', '') === activeCategoryId)
);

export const selectClaimsToDisplay = createSelector(
  [selectClaimsByCategoryId, selectShowHiddenClaims],
  (selectedClaims, showHiddenClaims) => {
    if (!showHiddenClaims) {
      return selectedClaims.filter((claim) => claim.get('hidden', '') === false);
    }
    return selectedClaims;
  },
);

const selectAttestations = (state) => state.identity.getIn(['personalInformation', 'attestations', 'byId'], IMap());

const selectActiveClaim = (state) => state.identity.getIn(['personalInformation', 'activeClaim'], IMap());

export const selectParentClaimsById = createSelector(
  [selectClaims, selectActiveClaim],
  (claims, activeClaim) => claims.filter((claim) => activeClaim.get('parentClaims').includes(claim.get('id'))),
);

export const selectChildClaimsById = createSelector(
  [selectClaims, selectActiveClaim],
  (claims, activeClaim) => claims.filter((claim) => activeClaim.get('childClaims').includes(claim.get('id'))),
);
export const selectAttestationsObject = (state) => state.identity.getIn(['personalInformation', 'attestations'], IMap());

export const selectAttestationsByClaimId = createSelector(
  [selectAttestations, selectActiveClaim],
  (attestations, activeClaim) => attestations.filter((attestation) => attestation.get('claimId', '') === activeClaim.get('id', '')),
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
