const Sequelize = require('sequelize');
const Token = require('../auth/Token');
const Hoax = require('../hoax/hoax');
const sequelize = require('../config/database');

const Model = Sequelize.Model;

class User extends Model {}

User.init(
  {
    username: {
      type: Sequelize.STRING,
    },
    email: {
      type: Sequelize.STRING,
    },
    password: {
      type: Sequelize.STRING,
    },
    inactive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    activationToken: {
      type: Sequelize.STRING,
    },
    passwordResetToken: {
      type: Sequelize.STRING,
    },
    image: {
      type: Sequelize.STRING,
    },
  },
  {
    sequelize,
    modelName: 'user',
  }
);

User.hasMany(Token, { foreignKey: 'userId', onDelete: 'cascade' });
User.hasMany(Hoax, { foreignKey: 'userId', onDelete: 'cascade' });
Hoax.belongsTo(User);

module.exports = User;
