import AsyncStorage from "@react-native-community/async-storage";

import identities from '../InitialData/Identity';
import claims from '../InitialData/Claim';
import claimCategories from '../InitialData/ClaimCategory';
import attestations from '../InitialData/Attestation';

export const storeSeedIdentities = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.setItem("identities", JSON.stringify(identities))
      .then(res => {
        resolve(res);
      })
      .catch(err => reject(err));
  });
};

export const storeSeedClaimCategories = (identityId) => {
  const seededCategories = claimCategories(identityId)

  return new Promise((resolve, reject) => {
    AsyncStorage.setItem("claimCategories", JSON.stringify(seededCategories))
      .then(res => {
        resolve(res);
      })
      .catch(err => reject(err));
  });
};

export const storeSeedClaims = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.setItem("claims", JSON.stringify(claims))
      .then(res => {
        resolve(res);
      })
      .catch(err => reject(err));
  });
};

export const storeSeedAttestations = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.setItem("attestations", JSON.stringify(attestations))
      .then(res => {
        resolve(res);
      })
      .catch(err => reject(err));
  });
};

export const getIdentities = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem("identities")
      .then(res => {
        if (!res) {
          resolve(false);
        } else {
          const result = JSON.parse(res);
          resolve(result);
        }
      })
      .catch(err => reject(err));
  });
};

export const getClaimCategories = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem("claimCategories")
      .then(res => {
        if (!res) {
          resolve(false);
        } else {
          const result = JSON.parse(res);
          resolve(result);
        }
      })
      .catch(err => reject(err));
  });
};

export const getClaims = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem("claims")
      .then(res => {
        if (!res) {
          resolve(false);
        } else {
          const result = JSON.parse(res);
          resolve(result);
        }
      })
      .catch(err => reject(err));
  });
};

export const getAttestations = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem("attestations")
      .then(res => {
        if (!res) {
          resolve(false);
        } else {
          const result = JSON.parse(res);
          resolve(result);
        }
      })
      .catch(err => reject(err));
  });
};

export const updateAttestations = (updatedAttestations) => {
  console.log(updatedAttestations);
  return;
  // return new Promise((resolve, reject) => {
  //   AsyncStorage.setItem("attestations", JSON.stringify(updatedAttestations))
  //     .then(res => {
  //       resolve(res);
  //     })
  //     .catch(err => reject(err));
  // });
};

export const removeIdentityData = () => {
  AsyncStorage.multiRemove(['identities', 'claimCategories', 'claims', 'attestations'], err => {
    console.log(err)
  });
}
