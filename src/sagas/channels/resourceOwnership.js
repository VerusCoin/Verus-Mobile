const resourceOwners = new Map();

const createDeferredOp = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  // The first owner observes the native call directly; this prevents its
  // coordination promise from becoming an unhandled rejection when there are
  // no later owners waiting on it.
  promise.catch(() => {});
  return {promise, resolve, reject};
};

const createDeletionDeferred = resource => {
  const deletion = createDeferredOp();
  if (resource.pendingDeletionExpiryError != null) {
    deletion.expiredError = resource.pendingDeletionExpiryError;
    resource.pendingDeletionExpiryError = null;
    deletion.reject(deletion.expiredError);
  }
  return deletion;
};

export const getSagaResourceOwnerKey = (action, channel) => {
  const accountHash =
    action?.meta?.resourceOwnerAccountHash ||
    action?.meta?.ownerAccountHash ||
    action?.meta?.accountHash ||
    'legacy';
  const sessionEpoch =
    action?.meta?.resourceOwnerSessionEpoch ??
    action?.meta?.sessionEpoch ??
    'legacy';
  const chainTicker = action?.payload?.chainTicker || 'unknown';
  return `${accountHash}:${sessionEpoch}:${channel}:${chainTicker}`;
};

export const acquireSagaResource = (resourceKey, owner) => {
  let resource = resourceOwners.get(resourceKey);
  if (resource == null) {
    resource = {
      deletion: null,
      initialized: false,
      initialization: null,
      owners: new Set(),
      pendingDeletionExpiryError: null,
    };
    resourceOwners.set(resourceKey, resource);
  }

  const acquired = !resource.owners.has(owner);
  resource.owners.add(owner);
  let shouldInitialize = false;

  if (
    resource.deletion == null &&
    !resource.initialized &&
    resource.initialization == null
  ) {
    resource.initialization = createDeferredOp();
    shouldInitialize = true;
  }

  return {
    acquired,
    initialized: resource.initialized,
    initialization: resource.initialization,
    deletion: resource.deletion,
    shouldInitialize,
  };
};

export const completeSagaResourceInitialization = (
  resourceKey,
  initialization,
) => {
  initialization.resolve();
  const resource = resourceOwners.get(resourceKey);
  if (resource == null || resource.initialization !== initialization) {
    return {orphaned: true};
  }

  resource.initialization = null;
  resource.initialized = true;
  if (resource.owners.size === 0) {
    const deletion = createDeletionDeferred(resource);
    resource.initialized = false;
    resource.deletion = deletion;
    return {orphaned: false, shouldDelete: true, deletion};
  }

  resource.pendingDeletionExpiryError = null;

  return {orphaned: false, shouldDelete: false};
};

export const failSagaResourceInitialization = (
  resourceKey,
  initialization,
  error,
) => {
  initialization.reject(error);
  const resource = resourceOwners.get(resourceKey);
  if (resource == null || resource.initialization !== initialization) return;

  resource.initialization = null;
  resource.initialized = false;
  if (resource.owners.size === 0) resourceOwners.delete(resourceKey);
};

export const hasSagaResourceOwner = (resourceKey, owner) =>
  resourceOwners.get(resourceKey)?.owners.has(owner) === true;

export const releaseSagaResource = (resourceKey, owner) => {
  const resource = resourceOwners.get(resourceKey);
  if (resource == null) {
    return {released: false, shouldDelete: false};
  }

  if (!resource.owners.has(owner)) {
    return resumeOrAwaitOrphanedSagaResource(resourceKey, resource);
  }

  resource.owners.delete(owner);
  return finalizeSagaResourceRelease(resourceKey, resource);
};

const finalizeSagaResourceRelease = (resourceKey, resource) => {
  const shouldDelete =
    resource.owners.size === 0 &&
    resource.initialized &&
    resource.deletion == null;
  let deletion = resource.deletion;

  if (shouldDelete) {
    deletion = createDeletionDeferred(resource);
    resource.deletion = deletion;
    resource.initialized = false;
  } else if (
    resource.owners.size === 0 &&
    resource.initialization == null &&
    resource.deletion == null &&
    !resource.initialized
  ) {
    resourceOwners.delete(resourceKey);
  }
  return {released: true, shouldDelete, deletion};
};

const resumeOrAwaitOrphanedSagaResource = (resourceKey, resource) => {
  if (
    resource.owners.size !== 0 ||
    (
      resource.initialization == null &&
      resource.deletion == null &&
      !resource.initialized
    )
  ) {
    return {released: false, shouldDelete: false};
  }

  // A provider delete can fail after the last owner has already been removed.
  // Treat a later close as a cleanup retry, or as a waiter for the operation
  // that is still settling, instead of reporting a false successful close.
  return finalizeSagaResourceRelease(resourceKey, resource);
};

export const releaseSagaResourcesForAction = (
  resourceKey,
  action,
  channel,
) => {
  const resource = resourceOwners.get(resourceKey);
  if (resource == null) return {released: false, shouldDelete: false};

  const accountHash =
    action?.meta?.resourceOwnerAccountHash ||
    action?.meta?.ownerAccountHash ||
    action?.meta?.accountHash ||
    'legacy';
  const maximumEpoch = Number(
    action?.meta?.resourceOwnerSessionEpoch ??
      action?.meta?.sessionEpoch,
  );
  const chainTicker = action?.payload?.chainTicker || 'unknown';
  const prefix = `${accountHash}:`;
  const suffix = `:${channel}:${chainTicker}`;
  let released = false;

  for (const owner of [...resource.owners]) {
    if (!owner.startsWith(prefix) || !owner.endsWith(suffix)) continue;
    const epoch = Number(
      owner.slice(prefix.length, owner.length - suffix.length),
    );
    if (
      Number.isFinite(maximumEpoch) &&
      Number.isFinite(epoch) &&
      epoch > maximumEpoch
    ) {
      continue;
    }
    resource.owners.delete(owner);
    released = true;
  }

  return released
    ? finalizeSagaResourceRelease(resourceKey, resource)
    : resumeOrAwaitOrphanedSagaResource(resourceKey, resource);
};

export const completeSagaResourceDeletion = (resourceKey, deletion) => {
  deletion.resolve();
  const resource = resourceOwners.get(resourceKey);
  if (resource == null || resource.deletion !== deletion) return;

  resource.deletion = null;
  if (resource.owners.size === 0) resourceOwners.delete(resourceKey);
};

export const failSagaResourceDeletion = (
  resourceKey,
  deletion,
  error,
) => {
  deletion.reject(error);
  const resource = resourceOwners.get(resourceKey);
  if (resource == null || resource.deletion !== deletion) return;

  resource.deletion = null;
  // A failed delete means the shared provider resource is still presumed live.
  resource.initialized = true;
};

export const expireSagaResourceDeletion = (
  resourceKey,
  deletion,
  error,
) => {
  const resource = resourceOwners.get(resourceKey);
  if (resource == null) return false;
  let targetDeletion = deletion;

  if (targetDeletion == null && resource.deletion != null) {
    targetDeletion = resource.deletion;
  }
  if (
    targetDeletion == null &&
    resource.initialization != null &&
    resource.owners.size === 0
  ) {
    resource.pendingDeletionExpiryError = error;
    return true;
  }
  if (targetDeletion == null) return false;

  if (resource.deletion !== targetDeletion) return false;

  if (targetDeletion.expiredError == null) {
    targetDeletion.expiredError = error;
    targetDeletion.reject(error);
  }
  return true;
};

export const clearSagaResources = prefix => {
  for (const [resourceKey, resource] of resourceOwners.entries()) {
    if (!resourceKey.startsWith(prefix)) continue;

    resource.owners.clear();
    // An in-flight init/delete can complete after global cleanup. Retain its
    // lifecycle record so a new owner waits instead of racing that late side
    // effect; settled resources can be forgotten immediately.
    if (resource.initialization == null && resource.deletion == null) {
      resourceOwners.delete(resourceKey);
    }
  }
};

export const getSagaResourceOwnerCount = resourceKey =>
  resourceOwners.get(resourceKey)?.owners.size || 0;

export const awaitSagaResourceRelease = async resourceKey => {
  while (true) {
    const resource = resourceOwners.get(resourceKey);
    if (resource == null || resource.owners.size > 0) return;

    const pendingOperation = resource.deletion || resource.initialization;
    if (pendingOperation == null) return;
    await pendingOperation.promise;
  }
};

export const awaitSagaResourceSettlements = async prefix => {
  while (true) {
    const pending = [];
    for (const [resourceKey, resource] of resourceOwners.entries()) {
      if (!resourceKey.startsWith(prefix)) continue;
      if (resource.initialization != null) {
        pending.push(resource.initialization.promise);
      }
      if (resource.deletion?.expiredError != null) {
        throw resource.deletion.expiredError;
      }
      if (resource.deletion != null) pending.push(resource.deletion.promise);
    }

    if (pending.length === 0) return;
    await Promise.allSettled(pending);
  }
};
