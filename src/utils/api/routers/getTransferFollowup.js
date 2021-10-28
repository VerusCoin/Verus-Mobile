import { WYRE_SERVICE } from "../../constants/intervalConstants";
import * as wyre from "../channels/wyre/callCreators";

const TRANSFER_FOLLOWUP_FUNCTION_MAP = {
  [WYRE_SERVICE]: wyre.getTransferFollowup,
};

export const getTransferFollowup = async (
  channel,
  params
) => {
  if (TRANSFER_FOLLOWUP_FUNCTION_MAP[channel] == null)
    throw new Error(`No transfer follow up function available for channel ${channel}`);
  else
    return await TRANSFER_FOLLOWUP_FUNCTION_MAP[channel](params);
};
