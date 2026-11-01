import {AppState} from 'react-native';

const BATCH_COMMANDS = new Set(['getaddressbalance', 'getaddressdeltas', 'getaddressmempool']);
const MAX_BATCH_SIZE = 20;
const BATCH_RETRY_AFTER_MS = 5 * 60 * 1000;
const FAST_REJECTION_MS = 5000;

// Capability failures belong to the server, not a chain or connection. Keep
// them across endpoint recreation, but never persist them between app sessions.
const disabledUntil = new Map();
let clockStarted = false;
let elapsedAppTime = 0;
let activeSince = null;

const appTime = () => {
  if (!clockStarted) {
    clockStarted = true;
    activeSince =
      AppState.currentState === 'background' || AppState.currentState === 'inactive'
        ? null
        : Date.now();

    AppState.addEventListener('change', state => {
      const now = Date.now();
      if (activeSince != null) elapsedAppTime += Math.max(0, now - activeSince);
      activeSince = state === 'active' ? now : null;
    });
  }

  return elapsedAppTime + (activeSince == null ? 0 : Math.max(0, Date.now() - activeSince));
};

const rejectsBatching = (error, elapsed) => {
  if (!error) return false;

  const code = Number(error.code);
  const message = String(error.message || '');
  // The SDK folds axios HTTP failures into -32603 with the status in the
  // message. Admission limits and timeouts do not indicate batch support.
  if (
    code === 429 || code === 503 ||
    /status code (429|503)|timeout|timed out|abort|cancel/i.test(message)
  ) return false;

  // Old v2 servers return -32602 for array bodies; servers configured with
  // batching disabled return -32600. Only examine whole-envelope errors.
  if ([-32600, -32601, -32602, 400, 404, 405, 415, 422].includes(code)) return true;

  // A fast transport/protocol failure can be an older proxy rejecting arrays.
  // A false negative is retried after five minutes of active app time.
  return elapsed <= FAST_REJECTION_MS && (code === -32603 || error instanceof Error);
};

export default class VrpcRequestBatcher {
  queue = [];
  timer = null;
  flushing = Promise.resolve();

  constructor(endpoint, sendRequest, delayMs) {
    this.endpoint = endpoint.replace(/\/+$/, '');
    this.sendRequest = sendRequest;
    this.delayMs = delayMs;
  }

  canBatch(command) {
    if (!BATCH_COMMANDS.has(command)) return false;

    const retryAt = disabledUntil.get(this.endpoint);
    if (retryAt == null) return true;
    if (appTime() < retryAt) return false;

    disabledUntil.delete(this.endpoint);
    return true;
  }

  request(req) {
    if (!this.canBatch(req.cmd)) return this.sendRequest(req);

    return new Promise((resolve, reject) => {
      this.queue.push({req, resolve, reject});
      if (this.timer != null) return;

      this.timer = setTimeout(() => {
        const entries = this.queue;
        this.queue = [];
        this.timer = null;
        // Serialize chunks/windows to respect the proxy's envelope admission
        // limits and notice a rejection before sending the next batch.
        this.flushing = this.flushing.then(() => this.flush(entries)).catch(error => {
          entries.forEach(entry => entry.reject(error));
        });
      }, this.delayMs);
    });
  }

  async sendSingle(entry) {
    try {
      entry.resolve(await this.sendRequest(entry.req));
    } catch (error) {
      entry.reject(error);
    }
  }

  async sendSingles(entries) {
    // Batching-disabled servers can still enforce envelope admission limits.
    // Replaying a rejected batch concurrently would turn it into a request burst.
    for (const entry of entries) {
      await this.sendSingle(entry);
    }
  }

  async flush(entries) {
    for (let start = 0; start < entries.length; start += MAX_BATCH_SIZE) {
      const chunk = entries.slice(start, start + MAX_BATCH_SIZE);
      if (chunk.length === 1 || !this.canBatch(chunk[0].req.cmd)) {
        await this.sendSingles(chunk);
        continue;
      }

      const started = Date.now();
      let response;
      let thrownError;
      try {
        response = await this.sendRequest(chunk.map(entry => entry.req));
      } catch (error) {
        thrownError = error;
      }

      if (Array.isArray(response) && response.length === chunk.length &&
          response.every(item => item != null && typeof item === 'object' &&
            !Array.isArray(item) && ('result' in item || 'error' in item))) {
        // The batching proxy preserves order and omits JSON-RPC IDs.
        chunk.forEach((entry, index) => entry.resolve(response[index]));
        continue;
      }

      const error = thrownError || (response && response.error) ||
        new Error('Invalid VRPC batch response');
      if (rejectsBatching(error, Date.now() - started)) {
        disabledUntil.set(this.endpoint, appTime() + BATCH_RETRY_AFTER_MS);
        await this.sendSingles(chunk);
      } else {
        chunk.forEach(entry => {
          if (thrownError || !response || !response.error) entry.reject(error);
          else entry.resolve(response);
        });
      }
    }
  }
}
