export const PROCESSED_PAYMENT_REQUEST = "PAYMENT_REQUEST"

export class ProcessedQr {
  constructor (raw, type) {
    this.raw = raw
    this.type = type
  }
}

export class ProcessedPaymentRequest extends ProcessedQr {
  constructor (raw, coinObj, address, amount, note) {
    super(raw, PROCESSED_PAYMENT_REQUEST)
    this.coinObj = coinObj
    this.address = address
    this.amount = amount
    this.note = note
  }

  toJson() {
    return {
      coinObj: this.coinObj,
      address: this.address,
      amount: this.amount,
      note: this.note
    }
  }
}