import store from '../../store';
import {saveGeneralSettings} from '../../actions/actions/WalletSettings';

let saveQueue = Promise.resolve();
let needsSave = false;

// Publish choices in Redux first. Serialize snapshots through the existing
// settings writer. A failed write keeps this session's choices for a later save.
export const saveCardStackPreferences = (changed = true) => {
  needsSave = needsSave || changed;
  const operation = saveQueue.then(async () => {
    if (!needsSave) return;
    needsSave = false;
    const byAccount = store.getState().settings.generalWalletSettings
      .cardStackPreferencesByAccount;
    try {
      // Redux already has this state. Do not dispatch an older disk snapshot.
      await saveGeneralSettings({cardStackPreferencesByAccount: byAccount});
    } catch (_) {
      needsSave = true;
      console.warn('Could not save card stack choices.');
    }
  });
  saveQueue = operation.catch(() => undefined);
  return operation;
};
