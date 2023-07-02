import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getCurrencyConversionPaths = async (systemId, src, dest) => {
  let sourceDefinition, destDefinition;
  const endpoint = VrpcProvider.getEndpoint(systemId);

  const sourceResponse = await endpoint.getCurrency(src);

  if (sourceResponse.error) throw new Error(sourceResponse.error.message)

  sourceDefinition = sourceResponse.result

  if (dest != null) {
    const destResponse = await endpoint.getCurrency(dest);

    if (destResponse.error) throw new Error(destResponse.error.message)

    destDefinition = destResponse.result
  }

  return endpoint.getCurrencyConversionPaths(sourceDefinition, destDefinition);
}