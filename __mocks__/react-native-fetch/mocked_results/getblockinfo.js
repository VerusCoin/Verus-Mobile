const gotten_blocks = require('./blockchain_data').gotten_blocks

/**
 * The mock for getblockinfo. This function searches through the mock block list, and returns a block info object if it is found.
 * @param {Integer} height The blockheight of the block to get. If found in the mock block list, its info will be returned.
 */
const getblockinfo_mock = function(height) {
  if (Number(height) < 0 || Number(height) % 1 != 0) return {"code":1,"message":`${height} should be a non-negative integer`}
  if (gotten_blocks.hasOwnProperty(height)) return gotten_blocks[height]

  return {"code":1,"message":`height ${height} out of range`}
}

module.exports = getblockinfo_mock
