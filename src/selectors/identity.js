import { Map as IMap, List as IList } from 'immutable';
import { createSelector } from 'reselect';

export const selectIdentities = (state) => state.identity.getIn(['personalInformation', 'identities', 'byId'], IMap());

export const selectIdentityReducerState = (state) => state.identity.getIn(['personalInformation', 'identities'], IMap());

export const selectActiveIdentityId = (state) => state.identity.getIn(['personalInformation', 'activeIdentityId'], '');

export const selectActiveIdentity = createSelector(
  [selectIdentities, selectActiveIdentityId],
  (identities, activeIdentityId) => identities.get(activeIdentityId, IMap()),
);

export const selectClaimCategories = (state) => state.identity.getIn(
  ['personalInformation', 'claimCategories', 'byId'],
  IMap(),
);

export const selectClaimCategoriesReducerState = (state) => state.identity.getIn(['personalInformation', 'claimCategories'], IMap());

export const selectShowEmptyClaimCategories = (state) => state.identity.getIn(['personalInformation', 'showEmptyClaimCategories'], false);

export const selectClaims = (state) => state.identity.getIn(['personalInformation', 'claims', 'byId'], IMap());

export const selectClaimsByIdentityId = createSelector(
  [selectActiveIdentityId, selectClaims],
  (activeIdentityId, claims) => claims.filter((claim) => claim.get('identity', '').includes(activeIdentityId)),
);

export const selectClaimCategoriesToDisplay = createSelector(
  [selectClaimCategories, selectShowEmptyClaimCategories, selectClaimsByIdentityId],
  (claimCategories, showEmptyClaimCategories, claims) => {
    if (!showEmptyClaimCategories) {
      return claimCategories.filter((claimCategory) => claims.some((claim) => claim.get('categoryId', '') === claimCategory.get('name', '')));
    }
    return claimCategories;
  },
);

export const selectClaimsReducerState = (state) => state.identity.getIn(['personalInformation', 'claims'], IMap());

const selectActiveClaimCategoryId = (state) => state.identity.getIn(['personalInformation', 'activeClaimCategoryId'], '');

export const selectShowHiddenClaims = (state) => state.identity.getIn(['personalInformation', 'showHiddenClaims'], false);

export const selectSelectedClaims = (state) => state.identity.getIn(['personalInformation', 'selectedClaims'], IList());

export const selectClaimsByCategoryId = createSelector(
  [selectActiveClaimCategoryId, selectClaimsByIdentityId],
  (activeCategoryId, claims) => claims.filter((claim) => claim.get('categoryId', '') === activeCategoryId),
);

export const selectClaimsToDisplay = createSelector(
  [selectClaimsByCategoryId, selectShowHiddenClaims],
  (selectedClaims, showHiddenClaims) => {
    if (showHiddenClaims) {
      return selectedClaims;
    }
    return selectedClaims.filter((claim) => !claim.get('hidden', ''));
  },
);

export const selectClaimCategory = createSelector(
  [selectActiveClaimCategoryId, selectClaimCategories],
  (activeCategoryId, claimCategories) => claimCategories.get(activeCategoryId, IMap()),
);

const selectAttestations = (state) => state.identity.getIn(['personalInformation', 'attestations', 'byId'], IMap());

const selectAttestationsByIdentityId = createSelector(
  [selectActiveIdentityId, selectAttestations],
  (activeIdentityId, attestations) => attestations.filter((attestation) => attestation.get('identity', '').includes(activeIdentityId)),
);

export const selectActiveClaim = (state) => state.identity.getIn(['personalInformation', 'activeClaim'], IMap());

export const selectParentClaimsById = createSelector(
  [selectClaims, selectActiveClaim],
  (claims, activeClaim) => claims.filter((claim) => activeClaim.get('parentClaims', IList()).includes(claim.get('id'))),
);

export const selectChildClaimsById = createSelector(
  [selectClaims, selectActiveClaim],
  (claims, activeClaim) => claims.filter((claim) => activeClaim.get('childClaims', IList()).includes(claim.get('id'))),
);
export const selectAttestationsReducerState = (state) => state.identity.getIn(['personalInformation', 'attestations'], IMap());

export const selectAttestationsByClaimId = createSelector(
  [selectAttestationsByIdentityId, selectActiveClaim],
  (attestations, activeClaim) => attestations.filter((attestation) => attestation.get('id', '') === activeClaim.get('id', '')),
);

export const selectPinnedAttestations = createSelector(
  selectAttestationsByIdentityId,
  (attestations) => attestations.filter(
    (attestation) => attestation.get('showOnHomeScreen') === true,
  ),
);

export const selectActiveAttestationId = (state) => state.identity.getIn(['personalInformation', 'activeAttestationId'], '');

export const selectActiveAttestation = createSelector(
  [selectActiveAttestationId, selectAttestationsByIdentityId],
  (attestationId, attestations) => attestations.get(attestationId),
);

export const selectAttestationModalVisibility = (state) => state.identity.getIn(['personalInformation', 'attestationModalVisibility'], '');
export const selectScanInfoModalVisibility = (state) => state.identity.getIn(['personalInformation', 'scanInfoModalVisibility'], '');

export const selectClaimsCountByCategory = createSelector(
  [selectClaimCategories, selectClaimsByIdentityId],
  (categories, claims) => categories.keySeq().map((item) => {
    const count = claims.filter((claim) => categories.getIn([item, 'name'], '') === claim.get('categoryId', '')).size;
    return { count, categoryId:categories.getIn([item, 'name'], '') };
  }),
);

export const selectAttestationsCountByClaim = createSelector(
  [selectClaims, selectAttestations],
  (claims, attestations) => claims.keySeq().map((item) => {
    const count = attestations.filter((attestation) => claims.getIn([item, 'id'], '') === attestation.get('claimId', '')).size;
    return { count, claimId: claims.getIn([item, 'id'], '') };
  }),
);

export const selectHiddenClaimsCount = createSelector(
  [selectActiveClaimCategoryId, selectClaimsByIdentityId],
  (categoryId, claims) => claims.filter((item) => item.get('hidden') && item.get('categoryId') === categoryId).size,
);

export const selectEmptyCategoryCount = createSelector(
  [selectClaimCategories, selectClaimsByIdentityId],
  (claimCategories, claims) => claimCategories.size - claimCategories.filter((claimCategory) => claims.some((claim) => claim.get('categoryId', '') === claimCategory.get('name', ''))).size,
);


export const selectClaimForActiveAttestion = createSelector(
  [selectClaims, selectActiveAttestation],
  (claims, attestation) => {
    if (attestation) {
      const claimId = attestation.get('id');

      return claims.filter((item) => item.get('id') === claimId && item.get('hash') === attestation.get('contentRootKey'))
        .keySeq().map((item) => claims.getIn([item, 'data'], '')).first();
    }
    return IList();
  },
);

export const selectChildDataClaimForActiveAttestion = createSelector(
  [selectActiveAttestation],
  (attestation) => {
    if (attestation) {
      return {
        claimData: attestation.get('data', ''),
        claimName: attestation.get('claimId', '')
      };
    }
    return IList();
  },
);
