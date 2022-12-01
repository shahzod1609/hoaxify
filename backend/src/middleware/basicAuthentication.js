

const bcrypt = require('bcrypt');
const UserService = require('../user/userService')

//authorization is encoded base64;
//basic authorization;
const basicAuthentication = async (req, res, next) => {
    const auth = req.headers.authorization;
    if (auth) {
        const encoded = auth.substring(6);
        const decoded = Buffer.from(encoded, 'base64').toString('ascii');
        const [email, password] = decoded.split(':');
        const user = await UserService.findByEmail(email);
        if (user && !user.inactive) {
            const match = await bcrypt.compare(  user.password , password);
            if(match)
                req.basicAuthentication = user
        }
    }
    next()
}

module.exports = basicAuthentication