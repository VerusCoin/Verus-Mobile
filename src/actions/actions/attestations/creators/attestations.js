import { SET_ATTESTATION_DATA } from "../../../../utils/constants/storeType"

export const setAttestationData = (
  data = {
    attestations_provisioned: null
  }
) => ({
  type: SET_ATTESTATION_DATA,
  data,
});