module.exports = {
    database: {
        database: "test",
        username: "root",
        password: "",
        dialect: "sqlite",
        storage: ":memory:",
        logging: false
    },
    mail: {    
        host:"localhost",
        port: Math.floor(Math.random()*2000)+10000,
        tls: {
            rejectUnauthorized: false
        }
    },
    uploadDir:'uploads-test',
    profileDir:'profile',
    attachmentDir:'attachment'
}