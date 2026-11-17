import {createSelector} from 'reselect';

// Registration summaries contain public metadata only. Never read signed
// receipts, reservation secrets or wallet storage from a history row.
export const selectRegistrationTransactions = createSelector(
  [
    state => state.channelStore_verusid.registrationJobs,
    state => state.authentication.activeAccount?.accountHash,
    state => state.coins.activeCoin.id,
  ],
  (jobs, accountHash, coinId) => {
    const transactions = {};
    for (const job of Object.values(jobs || {})) {
      if (job.accountHash !== accountHash || job.chainTicker !== coinId) continue;
      if (job.commitmentTxid) transactions[job.commitmentTxid] = {
        kind: 'commitment', name: job.displayName, systemId: job.systemId,
      };
      if (job.registrationTxid) transactions[job.registrationTxid] = {
        kind: 'registration', name: job.displayName, systemId: job.systemId,
      };
    }
    return transactions;
  },
);
