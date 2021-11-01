const fees = require('./fees');
const dpowCoins = require('./dpow');

// TODO: add a script to sync electrum severs list from https://github.com/jl777/coins/tree/master/electrums

let _electrumServers = {
  lumber: [
    'electrum1.lumberscout.io:10001:tcp'
  ],
  testnet: [
    'tn.not.fyi:55002:ssl',
    'testnet.hsmiths.com:53012:ssl',
  ],
  dion: [
    'electrum1.cipig.net:10030:tcp',
    'electrum2.cipig.net:10030:tcp',
    'electrum3.cipig.net:10030:tcp',
  ],
  ptx: [
    'electrum1.patenttx.com:18081:tcp',
    'electrum2.patenttx.com:18081:tcp',
  ],
  zilla: [
    'electrum1.cipig.net:10028:tcp',
    'electrum2.cipig.net:10028:tcp',
  ],
  prlpay: [
    'electrum1.prlpay.com:9681:tcp',
    'electrum2.prlpay.com:9681:tcp',
  ],
  koin: [
    'dalian.koinon.cloud:50001:tcp',
    'sumba.koinon.cloud:50001:tcp',
  ],
  pgt: [
    'agama.komodo.build:10002:tcp',
    'agama2.komodo.build:10002:tcp',
  ],
  kv: [
    'electrum1.cipig.net:10016:tcp',
    'electrum2.cipig.net:10016:tcp',
  ],
  bntn: [
    'electrum1.cipig.net:10026:tcp',
    'electrum2.cipig.net:10026:tcp',
  ],
  eql: [
    '159.65.91.235:10801:tcp',
    '167.99.204.42:10801:tcp',
  ],
  oot: [
    'electrum1.utrum.io:10088:tcp',
    'electrum2.utrum.io:10088:tcp',
  ],
  coqui: [
    'electrum1.cipig.net:10011:tcp',
    'electrum2.cipig.net:10011:tcp',
  ],
  chain: [
    'electrum1.cipig.net:10032:tcp',
    'electrum2.cipig.net:10032:tcp',
    'electrum3.cipig.net:10032:tcp',
  ],
  kmdice: [
    'electrum1.cipig.net:10031:tcp',
    'electrum2.cipig.net:10031:tcp',
    'electrum3.cipig.net:10031:tcp',
  ],
  glxt: [
    'electrum1.glx.co:60012:tcp',
    'electrum2.glx.co:60012:tcp',
  ],
  revs: [
    'electrum1.cipig.net:10003:tcp',
    'electrum2.cipig.net:10003:tcp',
  ],
  supernet: [
    'electrum1.cipig.net:10005:tcp',
    'electrum2.cipig.net:10005:tcp',
  ],
  dex: [
    'electrum1.cipig.net:10006:tcp',
    'electrum2.cipig.net:10006:tcp',
  ],
  bots: [
    'electrum1.cipig.net:10007:tcp',
    'electrum2.cipig.net:10007:tcp',
  ],
  crypto: [
    'electrum1.cipig.net:10008:tcp',
    'electrum2.cipig.net:10008:tcp',
  ],
  /*dnr: [
    '144.202.95.223:50001:tcp',
    '45.77.137.111:50001:tcp',
  ],*/
  hodl: [
    'electrum1.cipig.net:10009:tcp',
    'electrum2.cipig.net:10009:tcp',
  ],
  pangea: [
    'electrum1.cipig.net:10010:tcp',
    'electrum2.cipig.net:10010:tcp',
  ],
  bet: [
    'electrum1.cipig.net:10012:tcp',
    'electrum2.cipig.net:10012:tcp',
  ],
  mshark: [
    'electrum1.cipig.net:10013:tcp',
    'electrum2.cipig.net:10013:tcp',
  ],
  wlc: [
    'electrum1.cipig.net:10014:tcp',
    'electrum2.cipig.net:10014:tcp',
  ],
  mgw: [
    'electrum1.cipig.net:10015:tcp',
    'electrum2.cipig.net:10015:tcp',
  ],
  btch: [
    'electrum1.cipig.net:10020:tcp',
    'electrum2.cipig.net:10020:tcp',
  ],
  beer: [
    'electrum1.cipig.net:10022:tcp',
    'electrum2.cipig.net:10022:tcp',
  ],
  pizza: [
    'electrum1.cipig.net:10024:tcp',
    'electrum2.cipig.net:10024:tcp',
  ],
  ninja: [
    'electrum1.fund.ninja:50001:tcp',
    'electrum2.fund.ninja:50001:tcp',
  ],
  jumblr: [
    'electrum1.cipig.net:10004:tcp',
    'electrum2.cipig.net:10004:tcp',
  ],
  kmd: [
    'electrum1.cipig.net:10001:tcp',
    'electrum2.cipig.net:10001:tcp',
  ],
  doge: [
    'electrum1.cipig.net:10060:tcp',
    'electrum2.cipig.net:10060:tcp',
  ],
  via: [
    'viax1.bitops.me:50001:tcp',
    'viax2.bitops.me:50001:tcp',
    'viax3.bitops.me:50001:tcp',
    'server.vialectrum.org:50001:tcp',
    'server2.vialectrum.org:50001:tcp',
  ],
  vtc: [
    'fr1.vtconline.org:55001:tcp',
    'uk1.vtconline.org:55001:tcp',
  ],
  nmc: [
    'electrum1.cipig.net:10066:tcp',
    'electrum2.cipig.net:10066:tcp',
  ],
  mona: [
    'electrumx1.monacoin.nl:50001:tcp',
    'electrumx2.monacoin.nl:50001:tcp',
    'electrumx1.monacoin.ninja:50001:tcp',
    'electrumx2.monacoin.ninja:50001:tcp',
  ],
  ltc: [
    'electrum-ltc.bysh.me:50001:tcp',
    'node.ispol.sk:50003:tcp',
    'ltc01.knas.systems:50003:tcp',
    'ltc.rentonisk.com:50002:ssl',
    'electrum.ltc.xurious.com:50001:tcp',
    'backup.electrum-ltc.org:50001:tcp',
  ],
  fair: [
    'electrum1.cipig.net:10063:tcp',
    'electrum2.cipig.net:10063:tcp',
  ],
  dgb: [
    'electrum1.cipig.net:10059:tcp',
    'electrum2.cipig.net:10059:tcp',
  ],
  dash: [
    'electrum1.cipig.net:10061:tcp',
    'electrum2.cipig.net:10061:tcp',
  ],
  crw: [
    'sgp-crwseed.crowndns.info:50001:tcp',
    'blr-crwseed.crowndns.info:50001:tcp',
    'sfo-crwseed.crowndns.info:50001:tcp',
    'nyc-crwseed.crowndns.info:50001:tcp',
    'ams-crwseed.crowndns.info:50001:tcp',
    'tor-crwseed.crowndns.info:50001:tcp',
    'lon-crwseed.crowndns.info:50001:tcp',
    'fra-crwseed.crowndns.info:50001:tcp',
  ],
  btc: [
    'electrum1.cipig.net:10000:tcp',
    'electrum2.cipig.net:10000:tcp',
    'electrum3.cipig.net:10000:tcp',
  ],
  btg: [
    'electrumx-eu.bitcoingold.org:50001:tcp',
    'electrumx-us.bitcoingold.org:50001:tcp',
  ],
  blk: [
    'electrum1.cipig.net:10054:tcp',
    'electrum2.cipig.net:10054:tcp',
    'electrum3.cipig.net:10054:tcp',
  ],
  sib: [
    'electrum1.cipig.net:10050:tcp',
    'electrum2.cipig.net:10050:tcp',
  ],
  bch: [
    'bch.imaginary.cash:50001:tcp',
    'wallet.satoshiscoffeehouse.com:50001:tcp',
  ],
  /*arg: [
    'electrum1.cipig.net:10068:tcp',
    'electrum2.cipig.net:10068:tcp',
    'electrum3.cipig.net:10068:tcp',
  ],*/
  chips: [
    'electrum1.cipig.net:10053:tcp',
    'electrum2.cipig.net:10053:tcp',
  ],
  zec: [
    'electrum1.cipig.net:10058:tcp',
    'electrum2.cipig.net:10058:tcp',
  ],
  hush: [
    'electrum1.cipig.net:10064:tcp',
    'electrum2.cipig.net:10064:tcp',
  ],
  sng: [
    'electrumsvr.snowgem.org:50001:tcp',
    'electrumsvr2.snowgem.org:50001:tcp',
    'electrumsvr.snowgem.org:50002:ssl',
    'electrumsvr2.snowgem.org:50002:ssl',
  ],
  xmy: [
    'cetus.cryptap.us:50004:ssl',
    'kraken.cryptap.us:50004:ssl',
  ],
  zcl: [
    'electrum1.cipig.net:10055:tcp',
    'electrum2.cipig.net:10055:tcp',
  ],
  hodlc: [
    'hodl.amit.systems:17989:tcp',
    'hodl2.amit.systems:17898:tcp',
  ],
  suqa: [
    'electrum1.suqa.org:12159:tcp',
    'electrum2.suqa.org:12159:tcp',
  ],
  btx: [
    'ele1.bitcore.cc:50001:tcp',
    'ele2.bitcore.cc:50001:tcp',
    'ele3.bitcore.cc:50001:tcp',
    'ele4.bitcore.cc:50001:tcp',
  ],
  btcz: [
    'electrum1.cipig.net:10056:tcp',
    'electrum2.cipig.net:10056:tcp',
  ],
  grs: [
    'electrum1.groestlcoin.org:50002:ssl',
    'electrum2.groestlcoin.org:50002:ssl',
    'electrum6.groestlcoin.org:50002:ssl',
    'electrum7.groestlcoin.org:50002:ssl',
    'electrum8.groestlcoin.org:50002:ssl',
    'electrum9.groestlcoin.org:50002:ssl',
    'electrum10.groestlcoin.org:50002:ssl',
  ],
  qtum: [
    's1.qtum.info:50001:tcp',
    's2.qtum.info:50001:tcp',
  ],
  btcp: [
    'electrum.btcprivate.org:5222:tcp',
    'electrum2.btcprivate.org:5222:tcp',
  ],
  emc2: [
    'electrum1.cipig.net:10062:tcp',
    'electrum2.cipig.net:10062:tcp',
  ],
  /*bcbc: [
    'bsmn0.cleanblockchain.io:50001:tcp',
    'bsmn1.cleanblockchain.io:50001:tcp',
  ],*/
  game: [
    'electrum1.cipig.net:10072:tcp',
    'electrum2.cipig.net:10072:tcp',
  ],
  fjc: [
    'electrumx1.fujicoin.org:50001:tcp',
    'electrumx2.fujicoin.org:50001:tcp',
    'electrumx3.fujicoin.org:50001:tcp',
    'electrumx1.fujicoin.org:50002:ssl',
    'electrumx2.fujicoin.org:50002:ssl',
    'electrumx3.fujicoin.org:50002:ssl',
  ],
  ftc: [
    'electrumx-ch-1.feathercoin.ch:50001:tcp',
    'electrumx-de-2.feathercoin.ch:50001:tcp',
    'electrumx-gb-1.feathercoin.network:50001:tcp',
    'electrumx-gb-2.feathercoin.network:50001:tcp',
  ],
  mnx: [
    'electrum1.cipig.net:10079:tcp',
    'electrum2.cipig.net:10079:tcp',
    'electrum3.cipig.net:10079:tcp',
  ],
  ccl: [
    'electrum1.cipig.net:10029:tcp',
    'electrum2.cipig.net:10029:tcp',
    'electrum3.cipig.net:10029:tcp',
  ],
  vrsc: [
    'el0.verus.io:17486:ssl',
    'el1.verus.io:17486:ssl',
    'el2.verus.io:17486:ssl',
    'el3.verus.io:17486:ssl',
  ],
  polis: [
    'electrum1.cipig.net:10075:tcp',
    'electrum2.cipig.net:10075:tcp',
    'electrum3.cipig.net:10075:tcp',
  ],
  xzc: [
    'electrumx01.zcoin.io:50001:tcp',
    'electrumx02.zcoin.io:50001:tcp',
    '45.63.92.224:50001:tcp',
    '45.77.67.235:50001:tcp',
  ],
  // unverified to work
  // src: CryptoWallet.si
  arco: [
    'node1.cryptowallet.si:5095:tcp',
    'node2.cryptowallet.si:5095:tcp',
    'electrum1.aquariuscoin.com:5095:tcp',
    'electrum2.aquariuscoin.com:5095:tcp',
    'electrum3.aquariuscoin.com:5095:tcp',
  ],
  lana: [
    'node1.cryptowallet.si:5097:tcp',
    'node2.cryptowallet.si:5097:tcp',
    'electrum1.lanacoin.com:5097:tcp',
    'electrum2.lanacoin.com:5097:tcp',
    'electrum3.lanacoin.com:5097:tcp',
  ],
  neva: [
    'node1.cryptowallet.si:5096:tcp',
    'node2.cryptowallet.si:5096:tcp',
    'electrum1.nevacoin.net:5096:tcp',
    'electrum2.nevacoin.net:5096:tcp',
    'electrum3.nevacoin.net:5096:tcp',
  ],
  netko: [
    'node1.cryptowallet.si:5108:tcp',
    'node2.cryptowallet.si:5108:tcp',
  ],
  taj: [
    'node1.cryptowallet.si:5098:tcp',
    'node2.cryptowallet.si:5098:tcp',
    'electrum1.tajcoin.tech:5098:tcp',
    'electrum2.tajcoin.tech:5098:tcp',
  ],
  xvg: [
    '46.163.118.201:50002:ssl',
  ],
  cesc: [
    'electrum1.cryptoescudo.org:50001:tcp',
    'electrum2.cryptoescudo.org:50001:tcp',
    'electrum3.cryptoescudo.org:50001:tcp',
  ],
  mue: [
    '181.214.148.6:50001:tcp',
    '37.59.209.76:50001:tcp',
  ],
  uno: [
    'electrum1.unobtanium.uno:50006:ssl',
    'electrum2.unobtanium.uno:50006:ssl',
    'nigeria1.unobtanium.uno:50006:ssl',
    'nigeria2.unobtanium.uno:50006:ssl',
  ],
  koto: [
    'kotocoin.info:50001:tcp',
    'kotocoin.info:50002:ssl',
    'fr3.kotocoin.info:50002:ssl',
    'fr.kotocoin.info:50001:tcp',
    'fr.kotocoin.info:50002:ssl',
    'electrum.okoto.xyz:50002:ssl',
    'fr3.kotocoin.info:50001:tcp',
    'electrumx-koto.tamami-foundation.org:50002:ssl',
    'electrum.kotocoin.info:50002:ssl',
    'electrum.kotocoin.info:50001:tcp',
    'electrumx-koto.tamami-foundation.org:50001:tcp',
  ],
  pak: [
    '108.61.246.159:50001:tcp',
  ],
  cpc: [
    'electrum1.capricoin.org:50011:tcp',
    'electrum2.capricoin.org:50011:tcp',
    'electrum1.capricoin.org:50012:ssl',
    'electrum2.capricoin.org:50012:ssl',
  ],
  rap: [
    'electrum2.our-rapture.com:50001:tcp',
    '194.87.145.250:50016:ssl',
  ],
  smart: [
    'electrum1.smartcash.cc:50001:tcp',
    'electrum2.smartcash.cc:50001:tcp',
    'electrum3.smartcash.cc:50001:tcp',
    'electrum4.smartcash.cc:50001:tcp',
  ],
  pac: [
    'electrum.paccoin.io:50001:tcp',
    'electro-pac.paccoin.io:50001:tcp',
  ],
  stak: [
    'ex001-stak.qxu.io:50001:tcp',
    'ex002-stak.qxu.io:50001:tcp',
    'electrumx.straks.info:50001:tcp',
  ],
  // src: altcoin wallet
  goa: [ // goacoin
    '194.87.145.250:50002:ssl',
  ],
  inn: [ // innova
    '194.87.145.250:50004:ssl',
  ],
  tzc: [ // trezarcoin
    '194.87.145.250:50018:ssl',
  ],
  eny: [ // emergencycoin
    '194.87.145.250:50028:ssl',
  ],
  sbr: [ // sobercoin
    '194.87.145.250:50030:ssl',
  ],
  onix: [ // onixcoin
    '159.203.80.31:23000:tcp',
  ],
  arepa: [ // arepacoin
    '107.150.6.159:50001:tcp',
    '107.150.6.159:50002:tcp',
  ],
  bitb: [
    'electrum1.bitbean.org:5088:tcp',
  ],
  axe: [
    '198.143.186.117:50001:tcp',
    '198.143.186.117:50002:ssl',
  ],
  grlc: [
    'electrum.garli.co.in:50001:tcp',
    'electrum.garli.co.in:50002:ssl',
  ],
  ufo: [
    'electrumx1.ufobject.com:50001:tcp',
    'electrumx2.ufobject.com:50001:tcp',
    'electrumx3.ufobject.com:50001:tcp',
    'electrumx4.ufobject.com:50001:tcp',
    'electrumx5.ufobject.com:50001:tcp',
  ],
  lcc: [
    'electrum1.litecoinca.sh:50010:ssl',
    'electrum2.litecoinca.sh:50001:tcp',
    'electrum2.litecoinca.sh:50010:ssl',
  ],
  kreds: [
    '199.247.21.0:50001:tcp',
  ],
  mgnx: [
    '45.76.37.100:50001:tcp',
    '95.179.177.253:50001:tcp',
  ],
  bzc: [
    '194.87.145.250:50012:ssl',
    '194.87.145.250:50020:ssl',
  ],
  aywa: [
    'electrum1.getaywa.org:50001:tcp',
    'electrum2.getaywa.org:50001:tcp',
  ],
  xbc: [
    'electrumx1.bitcoinplus.org:50001:tcp',
    'electrumx2.bitcoinplus.org:50001:tcp',
  ],
  bbk: [
    '194.87.145.250:50050:ssl',
  ],
  uis: [
    '194.87.145.250:50040:ssl',
  ],
  ksb: [
    '51.158.74.137:50001:tcp',
    'electrum.komodochainz.info:50041:tcp',
  ],
  our: [
    '51.158.74.137:50002:tcp',
    'electrum.komodochainz.info:50042:tcp',
  ],
  rick: [
    'electrum1.cipig.net:10017:tcp',
    'electrum2.cipig.net:10017:tcp',
    'electrum3.cipig.net:10017:tcp',
  ],
  morty: [
    'electrum1.cipig.net:10018:tcp',
    'electrum2.cipig.net:10018:tcp',
    'electrum3.cipig.net:10018:tcp',
  ],
  vote2019: [
    'electrum1.cipig.net:10036:tcp',
    'electrum2.cipig.net:10036:tcp',
    'electrum3.cipig.net:10036:tcp',
  ],
  zexo: [
    'electrum1.cipig.net:10035:tcp',
    'electrum2.cipig.net:10035:tcp',
    'electrum3.cipig.net:10035:tcp',
  ],
  rfox: [
    'electrum1.cipig.net:10034:tcp',
    'electrum2.cipig.net:10034:tcp',
    'electrum3.cipig.net:10034:tcp',
  ],
  labs: [
    'electrum1.cipig.net:10019:tcp',
    'electrum2.cipig.net:10019:tcp',
    'electrum3.cipig.net:10019:tcp',
  ],
};

let electrumServers = {};

for (let key in _electrumServers) {
  electrumServers[key] = {
    txfee: fees[key] ? fees[key] : 0,
    serverList: _electrumServers[key],
  };

  if (dpowCoins.indexOf(key.toUpperCase()) > -1) {
    electrumServers[key].dpowConfs = true;
  }
}

const proxyServersHttps = ['el0.verus.io', 'el1.verus.io', 'el2.verus.io','el3.verus.io'];
const proxyServersHttp = ['94.130.225.86:80', '94.130.225.86:80'];

module.exports = {
  proxyServersHttps,
  proxyServersHttp,
  electrumServers,
};
