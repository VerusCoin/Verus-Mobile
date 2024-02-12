import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getVdxfId = async (system_id, vdxfuri, initialdata) => {

  const vdxfid = await VrpcProvider.getEndpoint(system_id).getVdxfId(
    vdxfuri,
    initialdata
  );

  return vdxfid;
};