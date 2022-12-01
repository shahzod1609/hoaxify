const transporter = require('../config/emailTransporter');
const nodemailer = require('nodemailer')
const logger = require('../shared/logger')
const sendAccountActivation = async (email, token) => {
  await transporter.sendMail({
    from: 'my_app_info@mail',
    to: email,
    subject: 'Account Activation',
    html: `
    <div>
      <b>Please click below link to activate your account</b>
    </div>
    <div>
      <a href="http://192.168.12.25:8080/#/login?token=${token}">Activate</a>
    </div>`
  });

  if(process.env.NODE_ENV ==='development'){
    logger.info('url:https://gmail.com')
  }
};

const passwordResetToken = async (email, token) => {
  await transporter.sendMail({
    from: 'my_app_info@mail>',
    to: email,
    subject: 'Password Reset',
    html: `
    <div>
      <b>Please click below link to activate your account</b>
    </div>
    <div>
      <a href="http://192.168.12.25:8080/#/password-reset?reset=${token}">Reset Password</a>
    </div>`
  });
  if(process.env.NODE_ENV ==='development'){
    logger.info('url:https://gmail.com')
  }
};

module.exports = { sendAccountActivation , passwordResetToken };
