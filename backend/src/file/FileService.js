const config = require('config');
const fs = require('fs');
const path = require('path');
const FileType = require('file-type');
const FileAttachment = require('./fileAttachment');
const generateToken = require('../shared/generateToken');
const { Op } = require('sequelize');
const Hoax = require('../hoax/hoax');
const { uploadDir, profileDir, attachmentDir } = config;

const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentFolder = path.join('.', uploadDir, attachmentDir);

const createFolders = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  if (!fs.existsSync(profileFolder)) {
    fs.mkdirSync(profileFolder);
  }
  if (!fs.existsSync(attachmentFolder)) {
    fs.mkdirSync(attachmentFolder);
  }
};

const saveProfileImage = async (base64File) => {
  const filename = generateToken(16);
  const filePath = path.join(profileFolder, filename);
  await fs.promises.writeFile(filePath, base64File, 'base64');
  return filename;
};

const deleteImage = async (filename) => {
  const filePath = path.join(profileFolder, filename);
  await fs.promises.unlink(filePath);
};

const isLessThan2MB = (buffer) => {
  return buffer.length < 2 * 1024 * 1024;
};

const isSupported = (buffer) => {
  const type = FileType.fromBuffer(buffer);
  return !type ? false : type.mime === 'image/png' || type.mime === 'image/jpg';
};

const saveAttachment = async (file) => {
  let filename = generateToken(32);
  const type = await FileType.fromBuffer(file.buffer);
  let fileType;
  if (type) {
    fileType = type.mime;
    filename += `.${type.ext}`;
  }
  fs.promises.writeFile(path.join(attachmentFolder, filename), file.buffer);
  const savedAttachment = await FileAttachment.create({
    filename: filename,
    uploadDate: new Date(),
    fileType: fileType,
  });
  return { id: savedAttachment.id };
};

const associateHoaxAndFile = async (hoaxId, attachmentId) => {
  const attachment = await FileAttachment.findOne({
    where: { id: attachmentId },
  });
  if (!attachment) return;

  if (attachment.hoaxId) return;

  attachment.hoaxId = hoaxId;

  await attachment.save();
};

const removeUnusedAttachments = async () => {
  const oneDay = 24 * 60 * 60 * 1000;
  const oneDayOld = new Date(Date.now() - oneDay - 1);
  setInterval(async () => {
    const attachments = await FileAttachment.findAll({
      where: {
        uploadDate: {
          [Op.lt]: oneDayOld,
        },
        hoaxId: {
          [Op.is]: null,
        },
      },
    });
    for (const attachment of attachments) {
      const { filename } = attachment.get({ plain: true });
      fs.promises.unlink(path.join(attachmentFolder, filename));
      await attachment.destroy();
    }
  }, oneDay);
};

const deleteAttachment = async (filename) => {
  const pathAttachment = path.join(attachmentFolder, filename);
  try {
    await fs.promises.access(pathAttachment);
    await fs.promises.unlink(pathAttachment);
  } catch (err) {
    console.log(err.message)
  }
};

const deleteUserFiles = async (user) => {
  if (user.image) {
    await deleteImage(user.image);
  }
  const attachments = await FileAttachment.findAll({
    attributes: ['filename'],
    include: {
      model: Hoax,
      where: {
        userId: user.id,
      },
    },
  });
  if (attachments.length === 0) return;
  for (const attachment of attachments) {
    await deleteAttachment(attachment.getDataValue('filename'));
  }
};

module.exports = {
  createFolders,
  saveProfileImage,
  deleteImage,
  isLessThan2MB,
  isSupported,
  saveAttachment,
  associateHoaxAndFile,
  removeUnusedAttachments,
  deleteAttachment,
  deleteUserFiles,
};
