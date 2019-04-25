/*
 * db/auth.js
 *
 * JWT Authorization mock as a replacement of passportjs.
 *
 */

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { User, AuthGroup } = require('./schema');
const { comparePassword } = require('./encode');

const getRoles = user => {
  if (user.isSuperuser) {
    return ['admin', 'user'];
  } else if (user.isStaff) {
    return ['staff', 'user'];
  }
  return ['user'];
};

const getClaims = (user, reqRole) => {
  let defaultRole = 'user';
  const authGroups = user.auth_groups || [];
  const roles = getRoles(user).concat(authGroups.map(ag => ag.name));

  if (reqRole && roles.find(v => v === reqRole)) {
    defaultRole = reqRole;
  }

  return {
    'x-hasura-default-role': defaultRole,
    'x-hasura-allowed-roles': roles,
    'x-hasura-user-id': `${user.id}`,
  };
};

const getUser = user => {
  const claim = {
    name: user.username,
    // iat: Math.floor(Date.now() / 1000),
    'https://localhost:3000/jwt/claims': getClaims(user),
  };
  const signOptions = {
    subject: `User-${user.id}`,
    expiresIn: '30d', // 30 days validity
    algorithm: 'RS256',
  };
  const JWT = jwt.sign(claim, jwtConfig.key, signOptions);
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    token: JWT,
  };
};

async function localAuth(username, password) {
  const user = await User.findOne({
    where: { username },
    include: [AuthGroup],
  });
  if (!user) {
    throw Error('User not existing');
  }
  if (!user.isActive) {
    throw Error('User is inactive');
  }
  const passwordCorrect = await comparePassword(password, user.password);
  if (!passwordCorrect) {
    throw Error('Invalid password');
  }
  const userHeader = getUser(user);
  return userHeader;
}

async function bearerAuth(token, reqRole) {
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
  const user = await User.findByPk(userId, { include: [AuthGroup] });
  if (!user) {
    throw Error('Invalid Token');
  }
  if (!user.isActive) {
    throw Error('User is inactive');
  }
  return getClaims(user, reqRole);
}

module.exports = {
  getClaims,
  getUser,
  localAuth,
  bearerAuth,
};
