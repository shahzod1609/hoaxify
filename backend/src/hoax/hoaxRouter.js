const express = require('express');
const ForbiddenException = require('../auth/ForbiddenException');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const HoaxService = require('./HoaxService');
const ValidationException = require('../error/ValidationException');
const pagination = require('../middleware/pagination');

router.post(
  '/api/1.0/hoaxes',
  check('content')
    .isLength({ min: 4, max: 5000 })
    .withMessage('Contents length must be at least 4 characters'),
  pagination,
  async (req, res, next) => {
    const user = req.authenticatedUser;
    if (!user) {
      return next(new ForbiddenException());
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }
    await HoaxService.save(req.body, user.id);
    return res.send();
  }
);

router.get(
  ['/api/1.0/hoaxes', '/api/1.0/users/:id/hoaxes'],
  pagination,
  async (req, res, next) => {
    
    const { page, size } = req.pagination;
    try {
      const hoax = await HoaxService.getHoaxes(page, size, req.params.id);
      return res.send(hoax);
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/api/1.0/hoaxes/:id', async (req, res, next) => {
  const user = req.authenticatedUser;
  if(!user){
    return next(new ForbiddenException());
  }
  try {
    await HoaxService.deleteHoax(parseInt(req.params.id),user.id)
    res.send()
  } catch (err) {
    next(err)
  }
});

module.exports = router;
