import { DEFAULT_ADDRESS_BLOCKLIST_WEBSERVER } from '../../../../constants/constants';
import { isJson } from '../../../../objectManip'
import axios from 'axios'

export const getAddressBlocklistFromServer = async (source) => {
  //const server = source == null || source.length === 0 ? DEFAULT_ADDRESS_BLOCKLIST_WEBSERVER : source;
  const server = DEFAULT_ADDRESS_BLOCKLIST_WEBSERVER;

  const res = await axios.get(server);

  if (!isJson(res.data)) {
    throw new Error(
      "Invalid JSON for address blocklist"
    );
  }

  const lists = Object.values(res.data);

  return lists.flat().map(x => {
    if (typeof x !== 'string') throw new Error("Invalid format in blocklist response");
    else return x
  });
}