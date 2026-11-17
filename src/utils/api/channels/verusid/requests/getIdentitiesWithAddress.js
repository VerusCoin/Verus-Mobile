import VrpcProvider from "../../../../vrpc/vrpcInterface";

export const getIdentitiesWithAddress = async (
  systemId,
  address,
  unspent = false,
) => {
  return VrpcProvider.getEndpoint(systemId).getIdentitiesWithAddress({
    address,
    unspent,
  });
};
