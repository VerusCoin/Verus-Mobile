import AsyncStorage from '@react-native-community/async-storage';

import identities from '../InitialData/Identity';

export const storeSeedIdentities = async () => {
  try {
    await AsyncStorage.setItem('identities', JSON.stringify({ identities }));
  } catch (error) {
    console.log(error);
  }
};

export const getClaimCategories = async () => {
  try {
    const result = await AsyncStorage.getItem('claimCategories');
    return result ? JSON.parse(result).claimCategories : [];
  } catch (error) {
    console.log(error);
  }
};

export const storeSeedClaimCategories = async (claimCategories) => {
  try {
    await AsyncStorage.setItem('claimCategories', JSON.stringify({ claimCategories }));
  } catch (error) {
    console.log(error);
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

export const storeSeedAttestations = async (attestations) => {
  try {
    await AsyncStorage.setItem('attestations', JSON.stringify({ attestations }));
  } catch (error) {
    console.log(error);
  }
};

export const getClaimCategoriesByIdentity = async (identityId) => {
  try {
    const storedCategories = await getClaimCategories();
    const categoriesForIdentity = storedCategories.filter((category) => category.identity === identityId);
    return categoriesForIdentity;
  } catch (error) {
    console.log(error);
  }
};

export const getAttestationsByIdentity = async (identityId) => {
  try {
    const storedAttestations = await getAttestations();
    const attestationsForIdentity = storedAttestations.filter((attestation) => attestation.id.includes(identityId));
    return attestationsForIdentity;
  } catch (error) {
    console.log(error);
  }
};

export const updateClaimCategories = async (updatedCategories) => {
  try {
    await AsyncStorage.setItem('claimCategories', JSON.stringify({ claimCategories: updatedCategories }));
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

export const storeSeedClaims = async (claims) => {
  try {
    await AsyncStorage.setItem('claims', JSON.stringify({ claims }));
  } catch (error) {
    console.log(error);
  }

};

export const getIdentities = async () => {
  try {
    const result = await AsyncStorage.getItem('identities');
    return result ? JSON.parse(result).identities : [];
  } catch (error) {
    console.log(error);
  }
};

export const updateAttestations = async (updatedAttestations) => {
  try {
    await AsyncStorage.setItem('attestations', JSON.stringify({ attestations: updatedAttestations }));
  } catch (error) {
    console.log(error);
  }
};

export const removeIdentityData = async () => {
  try {
    await AsyncStorage.multiRemove(['identities', 'claimCategories', 'claims', 'attestations', 'blockHeight']);
  } catch (err) {
    console.log(err);
  }
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
    await AsyncStorage.setItem('claims', JSON.stringify({ claims: updatedClaims }));
  } catch (error) {
    console.log(error);
  }
};

export const getClaimsByIdentity = async (identityId) => {
  try {
    const storedClaims = await getClaims();
    const claimsForIdentity = storedClaims.filter((claim) => claim.to.includes(identityId));
    return claimsForIdentity;
  } catch (error) {
    console.log(error);
  }
};
