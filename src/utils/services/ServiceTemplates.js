export class ServiceTemplate {
  constructor(id, displayInfo, api) {
    this.id = id
    this.displayInfo = displayInfo
    this.api = api
  }

  get displayTitle() {
    return this.displayInfo.title
  }

  get displayDescription() {
    return this.displayInfo.description
  }
}

export class AccountBasedFintechApiTemplate extends ServiceTemplate {
  constructor(id, displayInfo, api) {
    super(id, displayInfo, api)
  }

  async login(payload) {
    return await this.api.login(payload)
  }

  async logout(payload) {
    return await this.api.logout(payload)
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