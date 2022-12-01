const express = require('express');
const TokenService = require('./TokenService');
const router = express.Router();
const UserService = require('../user/userService');
const AuthenticationException = require('./AuthenticationException');
const bcrypt = require('bcrypt');
const ForbiddenException = require('./ForbiddenException');
const { check, validationResult } = require('express-validator');
const ValidationException = require('../error/ValidationException');

router.post(
  '/api/1.0/auth',
  check('email')
    .notEmpty()
    .withMessage('E-mail cannot be null')
    .bail()
    .isEmail()
    .withMessage('E-mail is not valid'),
  check('password')
    .notEmpty()
    .withMessage('Password cannot be null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage(
      'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'
    ),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new ValidationException(errors.array()));

    const { email, password } = req.body;
    const user = await UserService.findByEmail(email);
    if (!user) return next(new AuthenticationException());

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return next(new AuthenticationException());
    }
    if (user.inactive) {
      return next(new ForbiddenException());
    }

    const token = await TokenService.createToken(user);
    return res.send({
      id: user.id,
      username: user.username,
      token,
      image: user.image,
    });
  }
);

router.post('logout', async (req, res) => {
  const auth = req.headers.authorization;
  if (auth) {
    const token = auth.substring(7);
    await TokenService.destroyToken(token);
  }
  res.send();
});

module.exports = router;
