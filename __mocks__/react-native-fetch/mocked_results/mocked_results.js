const getbalance_mock = require("./getbalance.js")
const getblockinfo_mock = require("./getblockinfo.js")
const getcurrentblock_mock = require("./getcurrentblock.js")
const getmerkle_mock = require("./getmerkle.js")
const gettransaction_mock = require("./gettransaction.js")
const listtransactions_mock = require("./listtransactions.js")
const listunspent_mock = require("./listunspent.js")
const server_version_mock = require("./server_version.js")

module.exports = {
  getbalance: getbalance_mock,
  getblockinfo: getblockinfo_mock,
  getcurrentblock: getcurrentblock_mock,
  getmerkle: getmerkle_mock,
  gettransaction: gettransaction_mock,
  listtransactions: listtransactions_mock,
  listunspent: listunspent_mock,
  server_version: server_version_mock
}