import VrpcProvider from "../../../../vrpc/vrpcInterface";

export const getUpdateIdentityTransaction = async (
  systemId,
  identityJson
) => {
  return await VrpcProvider.getEndpoint(systemId).updateIdentity(
    identityJson,
    true
  );
};
