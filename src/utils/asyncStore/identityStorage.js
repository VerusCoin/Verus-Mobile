import AsyncStorage from '@react-native-community/async-storage';

import identities from '../InitialData/Identity';
import claims from '../InitialData/Claim';
import claimCategories from '../InitialData/ClaimCategory';
import attestations from '../InitialData/Attestation';

export const storeSeedIdentities = async () => {
  try {
    await AsyncStorage.setItem('identities', JSON.stringify({ identities }));
  } catch (err) {
    console.log(err);
  }
};

const getClaimCategories = async () => {
  try {
    const result = await AsyncStorage.getItem('claimCategories');
    return result ? JSON.parse(result).claimCategories : [];
  } catch (error) {
    console.log(error);
  }
};

export const storeSeedClaimCategories = async (identityId) => {
  const seededCategories = claimCategories(identityId);
  try {
    let categoriesToStore = [];
    const storedCategories = await getClaimCategories();
    if (!storedCategories) {
      categoriesToStore = seededCategories;
    } else if (storedCategories.every((category) => category.identity !== identityId)) {
      categoriesToStore = [...storedCategories, ...seededCategories];
    } else {
      categoriesToStore = storedCategories;
    }
    await AsyncStorage.setItem('claimCategories', JSON.stringify({ claimCategories: categoriesToStore }));
  } catch (err) {
    console.log(err);
  }
};

export const getAttestations = async () => {
  try {
    const result = await AsyncStorage.getItem('attestations');
    return result ? JSON.parse(result).attestations : [];
  } catch (error) {
    console.log(error);
  }
};

export const storeSeedAttestations = async () => {
  try {
    let attestationsToStore = [];
    const storedAttestations = await getAttestations();
    if (!storedAttestations.length) {
      attestationsToStore = attestations;
    } else {
      attestationsToStore = storedAttestations;
    }
    await AsyncStorage.setItem('attestations', JSON.stringify({ attestations: attestationsToStore }));
  } catch (error) {
    console.log(error);
  }
};

export const getClaimCategoriesByIdentity = async (identityId) => {
  try {
    const storedCategories = await getClaimCategories();
    const categoriesForIdentity = storedCategories.filter((category) => category.identity === identityId);
    return categoriesForIdentity;
  } catch (err) {
    console.log(err);
  }
};

export const updateClaimCategories = async (updatedCategories) => {
  try {
    const storedCategories = await getClaimCategories();
    const oldCategories = storedCategories.filter(
      (storedCategory) => !updatedCategories.claimCategories.some(
        (updatedCategory) => updatedCategory.id === storedCategory.id,
      ),
    );
    const categoriesToStore = oldCategories.concat(updatedCategories.claimCategories);
    await AsyncStorage.setItem('claimCategories', JSON.stringify({ claimCategories: categoriesToStore }));
  } catch (error) {
    console.log(error);
  }
};

export const getClaims = async () => {
  try {
    const result = await AsyncStorage.getItem('claims');
    return result ? JSON.parse(result).claims : [];
  } catch (error) {
    console.log(error);
  }
};

export const storeSeedClaims = async (identityId) => {
  const seededClaims = claims(identityId);
  try {
    let claimsToStore = [];
    const storedClaims = await getClaims();
    if (!storedClaims.length) {
      claimsToStore = seededClaims;
    } else if (storedClaims.every((claim) => !claim.categoryId.includes(identityId))) {
      claimsToStore = [...storedClaims, ...seededClaims];
    } else {
      claimsToStore = storedClaims;
    }
    await AsyncStorage.setItem('claims', JSON.stringify({ claims: claimsToStore }));
  } catch (error) {
    console.log(error);
  }

};

export const getIdentities = async () => {
  try {
    const result = await AsyncStorage.getItem('identities');
    console.log(JSON.parse(result))
    return result ? JSON.parse(result).identities : [];
  } catch (error) {
    console.log(error);
  }
};

export const updateAttestations = async (updatedAttestations) => {
  try {
    await AsyncStorage.setItem('attestations', JSON.stringify(updatedAttestations));
  } catch (error) {
    console.log(error);
  }
};

export const removeIdentityData = async () => {
  await AsyncStorage.multiRemove(['identities', 'claimCategories', 'claims', 'attestations'], (err) => {
    console.log(err);
  });
};

export const updateIdentities = async (updatedIdentities) => {
  try {
    await AsyncStorage.setItem('identities', JSON.stringify({ identities: updatedIdentities.identities }));
  } catch (error) {
    console.log(error);
  }
};

export const updateClaims = async (updatedClaims) => {
  try {
    const storedClaims = await getClaims();
    const oldClaims = storedClaims.filter((storedClaim) => !updatedClaims.claims.some((updatedClaim) => updatedClaim.id === storedClaim.id));
    const claimsToStore = oldClaims.concat(updatedClaims.claims);
    console.log(claimsToStore)
    await AsyncStorage.setItem('claims', JSON.stringify({ claims: claimsToStore }));
  } catch (error) {
    console.log(error);
  }
};

// toggleCheckedClaim = (claim, value) => {

// }