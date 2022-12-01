const express = require('express');
const router = express.Router();
const UserService = require('./userService');
const { check, validationResult } = require('express-validator');
const ValidationException = require('../error/ValidationException');
const pagination = require('../middleware/pagination');
const ForbiddenException = require('../auth/ForbiddenException');
const FileService = require('../file/FileService');

router.post(
  '/api/1.0/users',
  check('username')
    .isLength({ min: 4, max: 32 })
    .withMessage('Must have min 4 and max 64 characters')
    .notEmpty()
    .withMessage('Username cannot be null'),
  check('email')
    .notEmpty()
    .withMessage('E-mail cannot be null')
    .bail()
    .isEmail()
    .withMessage('E-mail is not valid')
    .bail()
    .custom(async (email) => {
      const user = await UserService.findByEmail(email);
      if (user) {
        throw new Error('E-mail in use');
      }
    }),
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
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }
    try {
      await UserService.save(req.body);
      return res.send({ message: 'User created' });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/api/1.0/users/token/:activationToken', async (req, res, next) => {
  const token = req.params.activationToken;
  try {
    await UserService.activate(token);
    return res.send({ message: 'Account is activated' });
  } catch (err) {
    next(err);
  }
});

router.get('/api/1.0/users', pagination, async (req, res, next) => {
  const { page, size } = req.pagination;
  const authenticatedUser = req.authenticatedUser;
  if (!authenticatedUser) return next(new ForbiddenException());
  const users = await UserService.getUsers(page, size, authenticatedUser);
  res.send(users);
});

router.get('/api/1.0/users/:id', async (req, res, next) => {
  // const authenticatedUser = req.authenticatedUser;
  // if (!authenticatedUser || authenticatedUser.id !== parseInt(req.params.id))
  //   return next(new ForbiddenException());
  try {
    const user = await UserService.getUser(req.params.id);
    res.send(user);
  } catch (err) {
    next(err);
  }
});

router.put('/api/1.0/users/:id', async (req, res, next) => {
  const authenticatedUser = req.authenticatedUser;
  if (!authenticatedUser || authenticatedUser.id !== parseInt(req.params.id))
    return next(new ForbiddenException());
  const user = await UserService.updateUser(req.params.id, req.body);
  return res.send(user);
});

router.delete('/api/1.0/users/:id', async (req, res, next) => {
  const authenticatedUser = req.authenticatedUser;
  if (!authenticatedUser || authenticatedUser.id !== parseInt(req.params.id))
    return next(new ForbiddenException());
  await UserService.deleteUser(req.params.id);
  return res.send();
});

router.post(
  '/api/1.0/user/password',
  check('email').bail().isEmail().withMessage('email not found'),
  async (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }
    try {
      await UserService.passwordResetToken(req.body.email);
      return res.send({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

const passwordResetTokenValidator = async (req, res, next) => {
  const user = await UserService.findByResetPassowordToken(
    req.body.passwordResetToken
  );
  if (!user) {
    return next(new ForbiddenException());
  }
  next();
};

router.put(
  '/api/1.0/user/password',
  passwordResetTokenValidator,
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
  check('image').custom(async (ImageAdBase64) => {
    if (!ImageAdBase64) return true;
    const buffer = Buffer.from(ImageAdBase64, 'base64');
    const isLessThan2MB = await FileService.isLessThan2MB(buffer);
    if (!isLessThan2MB) {
      throw new Error('Image must be lower than 2mb');
    }
    const isSupported = await FileService.isSupported(buffer);
    if (!isSupported) throw new Error('Unsupported file type');
    return true;
  }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }
    await UserService.updatePassword(req.body);
    return res.send();
  }
);

module.exports = router;
