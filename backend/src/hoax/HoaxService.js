const Hoax = require('./hoax');
const User = require('../user/user');
const NotFoundException = require('../error/NotFoundException');
const FileService = require('../file/FileService');
const FileAttachment = require('../file/fileAttachment');
const ForbiddenException = require('../auth/ForbiddenException');

const save = async (body, userId) => {
  const hoax = {
    content: body.content,
    userId,
    timestamp: Date.now(),
  };
  const { id } = await Hoax.create(hoax);
  if (body.fileAttachment) {
    await FileService.associateHoaxAndFile(id, body.fileAttachment);
  }
};

const getHoaxes = async (page, size, userId) => {
  let where = {};
  if (userId) {
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException();
    }
    where = { id: userId };
  }
  const hoaxes = await Hoax.findAndCountAll({
    include: [
      {
        model: User,
        as: 'user',
        where,
        attributes: ['id', 'username', 'email', 'image'],
      },
      {
        model: FileAttachment,
        as: 'fileAttachment',
        attributes: ['filename', 'fileType'],
      },
    ],
    order: [['id', 'DESC']],
    limit: size,
    offset: page * size,
    attributes: ['id', 'content', 'timestamp'],
  });
  return {
    content: hoaxes.rows.map((hoaxSequelize) => {
      const hoaxAsJSON = hoaxSequelize.get({ plain: true });
      if (hoaxAsJSON.fileAttachment === null) delete hoaxAsJSON.fileAttachment;
      return hoaxAsJSON;
    }),
    size,
    page,
    totalPages: Math.ceil(hoaxes.count / size),
  };
};

const deleteHoax = async (hoaxId, userId) => {
  const hoaxToBeDeleted = await Hoax.findOne({
    where: {
      userId: userId,
      id: hoaxId,
    },
    include: {
      model: FileAttachment,
    },
  });
  if (!hoaxToBeDeleted) {
    throw new ForbiddenException();
  }
  const hoaxAsJSON = hoaxToBeDeleted.get({ plain: true });
  if (hoaxAsJSON.fileAttachment !== null) {
    await FileService.deleteAttachment(hoaxAsJSON.fileAttachment.filename);
  }
  await hoaxToBeDeleted.destroy()
};

module.exports = {
  save,
  getHoaxes,
  deleteHoax,
};
