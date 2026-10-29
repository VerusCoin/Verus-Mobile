// Registration notices come from the encrypted job's public summary. Clearing
// ordinary notifications must not hide a commitment that still needs attention.
export const registrationNotifications = (jobs, accountHash) =>
  Object.values(jobs || {})
    .filter(job =>
      job.accountHash === accountHash &&
      (job.commitmentTxid || job.status === 'registered') &&
      job.status !== 'complete'
    )
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(job => {
      // Group durable stages by the next action offered in the notification.
      const ready = [
        'commitment_confirmed',
        'registration_prepared',
        'registration_expired',
      ].includes(job.status);
      const needsLink = job.status === 'registered';
      const registrationPending = [
        'registration_signed',
        'registration_broadcast',
        'registration_broadcast_unknown',
      ].includes(job.status);
      const needsAttention = ['commitment_expired', 'commitment_spent'].includes(job.status);
      const identityName = job.displayName || job.name || 'Identity registration';

      const statusText = needsLink
        ? 'Identity registered. Ready to link.'
        : ready
          ? 'Name committed. Ready to register.'
          : registrationPending
            ? 'Registration awaiting confirmation'
            : needsAttention
              ? 'Registration needs your attention'
              : 'Name commitment awaiting confirmation';

      return {
        uid: `identity-registration:${job.id}`,
        kind: 'identity-registration',
        jobId: job.id,
        persistent: true,
        identityName,
        statusText,
        title: [identityName, ` — ${statusText}`],
        body: needsLink
          ? 'Link to wallet'
          : ready
            ? 'Continue registration'
            : needsAttention
              ? 'Review registration'
              : 'View progress',
        isActionable: () => true,
        onAction: props => props.navigation.navigate('ServicesHome', {
          screen: 'IdentityRegistration',
          params: {
            screen: 'IdentityRegistrationProgress',
            params: {jobId: job.id},
          },
        }),
      };
    });
