import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getVdxfId = async (system_id, vdxfuri, initialdata) => {
  const verusIdInterface = VrpcProvider.getVerusIdInterface(system_id);

  const vdxfid = await verusIdInterface.interface.getVdxfId(
    vdxfuri,
    initialdata
  );

  return vdxfid;
};