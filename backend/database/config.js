const profiles = require('../config');

const dbConfigs = {};
Object.keys(profiles).forEach((profile) => {
  dbConfigs[profile] = { ...profiles[profile].database };
});
// console.log(dbConfigs)
module.exports = dbConfigs;