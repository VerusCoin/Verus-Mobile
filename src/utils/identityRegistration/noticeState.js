// Public status only. Payment status and safe recovery remain engine-owned.
export const registrationNoticeState = job => {
  const status = job.status;
  if (job.registrationProblem === 'name_taken') return {group: 'Needs attention', text: 'Name taken by someone else', action: 'Review', tone: 'danger'};
  if (job.registrationProblem === 'insufficient_funds') return {group: 'Needs attention', text: 'Not enough funds for the second payment', action: 'Review', tone: 'danger'};
  if (['commitment_signed', 'commitment_broadcast_unknown', 'registration_signed', 'registration_broadcast_unknown'].includes(status))
    return {group: 'Needs attention', text: 'Not seen by the network yet', action: 'Review', tone: 'warning'};
  if (status === 'commitment_expired') return {group: 'Needs attention', text: 'First payment not confirmed. Nothing was paid.', action: 'Review', tone: 'danger'};
  if (status === 'registration_expired') return {group: 'Needs attention', text: 'Second payment not confirmed. Nothing was paid.', action: 'Review', tone: 'danger'};
  if (status === 'commitment_spent') return {group: 'Needs attention', text: 'Needs attention', action: 'Review', tone: 'warning'};
  if (status === 'registered') return {group: 'Ready to link', text: '', action: 'Link', tone: 'success'};
  if (status === 'commitment_prepared') return {group: 'In progress', text: 'Saved, not paid yet', action: 'Continue'};
  if (['commitment_confirmed', 'registration_prepared'].includes(status)) return {group: 'In progress', text: 'Ready for the second payment', action: 'Continue'};
  return {group: 'In progress', text: status === 'registration_broadcast' ? 'Confirming registration' : 'Confirming commitment', action: null};
};
