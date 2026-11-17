import { ApiRequest } from 'verus-typescript-primitives';

export class GetCurrencyStateRequest extends ApiRequest {
  constructor(chain, currencyId, start, end, step) {
    super(chain, 'getcurrencystate');
    this.currencyId = currencyId;
    this.heights = `${start},${end},${step}`;
  }

  getParams() {
    return [this.currencyId, this.heights];
  }
}

// The caller already resolved the correct chain endpoint through the price route.
export const getCurrencyState = (
  endpoint,
  chain,
  currencyId,
  start,
  end,
  step,
) => endpoint.request(new GetCurrencyStateRequest(chain, currencyId, start, end, step));
