import {getIdentity} from '../../utils/api/channels/verusid/requests/getIdentity';
import {timeout} from '../../utils/promises';
import {isPrivateChannel} from '../../utils/subwallet/privateWallet';
import {
  isPrivateIdentity,
  isPrivateRecipient,
  PRIVATE_IDENTITY_SUFFIX,
} from './wizardUtils';

// Only the private card reaches a private address. Every send card can pay
// another address; from the private card that makes the amount public.
export const cardCanPay = (channel, address) =>
  !isPrivateRecipient(address) || isPrivateChannel(channel);

// A memo goes with a send from the private card to a private address.
export const memoApplies = (channel, address) =>
  isPrivateChannel(channel) && isPrivateRecipient(address);

// The light wallet sends to raw addresses only, so a VerusID is resolved
// first: "alice@" to its i-address and "alice@:private" to its private
// address. The old send screen did the same.
export const resolvePrivateCardDestination = async (sourceCoin, recipient) => {
  const value = String(recipient || '').trim();
  if (!value.includes('@')) return value;

  const wantsPrivate = isPrivateIdentity(value);
  const name = wantsPrivate
    ? value.slice(0, -PRIVATE_IDENTITY_SUFFIX.length)
    : value;
  let response;
  try {
    response = await timeout(15000, getIdentity(sourceCoin?.system_id, name));
  } catch (error) {
    throw new Error('Could not verify this VerusID. Try again.');
  }
  const identity = response?.result?.identity;
  if (response?.error || !identity) {
    throw new Error(
      response?.error?.code === -5
        ? 'VerusID not found. Check the name and try again.'
        : 'Could not verify this VerusID. Try again.',
    );
  }
  if (response.result.status !== 'active') {
    throw new Error(`${name} can’t receive funds right now.`);
  }
  if (!wantsPrivate) return identity.identityaddress;
  if (!identity.privateaddress) {
    throw new Error(`${name} has no private address.`);
  }
  return identity.privateaddress;
};
