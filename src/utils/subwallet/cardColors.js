import palette from './cardPalette.json';
import {getSubWalletCardType} from './cardPresentation';
import {getVerusIdCardAddress} from '../verusid/getVerusIdFunds';

export const identityColorSlotIsValid = slot =>
  Number.isInteger(slot) && slot >= 0 && slot < 14;

export const hashIdentityAddress = address => {
  let hash = 2166136261;
  for (let index = 0; index < address.length; index += 1) {
    hash ^= address.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

// Slot = hue * 2 + tone. Count saved identities, including unlinked ones, so
// a later visit or relink never changes a previously assigned material.
export const assignIdentityColorSlots = (saved = {}, addresses = []) => {
  const slots = Object.fromEntries(
    Object.entries(saved || {}).filter(([, slot]) =>
      identityColorSlotIsValid(slot),
    ),
  );
  const counts = Array(7).fill(0);
  Object.values(slots).forEach(slot => {
    counts[Math.floor(slot / 2)] += 1;
  });

  [...new Set(addresses)].sort().forEach(address => {
    if (Object.prototype.hasOwnProperty.call(slots, address)) return;
    const start = hashIdentityAddress(address) % 7;
    const leastUsed = Math.min(...counts);
    for (let offset = 0; offset < 7; offset += 1) {
      const hue = (start + offset) % 7;
      if (counts[hue] !== leastUsed) continue;
      slots[address] = hue * 2 + (counts[hue] % 2);
      counts[hue] += 1;
      break;
    }
  });
  return slots;
};

export const getCardColors = (wallet, identitySlots = {}) => {
  const type = getSubWalletCardType(wallet);
  if (type === 'Private') return palette.private;
  if (type !== 'VerusID') return palette.transparent;
  const slot = identitySlots[getVerusIdCardAddress(wallet)];
  // The coin saga loads/saves slots before publishing cards. A malformed or
  // unavailable map uses a neutral material, never a temporary wrong hue.
  return identityColorSlotIsValid(slot)
    ? palette.jewel[Math.floor(slot / 2)][slot % 2]
    : palette.unassigned;
};
