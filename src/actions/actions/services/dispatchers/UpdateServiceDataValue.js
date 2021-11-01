export const updateServiceDataValue = async (
  state,
  dispatch,
  channels,
  successType,
  errorType,
  channelMap
) => {
  const activeUser = state.authentication.activeAccount;
  let channelsPassed = [];

  await Promise.all(
    channels.map(async (channel) => {
      if (!channelMap[channel])
        return;

      const channelStore = state[`channelStore_${channel}`]
      try {
        dispatch({
          type: successType,
          payload: await channelMap[channel](activeUser, channelStore),
        });
        channelsPassed.push(channel);
      } catch (error) {
        dispatch({ type: errorType, payload: { error: { message: error.message }, channel } });
      }
    })
  );

  return channelsPassed.length === channels.length;
};