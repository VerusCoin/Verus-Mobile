import axios from "axios";
import * as primitives  from "verus-typescript-primitives"


const handlers = {
  [primitives.LOGIN_CONSENT_PERSONALINFO_WEBHOOK_VDXF_KEY.vdxfid]: async (uri, response) => {
    return await axios.post(
      uri,
      response
    );
  }
}

export const handlePersonalDataSend = (response, redirectinfo) => {
  const { vdxfkey, uri } = redirectinfo

  return handlers[vdxfkey] == null ? null : handlers[vdxfkey](uri, response);
}