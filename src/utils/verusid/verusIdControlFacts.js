import {convertFqnToDisplayFormat} from '../fullyqualifiedname';
import {VERUSID_STATE} from './describeVerusIdState';

// Who can act on the VerusID, in plain words. Each fact shows once.
export const getControlFacts = ({friendlyNames, identity, ownedAddress, stateInfo}) => {
  const details = identity?.identity || {};
  const self = details.identityaddress;
  const ownName = convertFqnToDisplayFormat(identity?.fullyqualifiedname || details.fullyqualifiedname) ||
    friendlyNames?.[self] || (details.name ? convertFqnToDisplayFormat(details.name) : self);
  const nameFor = address =>
    address === self ? ownName : friendlyNames?.[address] || address;
  const primaryCount = Array.isArray(details.primaryaddresses)
    ? details.primaryaddresses.length
    : 0;
  const minimumSignatures = Number(details.minimumsignatures) || 1;
  const signatures = `${minimumSignatures} of ${primaryCount || 1} ${
    primaryCount === 1 ? 'signature' : 'signatures'
  }`;
  const facts = [];

  if (stateInfo.state === VERUSID_STATE.REVOKED) {
    facts.push({key: 'spend', label: 'Spend and sign', value: 'Revoked'});
  } else if (stateInfo.state === VERUSID_STATE.LOCKED) {
    facts.push({
      key: 'spend',
      label: 'Spend and sign',
      value: 'Locked',
      detail: stateInfo.unlock,
    });
  } else {
    let value = 'Other addresses';

    if (ownedAddress) value = primaryCount > 1
      ? `You and ${primaryCount - 1} ${primaryCount === 2 ? 'other' : 'others'}`
      : 'Only you';

    facts.push({
      key: 'spend',
      label: 'Spend and sign',
      value,
      detail: signatures,
    });
  }

  if (details.revocationauthority === details.recoveryauthority) {
    facts.push({
      key: 'authorities',
      label: 'Revoke and recover',
      value: nameFor(details.revocationauthority),
    });
  } else {
    facts.push({
      key: 'revoke',
      label: 'Revoke',
      value: nameFor(details.revocationauthority),
    });
    facts.push({
      key: 'recover',
      label: 'Recover',
      value: nameFor(details.recoveryauthority),
    });
  }

  return facts;
};
