import { primitives } from "verusid-ts-client";
import VrpcProvider from "../../../../vrpc/vrpcInterface";
import { requestPrivKey } from "../../../../auth/authBox";
import { VRPC } from "../../../../constants/intervalConstants";

export const signGenericResponse = async (coinObj, response) => {
  const genericResponse = new primitives.GenericResponse(response);

  return VrpcProvider.getVerusIdInterface(coinObj.system_id).signGenericResponse(
    genericResponse,
    await requestPrivKey(coinObj.id, VRPC)
  );
};
