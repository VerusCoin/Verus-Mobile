import {
  SpendableKeyDetailsOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {validateSeedDetails} from '../../seedDetails/seedDetails';

export const validateSpendableKeyDetailsVDXFObject = async (
  request,
  detailIndex,
) => {
  const detail = request.getDetails(detailIndex);

  if (!(detail instanceof SpendableKeyDetailsOrdinalVDXFObject)) {
    throw new Error('Detail at specified index is not a SpendableKeyDetails request.');
  }

  validateSeedDetails(detail.data, {
    invalidMessage: 'Invalid spendable key details.',
    unsupportedSeedMessage: 'Only BIP39 spendable key details are supported.',
  });
};
