import React, {useEffect, useMemo, useState} from 'react';
import {useSelector} from 'react-redux';
import {
  cancelWalletUnlock,
  resolveWalletUnlock,
} from '../actions/actionDispatchers';
import {useObjectSelector} from '../hooks/useObjectSelector';
import ChooseWalletSheet from '../containers/Login/components/ChooseWalletSheet';
import UnlockWalletSheet from '../containers/Login/components/UnlockWalletSheet';
import {
  normalizeLastOpenedAccountTimestamps,
  sortAccountsByLoginPriority,
} from '../utils/account/accountActivity';
import {
  getAccountNetworkKey,
  resolveLegacyWalletPriorityHash,
} from '../utils/account/accountNetwork';
import {getSupportedBiometryType} from '../utils/keychain/keychain';

const FLOW_IDLE = 'idle';
const FLOW_CHOOSING = 'choosing';
const FLOW_UNLOCKING = 'unlocking';

const createWalletUnlockDisplaySnapshot = walletUnlock => ({
  requestId: walletUnlock.requestId,
  title: walletUnlock.title,
  requestLabel: walletUnlock.requestLabel,
  accountHashes: Array.isArray(walletUnlock.accountHashes)
    ? [...walletUnlock.accountHashes]
    : walletUnlock.accountHashes,
  preferredAccountHash: walletUnlock.preferredAccountHash,
  loadingTitle: walletUnlock.loadingTitle,
  loadingSubtitle: walletUnlock.loadingSubtitle,
  networkLabel: walletUnlock.networkLabel,
});

const WalletUnlockCoordinator = () => {
  const walletUnlock = useObjectSelector(state => state.walletUnlock);
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const generalWalletSettings = useObjectSelector(
    state => state.settings.generalWalletSettings,
  );
  const signedIn = useSelector(state => state.authentication.signedIn);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [flowStep, setFlowStep] = useState(FLOW_IDLE);
  const [chooseWalletVisible, setChooseWalletVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [pendingUnlockAccount, setPendingUnlockAccount] = useState(null);
  const [supportedBiometryType, setSupportedBiometryType] = useState(null);
  const [walletUnlockSnapshot, setWalletUnlockSnapshot] = useState(null);
  const displayWalletUnlock = walletUnlock.visible
    ? walletUnlock
    : walletUnlockSnapshot || walletUnlock;

  const lastOpenedAccountTimestamps = useMemo(
    () =>
      normalizeLastOpenedAccountTimestamps(
        generalWalletSettings.lastOpenedAccountTimestamps,
      ),
    [generalWalletSettings.lastOpenedAccountTimestamps],
  );
  const eligibleAccounts = useMemo(() => {
    const accountHashes = displayWalletUnlock.accountHashes;

    if (!Array.isArray(accountHashes) || accountHashes.length === 0) {
      return accounts;
    }

    return accountHashes
      .map(accountHash =>
        accounts.find(account => account.accountHash === accountHash),
      )
      .filter(Boolean);
  }, [accounts, displayWalletUnlock.accountHashes]);
  const preferredAccount = useMemo(() => {
    if (!displayWalletUnlock.preferredAccountHash) {
      return null;
    }

    return (
      eligibleAccounts.find(
        account =>
          account.accountHash === displayWalletUnlock.preferredAccountHash,
      ) || null
    );
  }, [displayWalletUnlock.preferredAccountHash, eligibleAccounts]);
  const walletNetworkKey = selectedAccount
    ? getAccountNetworkKey(selectedAccount)
    : eligibleAccounts.length > 0
    ? getAccountNetworkKey(eligibleAccounts[0])
    : null;
  const legacyPriorityAccountHash = walletNetworkKey
    ? resolveLegacyWalletPriorityHash(
        accounts,
        generalWalletSettings,
        walletNetworkKey,
        lastOpenedAccountTimestamps,
      )
    : null;
  const sortedEligibleAccounts = useMemo(
    () =>
      sortAccountsByLoginPriority(
        eligibleAccounts,
        preferredAccount
          ? preferredAccount.accountHash
          : legacyPriorityAccountHash,
        lastOpenedAccountTimestamps,
      ),
    [
      eligibleAccounts,
      lastOpenedAccountTimestamps,
      legacyPriorityAccountHash,
      preferredAccount,
    ],
  );
  const useRefreshAccountData = !!(
    signedIn &&
    activeAccount &&
    selectedAccount &&
    activeAccount.accountHash !== selectedAccount.accountHash
  );

  useEffect(() => {
    let active = true;

    getSupportedBiometryType()
      .then(result => {
        if (active) {
          setSupportedBiometryType(result);
        }
      })
      .catch(() => {
        if (active) {
          setSupportedBiometryType(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!walletUnlock.visible || !walletUnlock.requestId) {
      return;
    }

    setWalletUnlockSnapshot(createWalletUnlockDisplaySnapshot(walletUnlock));
  }, [walletUnlock]);

  useEffect(() => {
    if (!walletUnlock.visible) {
      setActiveRequestId(null);
      setFlowStep(FLOW_IDLE);
      setChooseWalletVisible(false);
      setSelectedAccount(null);
      setPendingUnlockAccount(null);
      return;
    }

    if (!walletUnlock.requestId) {
      return;
    }

    if (activeRequestId === walletUnlock.requestId) {
      if (eligibleAccounts.length === 0) {
        cancelWalletUnlock(walletUnlock.requestId);
        return;
      }

      if (
        flowStep === FLOW_UNLOCKING &&
        selectedAccount != null &&
        !eligibleAccounts.some(
          account => account.accountHash === selectedAccount.accountHash,
        )
      ) {
        cancelWalletUnlock(walletUnlock.requestId);
      }

      return;
    }

    if (sortedEligibleAccounts.length === 1) {
      setActiveRequestId(walletUnlock.requestId);
      setFlowStep(FLOW_UNLOCKING);
      setChooseWalletVisible(false);
      setSelectedAccount(sortedEligibleAccounts[0]);
      setPendingUnlockAccount(null);
      return;
    }

    if (sortedEligibleAccounts.length > 1) {
      setActiveRequestId(walletUnlock.requestId);
      setFlowStep(FLOW_CHOOSING);
      setSelectedAccount(null);
      setPendingUnlockAccount(null);
      setChooseWalletVisible(true);
      return;
    }

    cancelWalletUnlock(walletUnlock.requestId);
  }, [
    activeRequestId,
    eligibleAccounts,
    flowStep,
    selectedAccount,
    sortedEligibleAccounts,
    walletUnlock.requestId,
    walletUnlock.visible,
  ]);

  const handleCancelUnlock = () => {
    if (walletUnlock.requestId) {
      cancelWalletUnlock(walletUnlock.requestId);
    }
  };

  const handleChooseWalletAccount = account => {
    setPendingUnlockAccount(account);
    setChooseWalletVisible(false);
  };

  const handleChooseWalletClosed = () => {
    if (walletUnlock.visible && pendingUnlockAccount != null) {
      setFlowStep(FLOW_UNLOCKING);
      setSelectedAccount(pendingUnlockAccount);
      setPendingUnlockAccount(null);
      return;
    }

    if (!walletUnlock.visible) {
      setWalletUnlockSnapshot(null);
    }
  };

  const handleUnlockWalletClosed = () => {
    if (!walletUnlock.visible) {
      setWalletUnlockSnapshot(null);
    }
  };

  const handleUnlocked = account => {
    if (walletUnlock.requestId) {
      resolveWalletUnlock(walletUnlock.requestId, account);
    }
  };

  return (
    <>
      <ChooseWalletSheet
        visible={
          walletUnlock.visible &&
          flowStep === FLOW_CHOOSING &&
          chooseWalletVisible
        }
        onClose={handleCancelUnlock}
        onClosed={handleChooseWalletClosed}
        accounts={sortedEligibleAccounts}
        lastOpenedAccountTimestamps={lastOpenedAccountTimestamps}
        supportedBiometryType={supportedBiometryType}
        onSelectAccount={handleChooseWalletAccount}
      />
      <UnlockWalletSheet
        visible={
          walletUnlock.visible &&
          flowStep === FLOW_UNLOCKING &&
          selectedAccount != null
        }
        account={selectedAccount}
        title={displayWalletUnlock.title}
        requestLabel={displayWalletUnlock.requestLabel}
        loadingTitle={displayWalletUnlock.loadingTitle}
        loadingSubtitle={displayWalletUnlock.loadingSubtitle || undefined}
        useRefreshAccountData={useRefreshAccountData}
        closeOnUnlocked={false}
        onClose={handleCancelUnlock}
        onClosed={handleUnlockWalletClosed}
        onUnlocked={handleUnlocked}
      />
    </>
  );
};

export default WalletUnlockCoordinator;
