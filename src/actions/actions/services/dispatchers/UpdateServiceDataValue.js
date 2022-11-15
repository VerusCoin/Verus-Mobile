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
      try {
        dispatch({
          type: successType,
          payload: await channelMap[channel](channelStore),
        });
        channelsPassed.push(channel);
      } catch (error) {
        dispatch({ type: errorType, payload: { error: { message: error.message }, channel } });
      }
    })
  );

  return channelsPassed.length === channels.length;
};