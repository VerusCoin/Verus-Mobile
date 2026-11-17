import store from '../../store';
import {saveGeneralSettings} from '../../actions/actions/WalletSettings';
import {setGeneralWalletSettingsState} from '../../actions/actionCreators';
import {assignIdentityColorSlots} from './cardColors';

let saveQueue = Promise.resolve();
const unsavedAccounts = new Set();

// Settings are loaded at account initialization. Use the existing serialized
// general-settings writer and the same accountHash partition as wallet UI data.
export const ensureIdentityColorSlots = (accountHash, linkedIds = {}) => {
  const addresses = Object.values(linkedIds).flatMap(ids =>
    Object.keys(ids || {}),
  );
  const operation = saveQueue.then(async () => {
    if (!accountHash) return;
    const settings = store.getState().settings.generalWalletSettings;
    const byAccount = settings.identityColorSlotsByAccount || {};
    const previous = byAccount[accountHash] || {};
    const slots = assignIdentityColorSlots(previous, addresses);
    if (
      JSON.stringify(previous) === JSON.stringify(slots) &&
      !unsavedAccounts.has(accountHash)
    )
      return;
    const changes = {
      identityColorSlotsByAccount: {...byAccount, [accountHash]: slots},
    };
    try {
      store.dispatch(await saveGeneralSettings(changes));
      unsavedAccounts.delete(accountHash);
    } catch (_) {
      // A cosmetic save failure must not remove the wallet's cards. Keep this
      // session stable; the next coin rebuild attempts the write again.
      store.dispatch(
        setGeneralWalletSettingsState({
          ...store.getState().settings.generalWalletSettings,
          ...changes,
        }),
      );
      unsavedAccounts.add(accountHash);
      console.warn('Could not save identity card colors.');
    }
  });
  saveQueue = operation.catch(() => undefined);
  return operation;
};
