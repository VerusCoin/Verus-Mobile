/*
  provisionIdentityDetailsHandler 
  - Marks provision-identity details as handled so the generic request flow can
    keep a dedicated handler per VDXF type.
*/

export const handleProvisionIdentityDetailsVDXFObject = async (
  _request,
  currentResponse,
  index,
) => {
  return {
    displayProps: undefined,
    response: currentResponse,
    handledIndices: [index],
  };
};

// Codex GPT-5: keep provision-detail handling isolated so GenericRequestHome only wires handlers.
