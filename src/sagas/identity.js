import {
  all, takeLatest, call, put, select,
} from 'redux-saga/effects';
import {
  getIdentities,
  storeSeedIdentities,
  storeSeedClaimCategories,
  storeSeedClaims,
  // storeSeedAttestations,
  getClaims,
  getAttestations,
  updateAttestations,
  updateIdentities,
  getClaimCategoriesByIdentity,
  updateClaimCategories,
  updateClaims,
  getClaimCategories,
  getClaimsByIdentity,
  getAttestationsByIdentity,
} from '../utils/asyncStore/identityStorage';
import updateStoredItems from '../utils/InitialData/updateStoredItems';
import generateClaimCategories from '../utils/InitialData/ClaimCategory';
import generateAttestations from '../utils/InitialData/Attestation';
import { camelizeString } from '../utils/stringUtils';
import {
  setActiveIdentity,
  setIdentities,
  setAttestations,
  setClaims,
  setClaimCategories,
  storeIdentities,
  addNewIdentity,
  deselectActiveIdentity,
  setNewActiveIdentity,
  setAttestationPinned,
  setNewCategory,
  updateCategoryForClaims,
  clearSelectedClaims,
  setHideSelectedClaims,
} from '../actions/actionCreators';
import {
  selectActiveIdentityId,
  selectAttestationsReducerState,
  selectIdentities,
  selectIdentityReducerState,
  selectActiveAttestationId,
  selectClaimCategoriesReducerState,
  selectClaimsReducerState,
  selectSelectedClaims,
} from '../selectors/identity';
import {
  REQUEST_SEED_DATA,
  SET_ACTIVE_IDENTITY,
  STORE_IDENTITIES,
  TOGGLE_ATTESTATION_PIN,
  ADD_NEW_IDENTITY_NAME,
  ADD_NEW_IDENTITY,
  CHANGE_ACTIVE_IDENTITY,
  SET_ATTESTATION_PINNED,
  ADD_NEW_CATEGORY,
  SET_CLAIM_VISIBILITY,
  MOVE_CLAIMS_TO_CATEGORY,
  HIDE_SELECTED_CLAIMS,
} from '../utils/constants/storeType';
import {
  normalizeCategories,
  normalizeClaims,
  normalizeAttestations,
  normalizeIdentities,
} from '../utils/identityTransform/identityNormalizers';
import {
  denormalizeAttestations,
  denormalizeIdentities,
  denormalizeClaimCategories,
  denormalizeClaims,
} from '../utils/identityTransform/identityDenormalizers';

export default function * identitySaga() {
  yield all([
    takeLatest(REQUEST_SEED_DATA, handleSeedData),
    takeLatest(STORE_IDENTITIES, handleStoreIdentities),
    takeLatest(SET_ACTIVE_IDENTITY, handleSetActiveIdentity),
    takeLatest(TOGGLE_ATTESTATION_PIN, handleToggleAttestation),
    takeLatest(SET_ATTESTATION_PINNED, updateAttestationStorage),
    takeLatest(ADD_NEW_IDENTITY_NAME, handleAddNewIdentity),
    takeLatest(ADD_NEW_IDENTITY, updateIdentityStorage),
    takeLatest(CHANGE_ACTIVE_IDENTITY, handleChangeActiveIdentity),
    takeLatest(ADD_NEW_CATEGORY, handleAddNewCategory),
    takeLatest(SET_CLAIM_VISIBILITY, updateClaimsStorage),
    takeLatest(MOVE_CLAIMS_TO_CATEGORY, handleMoveClaims),
    takeLatest(HIDE_SELECTED_CLAIMS, handleHideClaims),
  ]);
}

function * handleSeedData() {
  const savedIdentities = yield call(getIdentities);
  if (!savedIdentities.length) {
    yield call(storeSeedIdentities);
  }
  yield put(storeIdentities());
}

function * handleStoreIdentities() {
  const storedIdentities = yield call(getIdentities);
  const identities = yield call(normalizeIdentities, storedIdentities);
  yield put(setIdentities(identities));
  const selectedIdentities = yield select(selectIdentities);
  const activeIdentity = selectedIdentities.find((identity) => identity.get('active') === true);

  if (activeIdentity) {
    yield put(setActiveIdentity(activeIdentity.get('name')));
  }
}

function * handleSetActiveIdentity() {
  yield call(handleStoreSeedClaimCategories);
  yield call(handleStoreSeedClaims);
  yield call(handleReceiveSeedData);
}

/**
 * @function `handleStoreSeedClaimCategories`:
 * this saga is being called when user selects an identity,
 * or changes the current active identity. It's responsible for storing claim categories
 * into the Async Storage. If there is nothing stored, the initial data
 * is generated.
 */
function * handleStoreSeedClaimCategories() {
  const seededCategories = generateClaimCategories;
  const storedCategories = yield call(getClaimCategories);
  if (!storedCategories.length) {
    yield call(storeSeedClaimCategories, seededCategories);
  }
}

// /**
//  * @function `handleStoreSeedClaims`:
//  * this saga is being called when user selects an identity,
//  * or changes the current active identity. It's responsible for storing claims
//  * into the Async Storage. If there is nothing stored, the initial data
//  * is generated. If there are some items stored but for a different identity,
//  * concat the two arrays. Finally if there are claims for the selected identity
//  * use those claims
//  * @param {String} identityId Currently active identity.
//  */

function * handleStoreSeedClaims() {
  const storedClaims = yield call(getClaims);
  console.log(storedClaims, 'stored claimssss[s[s[[s[[[[123[[31p[321[213p[[321')
  yield call(storeSeedClaims, storedClaims.length > 0 ? storedClaims : []);
}

/**
 * @function `handleStoreSeedAttestations`:
 * this saga is being called when user selects an identity,
 * or changes the current active identity. It's responsible for storing attestations
 * into the Async Storage. If there is nothing stored, the initial data
 * is generated. If there are some items stored but for a different identity,
 * concat the two arrays. Finally if there are attestations for the selected identity
 * use those attestations
 * @param {String} identityId Currently active identity.
 */
function * handleStoreSeedAttestations(identityId) {
  const seededAttestations = generateAttestations(identityId);
  let attestationsToStore = [];
  const storedAttestations = yield call(getAttestations);
  if (!storedAttestations.length) {
    attestationsToStore = seededAttestations;
  } else if (storedAttestations.every((attestation) => !attestation.id.includes(identityId))) {
    attestationsToStore = [...storedAttestations, ...seededAttestations];
  } else {
    attestationsToStore = storedAttestations;
  }
  yield call(storeSeedAttestations, attestationsToStore);
}

function * handleChangeActiveIdentity(action) {
  const selectedIdentityId = yield select(selectActiveIdentityId);
  yield put(deselectActiveIdentity(selectedIdentityId));
  yield put(setNewActiveIdentity(action.payload.newActiveIdentityId));
  yield call(updateIdentityStorage);
  yield call(handleSetActiveIdentity);
}

function * handleReceiveSeedData() {
  try {
    const claimCategoriesFromStore = yield call(getClaimCategories);
    const claimsFromStore = yield call(getClaims);
    const attestationsFromStore = yield call(getAttestations);

    const claimCategories = normalizeCategories(claimCategoriesFromStore);
    const claims = normalizeClaims(claimsFromStore);
    const attestations = normalizeAttestations(attestationsFromStore);

    yield put(setClaimCategories(claimCategories));
    yield put(setClaims(claims));
    yield put(setAttestations(attestations));
  } catch (error) {
    console.log(error);
  }
}

function * handleToggleAttestation() {
  const selectedAttestationId = yield select(selectActiveAttestationId);
  yield put(setAttestationPinned(selectedAttestationId));
}

function * handleAddNewIdentity(action) {
  const name = action.payload.identityName;

  const newIdentity = {
    [name]: {
      id: name,
      name,
      primaryAddresses: ['3456789876543', '4567898765432'],
      identityAddress: '3456789876543',
      active: false,
    },
  };

  yield put(addNewIdentity(newIdentity[name]));
}

function * handleAddNewCategory(action) {
  const selectedIdentityId = yield select(selectActiveIdentityId);
  const camelizedCategoryName = camelizeString(action.payload.value);

  const newCategoryId = `${selectedIdentityId}-${camelizedCategoryName}`;

  const newCategory = {
    [newCategoryId]: {
      id: newCategoryId,
      name: action.payload.value,
      desc: '',
    },
  };

  yield put(setNewCategory(newCategory[newCategoryId]));
  yield call(updateClaimCategoryStorage);
}

function * handleMoveClaims(action) {
  const { targetCategory } = action.payload;
  const selectedClaims = yield select(selectSelectedClaims);
  yield put(updateCategoryForClaims(selectedClaims, targetCategory.get('name')));
  yield put(clearSelectedClaims());
  yield call(updateClaimsStorage);
}

function * updateIdentityStorage() {
  const selectedIdentities = yield select(selectIdentityReducerState);
  const identities = yield call(denormalizeIdentities, selectedIdentities.toJS());
  yield call(updateIdentities, identities);
}

function * updateClaimCategoryStorage() {
  const selectedCategories = yield select(selectClaimCategoriesReducerState);
  const storedCategories = yield call(getClaimCategories);
  const denormalizedCategories = yield call(denormalizeClaimCategories, selectedCategories.toJS());
  const categoriesToStore = yield call(updateStoredItems, storedCategories, denormalizedCategories, 'claimCategories');
  yield call(updateClaimCategories, categoriesToStore);
}

export function * updateClaimsStorage() {
  const selectedClaims = yield select(selectClaimsReducerState);
  const storedClaims = yield call(getClaims);
  const claims = yield call(denormalizeClaims, selectedClaims.toJS());
  const claimsToStore = yield call(updateStoredItems, storedClaims, claims, 'claims');
  yield call(updateClaims, claimsToStore);
}

export function * updateAttestationStorage() {
  const attestations = yield select(selectAttestationsReducerState);
  const storedAttestations = yield call(getAttestations);
  const updatedAttestations = yield call(denormalizeAttestations, attestations.toJS());
  const attestationsToStore = yield call(updateStoredItems, storedAttestations, updatedAttestations, 'attestations');
  yield call(updateAttestations, attestationsToStore);
}
function * handleHideClaims() {
  const selectedClaims = yield select(selectSelectedClaims);
  yield put(setHideSelectedClaims(selectedClaims));
  yield put(clearSelectedClaims());
  yield call(updateClaimsStorage);
}
