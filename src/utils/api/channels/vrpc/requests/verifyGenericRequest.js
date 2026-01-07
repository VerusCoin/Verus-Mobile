import VrpcProvider from "../../../../vrpc/vrpcInterface"
import { GenericRequest } from "verus-typescript-primitives/dist/vdxf/classes";

/**
 * Verifies a generic request object using the VrpcProvider context
 * @param {*} coinObj 
 * @param {GenericRequest} req 
 * @returns {Promise<boolean>}
 */
export const verifyGenericRequest = (coinObj, req, getIdentityResult) => {
  return VrpcProvider.getVerusIdInterface(coinObj.system_id).verifyGenericRequest(
    req,
    getIdentityResult
  )
};