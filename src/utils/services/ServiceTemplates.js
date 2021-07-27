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

  async updateAccount(payload) {
    return await this.api.updateAccount(payload)
  }

  async uploadDocument(payload) {
    return await this.api.uploadDocument(payload)
  }

  async getTransactions(payload) {
    return await this.api.getTransactions(payload)
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
}