function formatResponse(id, result, error) {
  return {
    id,
    result,
    error,
    jsonrpc: "2.0"
  }
}

module.exports = formatResponse