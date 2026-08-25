import VrpcProvider from '../../../../vrpc/vrpcInterface';

export const getBlockHash = (systemId, height) => {
  return VrpcProvider.getEndpoint(systemId).getBlockHash(height);
};
