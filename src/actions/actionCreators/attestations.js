import {
  SET_ATTESTATIONS,
  TOGGLE_ATTESTATION_PIN,
  SET_ATTESTATION_PINNED,
  SET_ACTIVE_ATTESTATION_ID,
} from '../../utils/constants/storeType';

export const setAttestations = (attestations) => ({
  type: SET_ATTESTATIONS,
  payload: { attestations },
});

export const toggleAttestationPin = (value) => ({
  type: TOGGLE_ATTESTATION_PIN,
  payload: { value },
});

export const setAttestationPinned = (attestationId) => ({
  type: SET_ATTESTATION_PINNED,
  payload: { attestationId },
});

export const setActiveAttestationId = (activeAttestationId) => ({
  type: SET_ACTIVE_ATTESTATION_ID,
  payload: { activeAttestationId },
});
