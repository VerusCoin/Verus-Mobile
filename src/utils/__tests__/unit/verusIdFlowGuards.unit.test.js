import {
  captureIdentityLinkOrigin,
  createVerusIdResumeOwner,
  identityLinkCandidateIsLinkable,
  identityLinkCandidateMatchesAccount,
  identityLinkOriginIsCurrent,
  pendingStatusSheetShouldDismiss,
  shouldNavigateAfterUnlinkDismissal,
} from '../../verusid/verusIdFlowGuards';

const CHAIN = 'VRSCTEST';
const SHARED_R_ADDRESS = 'RSharedFirstAddress000000000000000000';
const OTHER_R_ADDRESS = 'ROtherAddress11111111111111111111111';

const buildState = ({accountHash, addresses, sessionEpoch = 1}) => ({
  authentication: {
    activeAccount: {
      accountHash,
      keys: {
        [CHAIN]: {
          vrpc: {addresses},
        },
      },
    },
    sessionEpoch,
  },
});

const buildCandidate = ({
  accountHash,
  chainId = CHAIN,
  primaryAddress = SHARED_R_ADDRESS,
  sessionEpoch = 1,
  walletAddress = SHARED_R_ADDRESS,
}) => ({
  chainId,
  identityAddress: 'iCandidate',
  origin: {accountHash, chainId, sessionEpoch, walletAddress},
  primaryAddress,
});

describe('identity link candidate scope', () => {
  it('accepts a candidate resolved for the current account', () => {
    const state = buildState({
      accountHash: 'account-a',
      addresses: [SHARED_R_ADDRESS, OTHER_R_ADDRESS],
    });
    const candidate = buildCandidate({accountHash: 'account-a'});

    expect(identityLinkOriginIsCurrent(state, candidate.origin)).toBe(true);
    expect(identityLinkCandidateMatchesAccount(state, candidate)).toBe(true);
    expect(identityLinkCandidateIsLinkable(state, candidate)).toBe(true);
  });

  it('rejects an account-A candidate after switching to account B', () => {
    const accountA = buildState({
      accountHash: 'account-a',
      addresses: [SHARED_R_ADDRESS],
    });
    const accountB = buildState({
      accountHash: 'account-b',
      addresses: [SHARED_R_ADDRESS],
      sessionEpoch: 2,
    });
    const candidate = buildCandidate({
      accountHash: 'account-a',
      sessionEpoch: 1,
    });

    expect(identityLinkCandidateMatchesAccount(accountA, candidate)).toBe(true);
    // Both accounts share the same first R-address; only the origin session
    // distinguishes them.
    expect(identityLinkOriginIsCurrent(accountB, candidate.origin)).toBe(false);
    expect(identityLinkCandidateMatchesAccount(accountB, candidate)).toBe(
      true,
    );
    expect(identityLinkCandidateIsLinkable(accountB, candidate)).toBe(
      false,
    );
  });

  it('rejects a candidate whose origin chain no longer owns the address', () => {
    const state = buildState({
      accountHash: 'account-a',
      addresses: [OTHER_R_ADDRESS],
    });
    const candidate = buildCandidate({
      accountHash: 'account-a',
      primaryAddress: SHARED_R_ADDRESS,
      walletAddress: SHARED_R_ADDRESS,
    });

    expect(identityLinkCandidateMatchesAccount(state, candidate)).toBe(false);
  });

  it('captures the live session and rejects stale epochs', () => {
    const state = buildState({accountHash: 'account-a', addresses: []});
    const origin = captureIdentityLinkOrigin(state, {
      chainId: CHAIN,
      walletAddress: SHARED_R_ADDRESS,
    });

    expect(identityLinkOriginIsCurrent(state, origin)).toBe(true);
    expect(
      identityLinkOriginIsCurrent(
        {...state, authentication: {...state.authentication, sessionEpoch: 9}},
        origin,
      ),
    ).toBe(false);
  });
});

describe('pending status sheet dismissal', () => {
  const READY = 'VERUSID_READY';

  it('dismisses once the request becomes READY', () => {
    expect(
      pendingStatusSheetShouldDismiss({
        selectedPending: {status: 'PROGRESS'},
        currentPending: {status: READY},
        readyStatus: READY,
      }),
    ).toBe(true);
  });

  it('dismisses once the request leaves the list', () => {
    expect(
      pendingStatusSheetShouldDismiss({
        selectedPending: {status: 'PROGRESS'},
        currentPending: null,
        readyStatus: READY,
      }),
    ).toBe(true);
  });

  it('stays open while the request is still processing', () => {
    expect(
      pendingStatusSheetShouldDismiss({
        selectedPending: {status: 'PROGRESS'},
        currentPending: {status: 'PROGRESS'},
        readyStatus: READY,
      }),
    ).toBe(false);
  });

  it('stays closed when nothing was selected', () => {
    expect(
      pendingStatusSheetShouldDismiss({
        selectedPending: null,
        currentPending: {status: READY},
        readyStatus: READY,
      }),
    ).toBe(false);
  });
});

describe('unlink dismissal navigation', () => {
  const sessionScope = {
    accountHash: 'account-a',
    sessionEpoch: 1,
    sessionScoped: true,
  };
  const state = buildState({accountHash: 'account-a', addresses: []});
  const navigationState = {
    index: 1,
    routes: [{key: 'list'}, {key: 'details'}],
  };

  const base = {
    mounted: true,
    sessionScope,
    state,
    originatingRouteKey: 'details',
    navigationState,
    isFocused: true,
  };

  it('allows navigation for the originating session and route', () => {
    expect(shouldNavigateAfterUnlinkDismissal(base)).toBe(true);
  });

  it('blocks navigation after the wallet session changes', () => {
    expect(
      shouldNavigateAfterUnlinkDismissal({
        ...base,
        state: {...state, authentication: {...state.authentication, sessionEpoch: 2}},
      }),
    ).toBe(false);
  });

  it('blocks navigation after the focused route changes', () => {
    expect(
      shouldNavigateAfterUnlinkDismissal({
        ...base,
        navigationState: {index: 0, routes: [{key: 'list'}, {key: 'details'}]},
      }),
    ).toBe(false);
  });

  it('blocks navigation once the screen is unmounted or unfocused', () => {
    expect(
      shouldNavigateAfterUnlinkDismissal({...base, mounted: false}),
    ).toBe(false);
    expect(
      shouldNavigateAfterUnlinkDismissal({...base, isFocused: false}),
    ).toBe(false);
  });
});

describe('READY resume single-flight owner', () => {
  const epoch1 = {accountHash: 'account-a', sessionEpoch: 1, sessionScoped: true};
  const epoch2 = {accountHash: 'account-a', sessionEpoch: 2, sessionScoped: true};
  const otherAccount = {
    accountHash: 'account-b',
    sessionEpoch: 2,
    sessionScoped: true,
  };

  it('holds a same-session run in single-flight until it is released', () => {
    const owner = createVerusIdResumeOwner(epoch1);

    const token = owner.begin(epoch1);
    expect(token).not.toBeNull();
    // A second tap in the same session must not start a parallel resume.
    expect(owner.begin(epoch1)).toBeNull();

    owner.release(token);
    expect(owner.begin(epoch1)).not.toBeNull();
  });

  it('frees the gate synchronously when the session epoch changes', () => {
    const owner = createVerusIdResumeOwner(epoch1);
    const staleToken = owner.begin(epoch1);

    // The old run never settles; the epoch-change invalidation must release the
    // gate anyway so the new session can start.
    owner.invalidateForScope(epoch2);
    const newToken = owner.begin(epoch2);

    expect(newToken).not.toBeNull();
    expect(newToken).not.toBe(staleToken);
    // Stale completion stays inert and cannot clear the newer run's gate.
    expect(owner.isActive(staleToken)).toBe(false);
    expect(owner.release(staleToken)).toBe(false);
    expect(owner.begin(epoch2)).toBeNull();
  });

  it('frees the gate when the account changes', () => {
    const owner = createVerusIdResumeOwner(epoch1);
    owner.begin(epoch1);

    owner.invalidateForScope(otherAccount);

    expect(owner.begin(otherAccount)).not.toBeNull();
  });
});
