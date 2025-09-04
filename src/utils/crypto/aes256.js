/*
The MIT License (MIT)

Copyright (c) 2015 Jay Svoboda

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. 
*/

const { randomBytes } = require('./randomBytes');

var aes256 = {},
  crypto = require('crypto'),
  algorithm = 'aes-256-gcm',
  legacy_algorithm = 'aes-256-ctr';

aes256.encrypt = async function (key, data) {
  var sha256 = crypto.createHash('sha256');
  sha256.update(key);

  var iv = await randomBytes(16)

  var plaintext = Buffer.from(data),
    cipher = crypto.createCipheriv(algorithm, sha256.digest(), iv),
    ciphertext = cipher.update(plaintext);
  ciphertext = Buffer.concat([iv, ciphertext, cipher.final(), cipher.getAuthTag()]);

  return ciphertext.toString('base64');
};

aes256.decrypt = function (key, data) {
  var sha256 = crypto.createHash('sha256');
  sha256.update(key);

  var input = Buffer.from(data, 'base64'),
    iv = input.slice(0, 16),
    ciphertext = input.slice(16, -16),
    authTag = input.slice(-16),
    decipher = crypto.createDecipheriv(algorithm, sha256.digest(), iv);

  decipher.setAuthTag(authTag);

  const plaintextBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintextBuf.toString('utf8');
};

aes256.legacy_encrypt = async function (key, data) {
  var sha256 = crypto.createHash('sha256');
  sha256.update(key);

  var iv = await randomBytes(16)

  var plaintext = Buffer.from(data),
    cipher = crypto.createCipheriv(legacy_algorithm, sha256.digest(), iv),
    ciphertext = cipher.update(plaintext);
  ciphertext = Buffer.concat([iv, ciphertext, cipher.final()]);

  return ciphertext.toString('base64');
};

aes256.legacy_decrypt = function (key, data) {
  var sha256 = crypto.createHash('sha256');
  sha256.update(key);

  var input = Buffer.from(data, 'base64'),
    iv = input.slice(0, 16),
    ciphertext = input.slice(16),
    decipher = crypto.createDecipheriv(legacy_algorithm, sha256.digest(), iv)

  const plaintextBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintextBuf.toString('utf8');
};

module.exports = aes256;