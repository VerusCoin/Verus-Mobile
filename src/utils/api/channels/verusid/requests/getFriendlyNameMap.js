import { convertFqnToDisplayFormat } from "../../../../fullyqualifiedname";
import { getIdentity } from "./getIdentity";

export const getFriendlyNameMap = async (coinObj, identityObj) => {
  let names = { ["i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV"]: "VRSC" };
  let iAddresses = [];
  const iAddress = identityObj.identity.identityaddress

  iAddresses.push(iAddress);

  names[iAddress] = convertFqnToDisplayFormat(identityObj.fullyqualifiedname);

  iAddresses.push(identityObj.identity.revocationauthority);
  iAddresses.push(identityObj.identity.recoveryauthority);
  iAddresses.push(identityObj.identity.systemid);

  for (const addr of iAddresses) {
    try {
      const id = await getIdentity(coinObj, addr);

      names[addr] = convertFqnToDisplayFormat(id.result.fullyqualifiedname);
    } catch (e) {
      continue;
    }
  }

  return names;
}