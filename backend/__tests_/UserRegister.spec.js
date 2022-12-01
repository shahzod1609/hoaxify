const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/user');
const sequelize = require('../src/config/database');
const SMTPServer = require('smtp-server').SMTPServer;
const config = require('../config/test')

let lastMail, server;
let simulateSmtpFailure = false;

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString()
      })
      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const err = new Error('invalid mailbox')
          err.responseCode = 553;
          return callback(err)
        }
        lastMail = mailBody
        callback()
      })
    }
  })
  await server.listen(config.mail.port, 'localhost')
  await sequelize.sync();
  jest.setTimeout(20000)
});

beforeEach(async() => {
  simulateSmtpFailure = false;
  return await User.destroy({ truncate: true });
});

afterAll(async () => {
  await server.close()
  jest.setTimeout(5000)
})

const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
};

const postUser = (user = validUser) => {
  return request(app).post('/api/1.0/users').send(user);
};

describe('User Registration', () => {
  it('returns 200 OK when signup request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it('User created', async () => {
    const response = await postUser();
    expect(response.body.message).toBe('User created');
  });

  it('save the user to database', async () => {
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('saves the username and email to database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@mail.com');
  });

  it('hashes the password in database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('P4ssword');
  });

  it('returns 400 when username is null', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.ru',
      password: 'P4ssword',
    });
    expect(response.status).toBe(400);
  });

  it('returns validationError field in reponse body when validation error occurs', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  const username_null = 'Username cannot be null';
  const username_size = 'Must have min 4 and max 64 characters';
  const email_null = 'E-mail cannot be null';
  const email_invalid = 'E-mail is not valid';
  const password_null = 'Password cannot be null';
  const password_size = 'Password must be at least 6 characters';
  const password_pattern =
    'Password must have at least 1 uppercase, 1 lowercase letter and 1 number';
  const email_inuse = 'E-mail in use';
  const user_create_success = 'User created';
  const email_failure = 'E-mail failure';
  // const account_activation_failure = 'This account is either active or the token is invalid';

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${'usr'}           | ${username_size}
    ${'username'} | ${'u'.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_invalid}
    ${'email'}    | ${'user@mail'}     | ${email_invalid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'P4ssw'}         | ${password_size}
    ${'password'} | ${'allowercase'}   | ${password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
    ${'password'} | ${'213456790'}     | ${password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${password_pattern}
    ${'password'} | ${'lower4nd5667'}  | ${password_pattern}
    ${'password'} | ${'UPPER4444'}     | ${password_pattern}
  `(
    'returns $expectedMessage when $field is $value',
    async ({ field, value, expectedMessage }) => {
      const user = {
        username: 'user1',
        email: 'user1@mail.com',
        password: 'P4ssword',
      };
      user[field] = value;
      const response = await postUser(user);
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );
  it(`returns ${email_inuse} when same email is already in use`, async () => {
    await User.create({ ...validUser });
    const response = await postUser();

    expect(response.body.validationErrors.email).toBe(email_inuse);
  });

  it('returns errors for both username is null and email is in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'P4ssword',
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  it(`returns success message of ${user_create_success} when signup request is valid`, async () => {
    const response = await postUser({ ...validUser });
    expect(response.body.message).toBe(user_create_success);
  });

  it('creates user in inactive mode', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates user in inactive mode even the request body contains inactive mode', async () => {
    const newUser = { ...validUser, inactive: false };
    await postUser(newUser);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates an activationToken for user', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  it('returns 502 Gateway when sending email fails', async () => {
    // const mockSendAcoountActivation = jest
    //   .spyOn(EmailService, 'sendAccountActivation')
    //   .mockRejectedValue({ message: 'Failed to deliver email' });
    simulateSmtpFailure = true
    const response = await postUser();
    expect(response.status).toBe(502);
    // mockSendAcoountActivation.mockRestore();
  });

  it('sends an Account activation email with activationToken', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(lastMail).toContain('user1@mail.com');
    expect(lastMail).toContain(savedUser.activationToken);
  });

  it(`returns ${email_failure} message when sending email fails`, async () => {
    // const mockSendAcoountActivation = jest
    //   .spyOn(EmailService, 'sendAccountActivation')
    //   .mockRejectedValue({ message: 'Failed to deliver email' });
    simulateSmtpFailure = true
    const response = await postUser();
    // mockSendAcoountActivation.mockRestore();
    expect(response.body.message).toBe(email_failure);
  });

  it('does not save user to database if activation email fails', async () => {
    // const mockSendAcoountActivation = jest
    //   .spyOn(EmailService, 'sendAccountActivation')
    //   .mockRejectedValue({ message: 'Failed to deliver email' });
    simulateSmtpFailure = true
    await postUser()
    // mockSendAcoountActivation.mockRestore();
    const users = await User.findAll()
    expect(users.length).toBe(0);
  });
});


describe('Account activation', () => {
  it('activates the account when correct token is sent', async () => {
    await postUser()
    let users = await User.findAll()
    const token = users[0].activationToken;

    await request(app).post('/api/1.0/users/token/' + token).send()
    users = await User.findAll()
    expect(users[0].inactive).toBe(false)
  })

  it('removes the token from user table after successful activation', async () => {
    await postUser()
    let users = await User.findAll()
    const token = users[0].activationToken;

    await request(app).post('/api/1.0/users/token/' + token).send()
    users = await User.findAll()
    expect(users[0].activationToken).toBeFalsy()
  })

  it('does not activate the account when token is wrong', async () => {
    await postUser()
    let users = await User.findAll()
    const token = 'this-token-does-not-exist'

    await request(app).post('/api/1.0/users/token/' + token).send()
    users = await User.findAll()
    expect(users[0].inactive).toBe(true)
  })

  it('return bad request when token is wrong', async () => {
    await postUser()
    const token = 'this-token-does-not-exist'
    const response = await request(app).post('/api/1.0/users/token/' + token).send()
    expect(response.status).toBe(400)
  })

  it.each`
    language | tokenStatus  | message
    ${'en'}  | ${'wrong'}   | ${'This account is either active or the token is invalid'}
    ${'en'}  | ${'correct'} | ${'Account is activated'}
  `('returns $message when token is $tokenStatus and language is $language', async ({ language,tokenStatus, message }) => {
    await postUser()
    let token = 'this-token-does-not-exist'
    if (tokenStatus === 'correct') {
      let users = await User.findAll()
      token = users[0].activationToken;
    }
    const response = await request(app).post('/api/1.0/users/token/' + token).send()
    expect(response.body.message).toBe(message)
  })

  it('returns Validation Failure message in error response body when validation fails',async() => {
    const response = await postUser({
      username:null,
      email:validUser.email,
      password:'P4ssword'
    });
    expect(response.body.message).toBe('Validation Failure')
  })
})

describe('Error Model',()=>{
  it('returns path , timestamps , message and validationErrors in response when validation failure',async()=>{
    const response = await postUser({...validUser , username:null})
    const body = response.body;
    expect(Object.keys(body)).toEqual(['path','timestamp','message','validationErrors'])
  })
  it('returns path , timstamps and message in response when request fails other than validation error',async()=>{
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const body = response.body;
    expect(Object.keys(body)).toEqual(['path','timestamp','message']);
  }) 
  it('returns path in error body',async()=>{
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const body = response.body;
    expect(body.path).toEqual('/api/1.0/users/token/'+token);
  }) 
  it('returns timestamp in milliseconds within 5 seconds value in error body',async()=>{
    const nowInMillis = new Date().getTime()
    const fiveSecondsLater = nowInMillis + 5 *1000;
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const body = response.body;
    expect(body.timestamp).toBeGreaterThan(nowInMillis);
    expect(body.timestamp).toBeLessThan(fiveSecondsLater)
  })
})