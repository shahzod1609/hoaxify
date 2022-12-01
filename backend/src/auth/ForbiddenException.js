module.exports = function ForbiddenException() {
  this.status = 403;
  this.message = 'You are not authorized to update user';
};
