import {AppState} from 'react-native';
import {vrpcErrorResponse} from './vrpcRequestMany';

const BATCH_COMMANDS = new Set(['getaddressbalance', 'getaddressdeltas', 'getaddressmempool']);
const REFRESH_COMMANDS = new Set([...BATCH_COMMANDS, 'getinfo']);
// Registration supplies these read groups explicitly. They never enter the
// collection window used by ordinary wallet refresh requests.
const EXPLICIT_COMMANDS = new Set([
  ...REFRESH_COMMANDS,
  'getcurrency',
  'getblock',
  'getrawtransaction',
  'gettxout',
  'getidentity',
]);
const MAX_BATCH_SIZE = 20;
const BATCH_ITEMS_PER_SECOND = 80;
const BATCH_RETRY_AFTER_MS = 5 * 60 * 1000;
const FAST_REJECTION_MS = 5000;

// The server charges each RPC item, even when several share one HTTP envelope.
// Share pacing across chains, separate requestMany calls and recreated clients.
// Leave some room below the server's 100-item rate for ordinary single requests.
const nextSendAt = new Map();

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

  supportsRefresh(command) {
    return REFRESH_COMMANDS.has(command);
  }

  supportsExplicit(command) {
    return EXPLICIT_COMMANDS.has(command);
  }

  canBatch(command, explicit = false) {
    if (!(explicit ? EXPLICIT_COMMANDS : BATCH_COMMANDS).has(command)) return false;

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
        this.scheduleFlush(entries);
      }, this.delayMs);
    });
  }

  /** Queue a known read group without a collection delay, including waiting reads. */
  requestMany(requests) {
    const entries = this.queue;
    this.queue = [];
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = null;

    const responses = requests.map(req => {
      if (!this.supportsExplicit(req.cmd)) {
        return vrpcErrorResponse({code: -32601, message: `Unsupported batch method: ${req.cmd}`});
      }

      return new Promise((resolve, reject) => {
        entries.push({req, resolve, reject});
      }).catch(vrpcErrorResponse);
    });

    this.scheduleFlush(entries);
    return Promise.all(responses);
  }

  scheduleFlush(entries) {
    if (entries.length === 0) return;

    // Serialize envelopes to respect admission limits and observe a capability
    // rejection before sending the next chunk. No collection timer is involved.
    this.flushing = this.flushing.then(() => this.flush(entries)).catch(error => {
      entries.forEach(entry => entry.reject(error));
    });
  }

  async waitForSend(itemCount) {
    // Pace starts, so time spent receiving the previous response already counts
    // toward the interval. An idle server can always receive its first batch now.
    let waitMs;
    while ((waitMs = (nextSendAt.get(this.endpoint) || 0) - Date.now()) > 0) {
      await new Promise(resolve => setTimeout(resolve, waitMs));
      // Another client for this server may have sent while we were waiting.
      // Recheck before reserving the next start, including after app suspension.
    }

    nextSendAt.set(
      this.endpoint,
      Date.now() + Math.ceil(itemCount * 1000 / BATCH_ITEMS_PER_SECOND),
    );
  }

  async sendSingle(entry) {
    try {
      // Keep explicit single reads and unsupported-batch retries on the same
      // schedule; splitting an envelope must not bypass its item-rate limit.
      await this.waitForSend(1);
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
      if (chunk.length === 1 || !this.canBatch(chunk[0].req.cmd, true)) {
        await this.sendSingles(chunk);
        continue;
      }

      await this.waitForSend(chunk.length);
      // Capability detection measures the network request, excluding queue time.
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
