import {
  PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY,
  SecureStorage,
} from '../keychain/secureStore';

export class PasswordMigrationRecoveryRequiredError extends Error {
  constructor(message = 'Password migration recovery must complete before modifying protected storage') {
    super(message);
    this.name = 'PasswordMigrationRecoveryRequiredError';
    this.code = 'PASSWORD_MIGRATION_RECOVERY_REQUIRED';
  }
}

const assertProtectedStorageIsWritable = async () => {
  const storedJournal = await SecureStorage.getItem(
    PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY,
  );
  if (storedJournal == null) return;

  try {
    JSON.parse(storedJournal);
  } catch (_) {
    throw new PasswordMigrationRecoveryRequiredError(
      'Invalid password migration journal requires recovery',
    );
  }

  // Even a committed journal blocks mutations until explicit recovery removes
  // it. This keeps post-commit Redux/session finalization and cleanup inside a
  // single fail-closed boundary.
  throw new PasswordMigrationRecoveryRequiredError();
};

const createStorageQueue = () => {
  let queue = Promise.resolve();

  const enqueue = operation => {
    const queued = queue.then(operation, operation);
    queue = queued.catch(() => {});
    return queued;
  };

  return {
    enqueue,
    enqueueProtectedWrite: operation =>
      enqueue(async () => {
        await assertProtectedStorageIsWritable();
        return operation();
      }),
  };
};

const userStorageQueue = createStorageQueue();
const personalStorageQueue = createStorageQueue();
const serviceStorageQueue = createStorageQueue();

export const queueUserStorageWrite = userStorageQueue.enqueueProtectedWrite;
export const queuePersonalStorageWrite = personalStorageQueue.enqueueProtectedWrite;
export const queueServiceStorageWrite = serviceStorageQueue.enqueueProtectedWrite;

/**
 * Acquires every password-protected root in a fixed order. Single-root writers
 * never acquire another queue, so the ordering cannot form a lock cycle.
 */
export const queuePasswordProtectedStorageMigration = operation =>
  userStorageQueue.enqueue(() =>
    personalStorageQueue.enqueue(() =>
      serviceStorageQueue.enqueue(operation),
    ),
  );
