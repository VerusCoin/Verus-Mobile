/* eslint-disable import/prefer-default-export */
import { RegisterIdentityRequestOrdinalVDXFObject } from 'verus-typescript-primitives';

export const validateRegisterIdentityRequestVDXFObject = (request, detailIndex) => {
  const detailsObject = request.getDetails(detailIndex);

  if (!(detailsObject instanceof RegisterIdentityRequestOrdinalVDXFObject)) {
    throw new Error('Register identity request details not found at specified index');
  }

  if (detailsObject.data == null || !detailsObject.data.isValid()) {
    throw new Error('Invalid register identity request details.');
  }
};
