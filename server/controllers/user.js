/*
 * controllers/user.js
 *
 * Controllers for authenticating users.
 *
 */

const { User } = require('../db/schema');
const rasha = require('rasha');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { randomSalt, encodePassword } = require('../db/encode');
const { getUser, localAuth, bearerAuth } = require('../db/auth');

/**
 * Sends the JWT key set
 */
exports.getJwks = async (req, res) => {
  const jwk = {
    ...rasha.importSync({ pem: jwtConfig.publicKey }),
    alg: 'RS256',
    use: 'sig',
    kid: jwtConfig.publicKey,
  };
  const jwks = {
    keys: [jwk],
  };
  res.setHeader('Content-Type', 'application/json');
  /* eslint-disable-next-line prefer-template */
  res.send(JSON.stringify(jwks, null, 2) + '\n');
  // handleResponse(res, 200, jwks);
};

/**
 * Sign in using username and password and returns JWT
 */
exports.postLogin = async (req, res) => {
  const { username, password } = req.body;
  const errors = [];
  if (!username) {
    errors.push({ type: 'InvalidField', message: 'Username is not valid' });
  }
  if (!password) {
    errors.push({ type: 'InvalidField', message: 'Password cannot be blank' });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const user = await localAuth(username, password);
    return handleResponse(res, 200, user);
  } catch (error) {
    return handleResponse(res, 400, {
      errors: [{ type: 'AuthenticationFailed', message: error.message }],
    });
  }
};

/**
 * POST /signup
 * Create a new local account
 */
exports.postSignup = async (req, res) => {
  const { username, password } = req.body;
  const errors = [];
  if (!username) {
    errors.push({ type: 'InvalidField', message: 'Username is not valid' });
  }
  if (!password) {
    errors.push({ type: 'InvalidField', message: 'Password cannot be blank' });
  }
  if (username.length >= 32) {
    errors.push({
      type: 'InvalidField',
      message: 'Username should be at most 32 characters',
    });
  }
  if (password.length <= 6) {
    errors.push({
      type: 'InvalidField',
      message: 'Password must be at least 6 characters long',
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const salt = randomSalt();
    const encoded = await encodePassword(req.body.password, salt, 100000);
    const user = await User.create({
      username: req.body.username,
      nickname: req.body.nickname,
      password: encoded,
    });

    const userHeader = getUser(user);
    return handleResponse(res, 200, userHeader);
  } catch (error) {
    return handleResponse(res, 400, {
      errors: [{ type: 'DBError', message: error.message }],
    });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const bearer = req.headers.authorization;
    const requestedRole = req.headers['x-hasura-role'];
    if (!bearer) {
      return handleResponse(res, 200, { 'X-Hasura-Role': 'anonymous' });
    }
    const token = bearer.slice(7);
    const parsed = await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        jwtConfig.publicKey,
        { algorithm: 'RS256' },
        (err, decoded) => (err ? reject(err) : resolve(decoded)),
      );
    });
    const userId =
      parsed['https://www.cindythink.com/jwt/claims']['x-hasura-user-id'];
    const user = await User.findByPk(userId);
    return handleResponse(res, 200, {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
    });
  } catch (error) {
    return handleResponse(res, 401, {
      errors: [{ type: 'InternalServerError', message: error.message }],
    });
  }
};

exports.getWebhook = async (req, res) => {
  try {
    const bearer = req.headers.authorization;
    const requestedRole = req.headers['x-hasura-role'];
    if (!bearer) {
      return handleResponse(res, 200, { 'X-Hasura-Role': 'anonymous' });
    }
    const token = bearer.slice(7);
    const user = await bearerAuth(token, requestedRole);
    return handleResponse(res, 200, user);
  } catch (error) {
    return handleResponse(res, 401, {
      errors: [{ type: 'InternalServerError', message: error.message }],
    });
  }
};

function handleResponse(res, code, statusMsg) {
  res.status(code).json(statusMsg);
}
