/*
 * db/encode.js
 *
 * Django compatible password encoding.
 *
 */

const crypto = require('crypto');

function randomSalt() {
  return crypto
    .randomBytes(10)
    .toString('base64')
    .slice(0, 12);
}

function encodePasswordSync(password, salt, iterations) {
  const secret = crypto
    .pbkdf2Sync(password, salt, iterations, 32, 'sha256')
    .toString('base64');
  return `pbkdf2_sha256$${iterations}$${salt}$${secret}`;
}

function comparePasswordSync(password, secret) {
  // [0]: algorithm, [1]: iterations, [2]: salt, [3]: secret
  const splitted = secret.split('$');
  const converted = crypto
    .pbkdf2Sync(password, splitted[2], parseInt(splitted[1], 10), 32, 'sha256')
    .toString('base64');
  return converted === splitted[3];
}

async function encodePassword(password, salt, iterations) {
  const secret = await new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, 32, 'sha256', (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
  return `pbkdf2_sha256$${iterations}$${salt}$${secret.toString('base64')}`;
}

async function comparePassword(password, secret) {
  // [0]: algorithm, [1]: iterations, [2]: salt, [3]: secret
  const splitted = secret.split('$');
  const converted = await new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      splitted[2],
      parseInt(splitted[1], 10),
      32,
      'sha256',
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
  return converted.toString('base64') === splitted[3];
}

module.exports = {
  randomSalt,
  encodePassword,
  comparePassword,
  encodePasswordSync,
  comparePasswordSync,
};
