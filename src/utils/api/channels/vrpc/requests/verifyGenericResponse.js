import VrpcProvider from "../../../../vrpc/vrpcInterface"
import { GenericResponse } from "verus-typescript-primitives/dist/vdxf/classes";

/**
 * Verifies a generic response object using the VrpcProvider context
 * @param {*} coinObj 
 * @param {GenericResponse} res 
 * @returns {Promise<boolean>}
 */
export const verifyGenericResponse = (coinObj, res, getIdentityResult) => {
  return VrpcProvider.getVerusIdInterface(coinObj.system_id).verifyGenericResponse(
    res,
    getIdentityResult
  )
};