import { getIdentity } from "./getIdentity";

export const getFriendlyNameMap = async (coinObj, identityObj) => {
  let names = { ["i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV"]: "VRSC" };
  let iAddresses = [];
  const iAddress = identityObj.identity.identityaddress

  iAddresses.push(iAddress);

  names[iAddress] = `${identityObj.identity.name}@`;

  iAddresses.push(identityObj.identity.revocationauthority);
  iAddresses.push(identityObj.identity.recoveryauthority);
  iAddresses.push(identityObj.identity.systemid);

  for (const addr of iAddresses) {
    try {
      const id = await getIdentity(coinObj, addr);

      names[addr] = `${id.identity.name}@`;
    } catch (e) {
      continue;
    }
  }

  return names;
}