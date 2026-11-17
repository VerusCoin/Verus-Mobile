import {registrationNoticeState} from './noticeState';

// Paid jobs stay visible until linked. Dismissing a ready card leaves the job
// in Ready to link in the VerusID tab. Unpaid drafts have no Home card.
export const registrationNotifications = (jobs, accountHash) => Object.values(jobs || {})
  .filter(job => job.accountHash === accountHash && (job.commitmentTxid || job.status === 'registered') &&
    job.status !== 'complete' && !(job.status === 'registered' && job.readyDismissed))
  .sort((a, b) => a.createdAt - b.createdAt)
  .map(job => {
    const state = registrationNoticeState(job);
    const identityName = job.displayName || job.name;
    return {uid: `identity-registration:${job.id}`, kind: 'identity-registration', jobId: job.id, persistent: true,
      identityName, statusText: state.text, tone: state.tone, ready: job.status === 'registered', celebrated: job.readyCelebrated,
      title: [identityName, ` — ${state.text}`], body: job.status === 'registered' ? 'Link VerusID' : state.action || 'View progress',
      isActionable: () => true,
      onAction: props => props.navigation.navigate('IdentityTab', {screen: 'IdentityRegistration', params: {
        originTab: 'WalletHome', screen: 'IdentityRegistrationProgress', params: {jobId: job.id},
      }}),
    };
  });
