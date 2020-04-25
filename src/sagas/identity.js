import {
  all, takeLatest, call, put, select,
} from 'redux-saga/effects';
import {
  getIdentities,
  storeSeedIdentities,
  storeSeedClaimCategories,
  storeSeedClaims,
  storeSeedAttestations,
  getClaims,
  getAttestations,
  updateAttestations,
  updateIdentities,
  getClaimCategoriesByIdentity,
  updateClaimCategories,
  updateClaims,
} from '../utils/asyncStore/identityStorage';
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
} from '../actions/actionCreators';
import {
  selectActiveIdentityId,
  selectAttestationsObject,
  selectIdentities,
  selectIdentityObj,
  selectActiveAttestationId,
  selectClaimCategoriesObj,
  selectClaimsObj,
  selectClaimCategories,
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
    takeLatest(SET_ATTESTATION_PINNED, handleSetAttestationPinned),
    takeLatest(ADD_NEW_IDENTITY_NAME, handleAddNewIdentity),
    takeLatest(ADD_NEW_IDENTITY, updateIdentityStorage),
    takeLatest(CHANGE_ACTIVE_IDENTITY, handleChangeActiveIdentity),
    takeLatest(ADD_NEW_CATEGORY, handleAddNewCategory),
    takeLatest(SET_CLAIM_VISIBILITY, updateClaimsStorage),
    takeLatest(MOVE_CLAIMS_TO_CATEGORY, handleMoveClaims),
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
  const selectedIdentityId = yield select(selectActiveIdentityId);
  yield all([
    call(storeSeedClaimCategories, selectedIdentityId),
    call(storeSeedClaims, selectedIdentityId),
    call(storeSeedAttestations),
  ]);
  yield call(handleReceiveSeedData);
}

function * handleChangeActiveIdentity(action) {
  const selectedIdentityId = yield select(selectActiveIdentityId);
  yield put(deselectActiveIdentity(selectedIdentityId));
  yield put(setNewActiveIdentity(action.payload.newActiveIdentityId));
  yield call(updateIdentityStorage);
  yield call(handleSetActiveIdentity);
}

function * handleReceiveSeedData() {
  const selectedIdentityId = yield select(selectActiveIdentityId);
  try {
    const [identityClaimCategoriesFromStore, claimsFromStore, attestationsFromStore] = yield all([
      call(getClaimCategoriesByIdentity, selectedIdentityId),
      call(getClaims),
      call(getAttestations),
    ]);

    const claimCategories = normalizeCategories(identityClaimCategoriesFromStore);
    const claims = normalizeClaims(claimsFromStore);
    const attestations = normalizeAttestations(attestationsFromStore);

    yield all([
      put(setClaims(claims)),
      put(setClaimCategories(claimCategories)),
      put(setAttestations(attestations)),
    ]);
  } catch (error) {
    console.log(error);
  }
}

function * handleToggleAttestation(action) {
  const selectedAttestationId = yield select(selectActiveAttestationId);
  yield put(setAttestationPinned(selectedAttestationId, action.payload.value));
}

function * handleSetAttestationPinned() {
  const attestations = yield select(selectAttestationsObject);
  const updatedAttestations = yield call(denormalizeAttestations, attestations.toJS());
  yield call(updateAttestations, updatedAttestations);
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
      identity: selectedIdentityId,
    },
  };

  yield put(setNewCategory(newCategory[newCategoryId]));
  yield call(updateClaimCategoryStorage);
}

function * handleMoveClaims(action) {
  const { targetCategory } = action.payload;
  const selectedClaims = yield select(selectSelectedClaims);
  yield put(updateCategoryForClaims(selectedClaims, targetCategory.get('id')));
  yield put(clearSelectedClaims());
  yield call(updateClaimsStorage);
}

function * updateClaimsStorage() {
  const selectedClaims = yield select(selectClaimsObj);
  const claims = yield call(denormalizeClaims, selectedClaims.toJS());
  yield call(updateClaims, claims);
}

function * updateIdentityStorage() {
  const selectedIdentities = yield select(selectIdentityObj);
  const identities = yield call(denormalizeIdentities, selectedIdentities.toJS());
  yield call(updateIdentities, identities);
}

function * updateClaimCategoryStorage() {
  const selectedCategories = yield select(selectClaimCategoriesObj);
  const categories = yield call(denormalizeClaimCategories, selectedCategories.toJS());
  yield call(updateClaimCategories, categories);
}
