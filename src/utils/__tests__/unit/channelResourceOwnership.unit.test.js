import {
  acquireSagaResource,
  completeSagaResourceDeletion,
  completeSagaResourceInitialization,
  failSagaResourceInitialization,
  getSagaResourceOwnerKey,
  getSagaResourceOwnerCount,
  releaseSagaResource,
  releaseSagaResourcesForAction,
} from '../../../sagas/channels/resourceOwnership';

describe('shared channel resource ownership', () => {
  it('makes B await A initialization and keeps the resource when A releases', async () => {
    const key = 'vrpc:success:shared';
    const ownerA = 'account-a:1:vrpc:VRSC';
    const ownerB = 'account-b:2:vrpc:VRSC';
    const acquiredA = acquireSagaResource(key, ownerA);
    const acquiredB = acquireSagaResource(key, ownerB);

    expect(acquiredA.shouldInitialize).toBe(true);
    expect(acquiredB.shouldInitialize).toBe(false);
    expect(acquiredB.initialization).toBe(acquiredA.initialization);

    const waitingB = acquiredB.initialization.promise;
    completeSagaResourceInitialization(key, acquiredA.initialization);
    await expect(waitingB).resolves.toBeUndefined();

    expect(releaseSagaResource(key, ownerA)).toMatchObject({
      released: true,
      shouldDelete: false,
    });
    expect(getSagaResourceOwnerCount(key)).toBe(1);
  });

  it('propagates a shared initialization rejection without a false B finish', async () => {
    const key = 'erc20:failure:shared';
    const ownerA = 'account-a:3:erc20:TOKEN';
    const ownerB = 'account-b:4:erc20:TOKEN';
    const acquiredA = acquireSagaResource(key, ownerA);
    const acquiredB = acquireSagaResource(key, ownerB);
    const failure = new Error('provider init failed');
    const waitingB = expect(acquiredB.initialization.promise).rejects.toBe(
      failure,
    );

    failSagaResourceInitialization(key, acquiredA.initialization, failure);
    await waitingB;
    expect(releaseSagaResource(key, ownerA).shouldDelete).toBe(false);
    expect(releaseSagaResource(key, ownerB).shouldDelete).toBe(false);

    const retry = acquireSagaResource(key, 'account-b:5:erc20:TOKEN');
    expect(retry.shouldInitialize).toBe(true);
  });

  it('makes a new owner wait for a last-owner delete before reinitializing', async () => {
    const key = 'erc20:delete-race:shared';
    const ownerA = 'account-a:6:erc20:TOKEN';
    const ownerB = 'account-b:7:erc20:TOKEN';
    const acquiredA = acquireSagaResource(key, ownerA);
    completeSagaResourceInitialization(key, acquiredA.initialization);

    const releasedA = releaseSagaResource(key, ownerA);
    expect(releasedA.shouldDelete).toBe(true);

    const acquiredBWhileDeleting = acquireSagaResource(key, ownerB);
    expect(acquiredBWhileDeleting.deletion).toBe(releasedA.deletion);
    expect(acquiredBWhileDeleting.shouldInitialize).toBe(false);

    const waitingB = acquiredBWhileDeleting.deletion.promise;
    completeSagaResourceDeletion(key, releasedA.deletion);
    await expect(waitingB).resolves.toBeUndefined();

    const acquiredBAfterDelete = acquireSagaResource(key, ownerB);
    expect(acquiredBAfterDelete.shouldInitialize).toBe(true);
  });

  it('uses the original resource epoch while publishing teardown in a newer epoch', () => {
    const owner = getSagaResourceOwnerKey({
      meta: {
        accountHash: 'account-a',
        ownerAccountHash: 'account-a',
        resourceOwnerAccountHash: 'account-a',
        resourceOwnerSessionEpoch: 8,
        sessionEpoch: 9,
      },
      payload: {chainTicker: 'VRSC'},
    }, 'vrpc');

    expect(owner).toBe('account-a:8:vrpc:VRSC');
  });

  it('releases older same-account epochs without releasing a newer session', () => {
    const key = 'vrpc:epoch-upgrade:shared';
    const oldOwner = 'account-a:8:vrpc:VRSC';
    const currentOwner = 'account-a:10:vrpc:VRSC';
    const old = acquireSagaResource(key, oldOwner);
    completeSagaResourceInitialization(key, old.initialization);
    acquireSagaResource(key, currentOwner);

    const released = releaseSagaResourcesForAction(key, {
      meta: {
        accountHash: 'account-a',
        resourceOwnerSessionEpoch: 9,
      },
      payload: {chainTicker: 'VRSC'},
    }, 'vrpc');

    expect(released).toMatchObject({released: true, shouldDelete: false});
    expect(getSagaResourceOwnerCount(key)).toBe(1);
  });
});
