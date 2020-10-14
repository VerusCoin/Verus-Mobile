class ApiException extends Error {
  constructor(message, data, chainTicker, channel, code = -1, header = {}) {
    super(message)
    this.message = message
    this.data = data
    this.channel = channel
    this.code = code
    this.chainTicker = chainTicker
    this.header = header
  
    if ("captureStackTrace" in Error) Error.captureStackTrace(this, ApiException);
    else this.stack = new Error().stack;
  }
}

ApiException.prototype.name = "ApiException"

export default ApiException