// File to make certain libraries compatible with react-native.

// To future devs: IF YOU EXPERIENCE PROBLEMS PARSING HTTP/HTTPS REQUEST RESULTS THE FOLLOWING
// IS MOST LIKELY WHY:

// FileReader.prototype.readAsArrayBuffer has been overriden on Android
// to interpret "data:application/octet-stream" as "data:application/json", due to 
// the data:application/json being simple ignored on android for ETH/ERC20 https calls.

const { Platform } = require('react-native');

if (typeof __dirname === 'undefined') global.__dirname = '/'
if (typeof __filename === 'undefined') global.__filename = ''
if (typeof process === 'undefined') {
  global.process = require('process')
} else {
  const bProcess = require('process')
  for (var p in bProcess) {
    if (!(p in process)) {
      process[p] = bProcess[p]
    }
  }
}

process.browser = false
if (typeof Buffer === 'undefined') global.Buffer = require('buffer').Buffer

// global.location = global.location || { port: 80 }
const isDev = typeof __DEV__ === 'boolean' && __DEV__
process.env['NODE_ENV'] = isDev ? 'development' : 'production'
if (typeof localStorage !== 'undefined') {
  localStorage.debug = isDev ? '*' : ''
}

// If using the crypto shim, uncomment the following line to ensure
// crypto is loaded first, so it can populate global.crypto
require('crypto')

// Shim required to fix .readAsArrayBuffer (not implemented in react-native yet)

// from: https://stackoverflow.com/questions/42829838/react-native-atob-btoa-not-working-without-remote-js-debugging
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const atob = (input = '') => {
	let str = input.replace(/=+$/, '');
	let output = '';

	if (str.length % 4 == 1) {
		throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
	}
	for (let bc = 0, bs = 0, buffer, i = 0;
		buffer = str.charAt(i++);

		~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
			bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
	) {
		buffer = chars.indexOf(buffer);
	}

	return output;
}

// from: https://github.com/facebook/react-native/issues/21209 & https://github.com/ethers-io/ethers.js/issues/993
FileReader.prototype.readAsArrayBuffer = function (blob) {
	if (this.readyState === this.LOADING) throw new Error("InvalidStateError");
	this._setReadyState(this.LOADING);
	this._result = null;
	this._error = null;
	const fr = new FileReader();
	fr.onloadend = () => {
		let result = fr.result

		if (
      result.substr(0, "data:application/octet-stream".length) ===
        "data:application/octet-stream" &&
      Platform.OS === "android"
    ) {
			result = result.replace("data:application/octet-stream", "data:application/json")
    }

		const content = atob(result.substr("data:application/octet-stream".length));
		const buffer = new ArrayBuffer(content.length);
		const view = new Uint8Array(buffer);
		view.set(Array.from(content).map(c => c.charCodeAt(0)));
		this._result = buffer;
		this._setReadyState(this.DONE);
	};
	
	fr.readAsDataURL(blob);
}
