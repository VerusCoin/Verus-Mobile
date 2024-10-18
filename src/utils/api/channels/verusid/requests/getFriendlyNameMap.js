import { convertFqnToDisplayFormat } from "../../../../fullyqualifiedname";
import { getIdentity } from "./getIdentity";

export const getFriendlyNameMap = async (systemId, identityObj) => {
  let names = {
    ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
    ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
  };

  let iAddresses = [];
  const iAddress = identityObj.identity.identityaddress

  iAddresses.push(iAddress);

  names[iAddress] = convertFqnToDisplayFormat(identityObj.fullyqualifiedname);

  iAddresses.push(identityObj.identity.revocationauthority);
  iAddresses.push(identityObj.identity.recoveryauthority);
  iAddresses.push(identityObj.identity.systemid);

  for (const addr of iAddresses) {
    try {
      const id = await getIdentity(systemId, addr);

      names[addr] = convertFqnToDisplayFormat(id.result.fullyqualifiedname);
    } catch (e) {
      continue;
    }
  }

  return names;
}