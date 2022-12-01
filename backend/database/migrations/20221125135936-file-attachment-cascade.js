'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const constraints = await queryInterface.getForeignKeyReferencesForTable(['fileAttachments']);
      for (let i = 0; i < constraints.length; i++) {
        const constraintsName = constraints[i].constraintName;
        if (constraintsName.includes('hoaxId'))
        await queryInterface.removeConstraint('fileAttachments', constraintsName, { transaction });
      }
      await queryInterface.addConstraint('fileAttachments', {
        fields: ['hoaxId'],
        type: 'foreign key',
        references: {
          table: 'hoaxes',
          field: 'id',
        },
        onDelete: 'cascade',
        transaction,
      });
      await transaction.commit();
    } catch (err) {
      console.log(err);
      await transaction.rollback();
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const constraints = await queryInterface.getForeignKeyReferencesForTable(['fileAttachments']);
      for (let i = 0; i < constraints.length; i++) {
        const constraintsName = constraints[i].constraintName;
        if (constraintsName.includes('hoaxId'))
          await queryInterface.removeConstraint('fileAttachments', constraintsName, { transaction });
      }
      await queryInterface.addConstraint('fileAttachments', {
        fields: ['hoaxId'],
        type: 'foreign key',
        references: {
          table: 'hoaxes',
          field: 'id',
        },
        transaction,
      });
      await transaction.commit();
    } catch (err) {
      console.log(err);
      await transaction.rollback();
    }
  },
};
