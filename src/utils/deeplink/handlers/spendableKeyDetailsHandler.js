import {
  SpendableKeyDetailsOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {seedDetailsRequiresPassword} from '../../seedDetails/seedDetails';

export const handleSpendableKeyDetailsVDXFObject = async (
  request,
  response,
  detailIndex,
) => {
  const detail = request.getDetails(detailIndex);

  if (!detail || !(detail instanceof SpendableKeyDetailsOrdinalVDXFObject)) {
    throw new Error('Invalid SpendableKeyDetails detail at index ' + detailIndex);
  }

  return {
    displayProps: {
      detailsBufferString: detail.data.toBuffer().toString('hex'),
      requiresPassword: seedDetailsRequiresPassword(detail),
    },
    response,
    handledIndices: [],
  };
};
