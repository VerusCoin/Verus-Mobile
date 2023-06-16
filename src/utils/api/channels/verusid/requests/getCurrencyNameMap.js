import { getCurrency } from "./getCurrency";

export const getCurrencyNameMap = async (coinObj, currencyDefinition) => {
  let names = {
    ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
    ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
    [currencyDefinition.currencyid]: currencyDefinition.fullyqualifiedname
  };

  let iAddresses = [];

  iAddresses.push(currencyDefinition.parent);
  iAddresses.push(currencyDefinition.systemid);

  for (const addr of iAddresses) {
    try {
      if (!names[addr]) {
        const curr = await getCurrency(coinObj.system_id, addr);

        names[addr] = curr.result.fullyqualifiedname;
      }
    } catch (e) {
      continue;
    }
  }

  return names;
}