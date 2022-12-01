// const jwt = require('jsonwebtoken');
// const secret_key = 'this-is-our-secret';

const { Op } = require('sequelize');
const Token = require('../auth/Token');
const generateToken = require('../shared/generateToken');
const createToken = async (user) => {
  const token = generateToken(32);
  await Token.create({
    token: token,
    userId: user.id,
    lastUsedAt: new Date(),
  });
  return token;
};

const verifyToken = async (token) => {
  const oneWeeksAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const tokenInDB = await Token.findOne({
    where: {
      token: token,
      lastUsedAt: {
        [Op.gt]: oneWeeksAgo,
      },
    },
  });
  tokenInDB.lastUsedAt = new Date();
  await tokenInDB.save();
  const userId = tokenInDB.userId;
  return { id: userId };
};

const destroyToken = async (token) => {
  await Token.destroy({ where: { token: token } });
};

const deleteTokensOfUser = async (id) => {
  await Token.destroy({ where: { id: id } });
};

const cleanUpToken = () => {
  setInterval(async () => {
    const oneWeeksAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await Token.destroy({
      where: {
        lastUsedAt: {
          [Op.lt]: oneWeeksAgo,
        },
      },
    });
  }, 1000);
};

module.exports = {
  createToken,
  verifyToken,
  destroyToken,
  deleteTokensOfUser,
  cleanUpToken,
};
