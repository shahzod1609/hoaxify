const User = require('./User');
const bcrypt = require('bcrypt');
const EmailService = require('../email/EmailService');
const sequelize = require('../config/database');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('./InvalidTokenException');
const UserNotFoundException = require('./UserNotFoundException');
const { Op } = require('sequelize');
const generateToken = require('../shared/generateToken');
const TokenService = require('../auth/TokenService');
const NotFoundException = require('../error/NotFoundException');
const FileService = require('../file/FileService');

const save = async (body) => {
  const { username, email, password, image } = body;
  const hash = await bcrypt.hash(password, 10);
  const user = {
    username,
    email,
    image,
    password: hash,
    activationToken: generateToken(16),
  };
  const transaction = await sequelize.transaction();
  await User.create(user, { transaction });
  try {
    await EmailService.sendAccountActivation(email, user.activationToken);
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw new EmailException();
  }
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email: email } });
};

const activate = async (token) => {
  const user = await User.findOne({
    where: {
      activationToken: token,
    },
  });
  if (!user) {
    throw new InvalidTokenException();
  }
  user.inactive = false;
  user.activationToken = null;
  await user.save();
};

const getUsers = async (page, size, authenticatedUser) => {
  const users = await User.findAndCountAll({
    where: {
      inactive: false,
      id: {
        [Op.not]: authenticatedUser ? authenticatedUser.id : 0,
      },
    },
    attributes: ['id', 'username', 'email', 'image'],
    limit: size,
    offset: page * size,
  });
  return {
    content: users.rows,
    page,
    size,
    totalPages: Math.ceil(users.count / size),
  };
};

const getUser = async (id) => {
  const user = await User.findOne({
    where: {
      id: id,
      inactive: false,
    },
    attributes: ['id', 'username', 'image', 'email'],
  });
  if (!user) throw new UserNotFoundException();
  return user;
};

const updateUser = async (id, updateBody) => {
  const user = await User.findOne({ where: { id: id } });
  user.username = updateBody.username;
  if (updateBody.image) {
    if (user.image) await FileService.deleteImage(user.image);
    user.image = await FileService.saveProfileImage(updateBody.image);
  }
  await user.save();
  return {
    id: id,
    username: user.username,
    email: user.email,
    image: user.image,
  };
};

const deleteUser = async (id) => {
  const user = await User.findOne({ where: { id: id } });
  // await TokenService.deleteTokensOfUser(id);
  await FileService.deleteUserFiles(user);
  await user.destroy();
};

const passwordResetToken = async (email) => {
  const user = await findByEmail(email);
  if (!user) {
    throw new NotFoundException();
  }
  const createToken = await generateToken(16);
  user.passwordResetToken = createToken;
  await user.save();
  try {
    await EmailService.passwordResetToken(email, createToken);
  } catch (err) {
    throw new EmailException();
  }
  return user;
};

const updatePassword = async (updateRequest) => {
  const user = await findByResetPassowordToken(
    updateRequest.passwordResetToken
  );
  if (!user) {
    throw new NotFoundException();
  }
  const hashedPassword = await bcrypt.hash(updateRequest.password, 10);
  user.inactive = false;
  user.activationToken = null;
  user.passwordResetToken = null;
  user.password = hashedPassword;
  await user.save();
  TokenService.cleanUpToken(user.id);
};

const findByResetPassowordToken = async (token) => {
  return await User.findOne({ where: { passwordResetToken: token } });
};

module.exports = {
  save,
  findByEmail,
  activate,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  passwordResetToken,
  findByResetPassowordToken,
  updatePassword,
};
