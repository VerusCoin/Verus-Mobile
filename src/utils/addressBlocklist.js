export const addressIsBlocked = (address, blockList) => {
  for (const blockedAddress of blockList) {
    if (blockedAddress.address.toLowerCase() === address.toLowerCase()) {
      return true;
    }
  }

  return false;
}