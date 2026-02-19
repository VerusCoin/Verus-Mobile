/*
  classifyChanges
  - 2026-02-05: Created utility to split displayUpdates into highRiskChanges and
    contentChanges arrays. High-risk: primary address, revocation/recovery authority,
    status/lock changes. Content: everything else (CMM, private address, etc.).
*/
import {
  VERUSID_AUTH_INFO,
  VERUSID_BASE_INFO,
  VERUSID_CMM_INFO,
  VERUSID_PRIMARY_ADDRESS,
  VERUSID_RECOVERY_AUTH,
  VERUSID_REVOCATION_AUTH,
  VERUSID_STATUS,
} from '../../../../utils/constants/verusidObjectData';

const HIGH_RISK_KEYS = new Set([
  VERUSID_PRIMARY_ADDRESS.key,
  VERUSID_REVOCATION_AUTH.key,
  VERUSID_RECOVERY_AUTH.key,
  VERUSID_STATUS.key,
]);

const HIGH_RISK_LABELS = {
  [VERUSID_PRIMARY_ADDRESS.key]: {
    title: 'Change primary address',
    warning: 'Primary addresses control who can spend and sign for this ID.',
  },
  [VERUSID_REVOCATION_AUTH.key]: {
    title: 'Change revocation authority',
    warning: 'The revocation authority can revoke this identity.',
  },
  [VERUSID_RECOVERY_AUTH.key]: {
    title: 'Change recovery authority',
    warning: 'The recovery authority can recover control of this identity.',
  },
  [VERUSID_STATUS.key]: {
    title: 'Change identity status',
    warning: 'This may lock or revoke your identity.',
  },
};

/**
 * Checks whether a displayUpdates entry key is high-risk.
 * Primary address keys are formatted as "VERUSID_PRIMARY_ADDRESS:0", so we
 * check the prefix before the colon.
 */
const isHighRiskKey = key => {
  const baseKey = key.includes(':') ? key.split(':')[0] : key;
  return HIGH_RISK_KEYS.has(baseKey);
};

/**
 * Returns the human-readable label config for a high-risk key.
 */
const getHighRiskLabel = key => {
  const baseKey = key.includes(':') ? key.split(':')[0] : key;
  return HIGH_RISK_LABELS[baseKey] || { title: 'Change', warning: '' };
};

/**
 * Splits the flat displayUpdates map into two arrays:
 *   - highRiskChanges: changes to primary address, revocation/recovery authority, status
 *   - contentChanges: everything else (CMM data, private address, etc.)
 *
 * Each item in the returned arrays has: { key, groupKey, data, title, warning }
 */
export const classifyChanges = displayUpdates => {
  const highRiskChanges = [];
  const contentChanges = [];

  for (const groupKey in displayUpdates) {
    for (const itemKey in displayUpdates[groupKey]) {
      const entry = displayUpdates[groupKey][itemKey];
      if (!entry) continue;

      if (isHighRiskKey(itemKey)) {
        const label = getHighRiskLabel(itemKey);
        highRiskChanges.push({
          key: itemKey,
          groupKey,
          data: entry.data,
          title: label.title,
          warning: label.warning,
        });
      } else {
        contentChanges.push({
          key: itemKey,
          groupKey,
          data: entry.data,
        });
      }
    }
  }

  return { highRiskChanges, contentChanges };
};
