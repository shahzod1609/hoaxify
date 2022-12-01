const TokenService = require('../auth/TokenService');

const TokenAuthentication = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth) {
    const token = auth.substring(7);
    try {
      const user = await TokenService.verifyToken(token);
      req.authenticatedUser = user;
    } catch (err) {}
  }
  next();
};

module.exports = TokenAuthentication;
