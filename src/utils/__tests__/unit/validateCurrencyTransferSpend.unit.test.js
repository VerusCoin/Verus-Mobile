const {
  validateCurrencyTransferSpendDeltas,
} = require('../../api/channels/vrpc/requests/validateCurrencyTransferSpend');

describe('currency transfer spend validation', () => {
  it('allows only the sent currency and the system fee currency to decrease', () => {
    expect(() =>
      validateCurrencyTransferSpendDeltas({
        currency: 'sent-currency',
        deltas: new Map([
          ['sent-currency', '-100'],
          ['system-currency', '-10'],
          ['change-currency', '25'],
        ]),
        systemId: 'system-currency',
      }),
    ).not.toThrow();
  });

  it('allows an explicitly selected non-native fee currency to decrease', () => {
    expect(() =>
      validateCurrencyTransferSpendDeltas({
        currency: 'sent-currency',
        deltas: new Map([
          ['sent-currency', '-100'],
          ['fee-currency', '-10'],
        ]),
        feeCurrency: 'fee-currency',
        systemId: 'system-currency',
      }),
    ).not.toThrow();
  });

  it('rejects a decrease in an unrelated currency', () => {
    expect(() =>
      validateCurrencyTransferSpendDeltas({
        currency: 'sent-currency',
        deltas: new Map([
          ['sent-currency', '-100'],
          ['system-currency', '-10'],
          ['unrelated-currency', '-1'],
        ]),
        systemId: 'system-currency',
      }),
    ).toThrow('Can only spend either fee currency or sent currency.');
  });
});
