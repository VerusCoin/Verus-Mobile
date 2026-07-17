/* eslint-disable import/prefer-default-export */
import { RegisterIdentityRequestOrdinalVDXFObject } from 'verus-typescript-primitives';

export const handleRegisterIdentityRequestDetailsVDXFObject = async (request, response, detailIndex) => {
  const details = request.getDetails(detailIndex);

  if (details == null) throw new Error('Invalid index for request details');
  if (!(details instanceof RegisterIdentityRequestOrdinalVDXFObject)) {
    throw new Error('Register identity request details not found at specified index');
  }

  return {
    displayProps: {
      detailsBufferString: details.data.toBuffer().toString('hex'),
      registerIdentityRequest: details.data,
    },
    response,
    handledIndices: [],
  };
};
