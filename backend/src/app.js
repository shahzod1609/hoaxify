const express = require('express');
const app = express();
const path = require('path');

const { uploadDir, profileDir, attachmentDir } = require('config');
const profilePath = path.join('.', uploadDir, profileDir);
const attachmentPath = path.join('.',uploadDir, attachmentDir)
const UserRouter = require('./user/userRouter');
const AuthRouter = require('./auth/authRouter');
const ErrorHandler = require('./error/ErrorHandler');
const FileService = require('./file/FileService');
const HoaxRouter = require('./hoax/hoaxRouter');
const AttachmentRouter = require('./file/FileRouter')
const TokenAuthentication = require('./middleware/TokenAuthentication');


const ONE_YEAR_IN_MILLIS = 365 * 24 * 60 * 60 * 1000;

//if you use language you can use <i18next>

app.use(
  '/images',express.static(profilePath, { maxAge: ONE_YEAR_IN_MILLIS })
);
app.use(
  '/attachments',express.static(attachmentPath, { maxAge: ONE_YEAR_IN_MILLIS })
);

app.use(express.json({ limit: '2mb' }));
FileService.createFolders();

app.use(TokenAuthentication);
app.use(AuthRouter);
app.use(UserRouter);
app.use(HoaxRouter);
app.use(AttachmentRouter)
app.use(ErrorHandler);

module.exports = app;
