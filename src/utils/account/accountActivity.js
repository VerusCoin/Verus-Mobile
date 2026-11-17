import moment from 'moment';

const timestampIsValid = timestamp =>
  typeof timestamp === 'number' && Number.isFinite(timestamp) && timestamp > 0;

export const normalizeLastOpenedAccountTimestamps = timestamps => {
  if (timestamps == null || typeof timestamps !== 'object') {
    return {};
  }

  return Object.keys(timestamps).reduce((normalized, accountHash) => {
    const timestamp = timestamps[accountHash];

    if (timestampIsValid(timestamp)) {
      normalized[accountHash] = timestamp;
    }

    return normalized;
  }, {});
};

export const getAccountLastOpenedTimestamp = (
  account,
  lastOpenedAccountTimestamps = {},
) => {
  const accountHash = account ? account.accountHash : null;
  const timestamp = accountHash
    ? lastOpenedAccountTimestamps[accountHash]
    : null;

  return timestampIsValid(timestamp) ? timestamp : null;
};

export const formatLastOpenedLabel = timestamp => {
  if (!timestampIsValid(timestamp)) {
    return 'Not opened yet';
  }

  const openedAt = moment(timestamp);
  const now = moment();

  if (openedAt.isSame(now, 'day')) {
    return 'Opened today';
  }

  if (openedAt.isSame(moment(now).subtract(1, 'day'), 'day')) {
    return 'Opened yesterday';
  }

  if (openedAt.isSame(now, 'year')) {
    return `Opened ${openedAt.format('MMM D')}`;
  }

  return `Opened ${openedAt.format('MMM D, YYYY')}`;
};

export const sortAccountsByLoginPriority = (
  accounts,
  priorityAccountHash,
  lastOpenedAccountTimestamps,
) =>
  (Array.isArray(accounts) ? accounts : [])
    .map((account, index) => ({account, index}))
    .sort((a, b) => {
      const aHasPriority = a.account.accountHash === priorityAccountHash;
      const bHasPriority = b.account.accountHash === priorityAccountHash;

      if (aHasPriority !== bHasPriority) {
        return aHasPriority ? -1 : 1;
      }

      const aLastOpened = getAccountLastOpenedTimestamp(
        a.account,
        lastOpenedAccountTimestamps,
      );
      const bLastOpened = getAccountLastOpenedTimestamp(
        b.account,
        lastOpenedAccountTimestamps,
      );

      if (aLastOpened !== bLastOpened) {
        return (bLastOpened || 0) - (aLastOpened || 0);
      }

      return a.index - b.index;
    })
    .map(({account}) => account);
