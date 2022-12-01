const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/user');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt')


beforeAll(async () => {
    await sequelize.sync();
    
    jest.setTimeout(20000)
});

beforeEach(async () => {
    // await sleep(12)
    return await User.destroy({ truncate: true });
});


afterAll(async () => {

    jest.setTimeout(5000)
})

const sleep = (seconds) => {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

const getUsers = (options={}) => {
    const agent = request(app).get('/api/1.0/users')
    if (options.auth) {
        const { email, password } = options.auth
        agent.auth(email, password);
    }
    return agent
}


const addUsers = async(activeUserCount, inactiveUserCount = 0) => {
    const hashedPassword = await bcrypt.hash('P4ssword', 10);
    for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
        await User.create({
            username: `user${i + 1}`,
            email: `user${i + 1}@mail.com`,
            inactive: i >= activeUserCount,
            password:hashedPassword
        })
    }
}

describe('Listing Users', () => {
    it('returns 200 ok when there are no user in database', async () => {
        const response = await getUsers()
        expect(response.status).toBe(200)
    })
    it('returns page object as response body', async () => {
        const response = await getUsers()
        expect(response.body).toEqual({
            content: [],
            page: 0,
            size: 10,
            totalPages: 0
        })
    })
    it('returns 10 users in page content when there are 11 users in database', async () => {
        await addUsers(11)
        const response = await getUsers()
        expect(response.body.content.length).toBe(10)
    })
    it('returns 6 users in page content when there are 6 users and inactive 5 users in database', async () => {
        await addUsers(6, 5);
        const response = await getUsers();
        expect(response.body.content.length).toBe(6);
    })
    it('returns only id , username and email in content array for each user', async () => {
        await addUsers(1)
        const response = await getUsers()
        const user = response.body.content[0];
        expect(Object.keys(user)).toEqual(['id', 'username', 'email'])
    })
    it('returns 2 as totalPages when 15 active and 7 inactive user', async () => {
        await addUsers(15, 7)
        const response = await getUsers()
        expect(response.body.totalPages).toBe(2)
    })
    it('returns second page if indacator set one page', async () => {
        await addUsers(11)
        const response = await getUsers().query({ page: 1 })
        expect(response.body.content[0].username).toBe('user11')
        expect(response.body.page).toBe(1)
    })
    it('returns first page if page set below zero ', async () => {
        await addUsers(11)
        const response = await getUsers().query({ page: -5 })
        expect(response.body.page).toBe(0)
    })
    it('returns 5 size page', async () => {
        await addUsers(11)
        const response = await getUsers().query({ size: 5 })
        expect(response.body.content.length).toBe(5)
        expect(response.body.size).toBe(5)
    })
    it('returns totalPages and sending auth ', async () => {
        await addUsers(11)
        const response = await getUsers({email:'user1@mail.com',password:'P4ssword'})
        expect(response.body.totalPages).toBe(2)
    })
})

describe('Get User', () => {
    const getUser = (id = 5) => {
        return request(app).get('/api/1.0/users/' + id);
    }
    it('returns 404 when user not found', async () => {
        const user = await getUser();
        expect(user.status).toBe(404)

    })
    it('returns attributes when user found', async () => {
        const user = await getUser();
        expect(user.status).toBe(404)
    })
    it.each`
        message
        ${'User Not Found'}
    `('returns $message for unknown user', async ({ message }) => {
        const user = await getUser();
        expect(user.body.message).toBe(message);
    })
    it('returns proper error body when user not found', async () => {
        const nowInMillis = new Date().getTime()
        const response = await request(app).get('/api/1.0/users/5')
        const error = response.body
        expect(error.path).toBe('/api/1.0/users/5')
        expect(error.timestamp).toBeGreaterThan(nowInMillis)
        expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message'])
    })
    it('returns 200 when an active user exist', async () => {
        const user = await User.create({
            username: 'user1',
            email: 'user1@gmail.com',
            inactive: false
        })
        const response = await getUser(user.id)
        expect(response.status).toBe(200)
    })
    it('returns id , username , email in active user', async () => {
        const user = await User.create({
            username: 'user1',
            email: 'user1@gmail.com',
            inactive: false
        })
        const response = await getUser(user.id)

        expect(Object.keys(response.body)).toEqual(['id', 'username', 'email'])
    })
    it('returns 404 when an inactive user exist', async () => {
        const user = await User.create({
            username: 'user1',
            email: 'user1@gmail.com',
            inactive: true
        })
        const response = await getUser(user.id)
        expect(response.status).toBe(404)
    })
})