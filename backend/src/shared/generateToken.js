const crypto = require('crypto')
const generateToken = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

module.exports = generateToken
