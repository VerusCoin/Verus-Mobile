import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const verifyHash = async (systemId, iAddrOrIdentity, base64Sig, hash) => {
  const provider = VrpcProvider.getVerusIdInterface(systemId);

  const identity = await provider.interface.getIdentity(iAddrOrIdentity);

  return provider.verifyHash(
    iAddrOrIdentity,
    base64Sig,
    hash,
    identity.result,
    systemId
  );
}