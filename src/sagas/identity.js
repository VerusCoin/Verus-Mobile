import { all, takeLatest, call, put, select } from "redux-saga/effects";
import { fromJS } from 'immutable';
import {
  storeActiveIdentity,
  getIdentities,
  storeSeedIdentities,
  storeSeedClaimCategories,
  storeSeedClaims,
  storeSeedAttestations,
  getClaimCategories,
  getClaims,
  getAttestations,
  updateAttestations,
} from "../utils/asyncStore/identityStorage";
import {
  setActiveIdentity,
  setIdentities,
  setAttestations,
  setClaims,
  setClaimCategories,
  storeIdentities,
} from "../actions/actionCreators";
import { selectActiveIdentityId, selectAttestationsObject, selectIdentities } from "../selectors/identity";
import {
  REQUEST_SEED_DATA,
  SET_ACTIVE_IDENTITY,
  STORE_IDENTITIES,
  TOGGLE_ATTESTATION_PIN,
} from "../utils/constants/storeType";
import {
  normalizedCategories,
  normalizedClaims,
  normalizedAttestations,
  normalizedIdentities,
} from "../utils/identityTransform/identityNormalizers";
import { denormalizedAttestations } from '../utils/identityTransform/identityDenormalizers';

export default function* identitySaga() {
  yield all([
    takeLatest(REQUEST_SEED_DATA, handleSeedData),
    takeLatest(STORE_IDENTITIES, handleStoreIdentities),
    takeLatest(SET_ACTIVE_IDENTITY, handleSetActiveIdentity),
    takeLatest(TOGGLE_ATTESTATION_PIN, handleToggleAttestation)
  ]);
}

function* handleSeedData() {
  const savedIdentities = yield call(getIdentities);
  if (!savedIdentities) {
    yield call(storeSeedIdentities);
  }
  yield put(storeIdentities());
}

function* handleStoreIdentities() {
  const storedIdentities = yield call(getIdentities);
  const identities = yield call(normalizedIdentities, storedIdentities);
  yield put(setIdentities(identities));
  const selectedItentities = yield select(selectIdentities)
  const activeIdentity = selectedItentities.find((identity) => identity.get('active') === true);
  if (activeIdentity) {
    yield put(setActiveIdentity(activeIdentity));
  }
}

function* handleSetActiveIdentity() {
  const selectedIdentityId = yield select(selectActiveIdentityId);
    yield all([
      call(storeSeedClaimCategories, selectedIdentityId),
      call(storeSeedClaims),
      call(storeSeedAttestations),
    ]);
  yield call(handleReceiveSeedData);
}

function* handleReceiveSeedData() {
  const [categoriesFromStore, claimsFromStore, attestationsFromStore] = yield all([
    call(getClaimCategories),
    call(getClaims),
    call(getAttestations),
  ])

  const claimCategories = normalizedCategories(categoriesFromStore);
  const claims = normalizedClaims(claimsFromStore);
  const attestations = normalizedAttestations(attestationsFromStore);

  yield put(setClaims(claims));
  yield put(setClaimCategories(claimCategories));
  yield put(setAttestations(attestations));
}

function* handleToggleAttestation() {
  const selectedAttestations = yield select(selectAttestationsObject);
  const updatedAttestations = yield call(denormalizedAttestations, selectedAttestations.toJS())
  yield call(updateAttestations, updatedAttestations)
}
