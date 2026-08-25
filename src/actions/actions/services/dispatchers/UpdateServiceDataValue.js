import { beginSessionRequest } from "../../updates/sessionRequests";

export const updateServiceDataValue = async (
  state,
  dispatch,
  channels,
  successType,
  errorType,
  fetchChannels
) => {
  const activeUser = state.authentication.activeAccount;
  let channelsPassed = [];
  const channelMap = fetchChannels(activeUser)

  await Promise.all(
    channels.map(async (channel) => {
      if (!channelMap[channel])
        return;

      const channelStore = state[`channelStore_${channel}`]
      const request = beginSessionRequest(
        state,
        dispatch,
        `service:${successType}:${channel}`,
      );

      try {
        const requestContext = {
          signal: request.signal,
          sessionScope: request.meta,
          requestId: request.meta.requestId,
          accountHash: request.meta.accountHash,
          sessionEpoch: request.meta.sessionEpoch,
        };

        dispatch({
          type: successType,
          payload: await channelMap[channel](channelStore, requestContext),
          meta: request.meta,
        });
        channelsPassed.push(channel);
      } catch (error) {
        dispatch({
          type: errorType,
          payload: { error: { message: error.message }, channel },
          meta: request.meta,
        });
      } finally {
        request.complete();
      }
    })
  );

  return channelsPassed.length === channels.length;
};
