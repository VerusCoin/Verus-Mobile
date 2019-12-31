/**
 * Returns a server version object with the specified version passed in
 * @param {String} version_string Server version string, traditonally in the format 'ElectrumX x.x.x'
 * @param {Number} version_int (Optional) Version integer, in the format x.x. If omitted, return will be 'ElectrumX'
 */
const server_version_mock = function(version_string, version_int) {
  if (version_int == null) return 'ElectrumX'
  return [ version_string, version_int.toString() ]
}

module.exports = server_version_mock