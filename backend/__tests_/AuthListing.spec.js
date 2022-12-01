const app = require('../src/app')
const request = require('supertest')
const bcrypt = require('bcrypt')
const User = require('../src/user/user')
const sequelize  = require('../src/config/database')


beforeAll(async () => {
    await sequelize.sync();
}, 8000);

beforeEach(async () => {
    // await sleep(12)
    return User.destroy({ truncate: true });
}, 8000);

let activeUser = { username: 'user1', email: 'user1@gmail.com', password: 'P4ssword', inactive: false }

describe('Auth Listing', () => {
    const addUser = async (user={...activeUser}) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        user.password = hashedPassword;
        return await User.create(user)
    }

    const postAuthentication = async (credentials) => {
        return await request(app).post('/api/1.0/auth').send(credentials)
    }

    it('returns 200 when user posted', async () => {
        await addUser();
        const auth = await postAuthentication({ username: 'user1', email: 'user1@gmail.com', password: 'P4ssword', inactive: false })
        expect(auth.status).toBe(200);
    })

    it('returns id,username when login success', async () => {
        const user = await addUser()
        const auth = await postAuthentication({ username: 'user1', email: 'user1@gmail.com', password: 'P4ssword', inactive: false })
        expect(auth.body.id).toBe(user.id)
        expect(auth.body.username).toBe(user.username)
        expect(Object.keys(auth.body)).toEqual(['id','username'])
    })
    it('returns 401 when user not exist',async()=>{
        const auth = await postAuthentication({ username: 'user1', email: 'user1@gmail.com', password: 'P4ssword', inactive: false })
        expect(auth.status).toBe(401)
    })
    it('returns proper error body when authentication fails',async()=>{
        const nowInMillis = new Date().getTime()
        const auth = await postAuthentication({ username: 'user1', email: 'user1@gmail.com', password: 'P4ssword', inactive: false })
        const error = auth.body;
        expect(error.path).toBe('/api/1.0/auth');
        expect(error.timestamp).toBeGreaterThan(nowInMillis);
        expect(Object.keys(error)).toEqual(['path','timestamp','message'])
    })

    it('returns 401 when password is wrong',async()=> {
        await addUser()
        const response = await postAuthentication({email:'user1@gmail.com',username:'user1',password:'password'})
        expect(response.status).toBe(401)
    })
    it('returns 403 when logging in with an inactive account',async()=>{
        await addUser({...activeUser,inactive:true})
        const auth = await postAuthentication({ username: 'user1', email: 'user1@gmail.com', password: 'P4ssword' })
        expect(auth.status).toBe(403)
    })

    it('returns invalid E-mail',async()=>{
        
        const auth = await postAuthentication({password:'P4ssword'})
        expect(auth.status).toBe(401)
    })
    it('returns invalid password',async()=>{
        
        const auth = await postAuthentication({email:'user1@gmail.com'})
        expect(auth.status).toBe(401)
    })
},5000)

