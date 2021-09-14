export class ServiceTemplate {
  constructor(id, api) {
    this.id = id
    this.api = api
  }
}

export class AccountBasedFintechApiTemplate extends ServiceTemplate {
  constructor(id, api) {
    super(id, api)
  }

  async authenticate(seed) {
    return await this.api.authenticate(seed)
  }

  async reset(payload) {
    return await this.api.reset(payload)
  }

  async createAccount(payload) {
    return await this.api.createAccount(payload)
  }

  async getAccount(payload) {
    return await this.api.getAccount(payload)
  }

  async listPaymentMethods(payload) {
    return await this.api.listPaymentMethods(payload)
  }

  async createPaymentMethod(payload) {
    return await this.api.createPaymentMethod(payload)
  }

  async deletePaymentMethod(payload) {
    return await this.api.deletePaymentMethod(payload)
  }

  async updateAccount(payload) {
    return await this.api.updateAccount(payload)
  }

  async uploadDocument(payload) {
    return await this.api.uploadDocument(payload)
  }

  async getTransferHistory(payload) {
    return await this.api.getTransferHistory(payload)
  }

  async getRates(payload) {
    return await this.api.getRates(payload)
  }

  async getBalances(payload) {
    return await this.api.getBalances(payload)
  }

  async sendTransaction(payload) {
    return await this.api.sendTransaction(payload)
  }

  async preflightTransaction(payload) {
    return await this.api.preflightTransaction(payload)
  }

  async getTransferInstructions(payload) {
    return await this.api.getTransferInstructions(payload)
  }
}