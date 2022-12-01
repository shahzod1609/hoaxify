const request = require("supertest");
const app = require("../src/app");
const User = require("../src/user/user");
const sequelize = require("../src/config/database");
const bcrypt = require("bcrypt");
const Token = require("../src/auth/Token");
beforeAll(async () => {
  await sequelize.sync();
  // jest.setTimeout(20000)

});


beforeEach(async () => {
  return await User.destroy({ truncate: { cascade: true } });
});


const putUser = async (id = 5, body = null, options = {}) => {
  let agent = request(app);
  let token;
  if (options.auth) {
    const response = await request(app)
      .post("/api/1.0/auth")
      .send(options.auth);
      token = response.body.token;
  }
  // if (options.auth) {
  //   const { email, password } = options.auth;
  //   agent.auth(email, password);
  // }
  agent = request(app).put("/api/1.0/users/" + id);

  if (token) {
    agent.set("Authorization", "Bearer " + token);
    // agent.set("Authorization", `Bearer ${token}`);
  }
  if (options.token) {
    agent.set("Authorization", "Bearer " + options.token);
  }
  return agent.send(body);
};

let activeUser = {
  username: "user1",
  email: "user1@mail.com",
  password: "P4ssword",
  inactive: false,
};

const addUser = async (user = { ...activeUser }) => {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  user.password = hashedPassword;
  return await User.create(user);
};

describe("Update User", () => {
  it("returns forbidden when request without basic authorization", async () => {
    const response = await putUser();
    expect(response.status).toBe(403);
  });
  it("returns message when request without basic authorization", async () => {
    const nowInMillis = new Date().getTime();
    const response = await putUser();
    expect(response.body.message).toBe("You are not authorized to update user");
    expect(response.body.path).toBe("/api/1.0/users/5");
    expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
  });
  it("returns forbidden when request sent with incorrect email in basic auth", async () => {
    await addUser();
    const response = await putUser(5, null, {
      auth: { email: "user123456@mail.com", password: "P4ssword" },
    });
    expect(response.status).toBe(403);
  });
  it("returns forbidden when request sent with incorrect password in basic auth", async () => {
    await addUser();
    const response = await putUser(5, null, {
      auth: { email: "user1@mail.com", password: "P4sswfasord" },
    });
    expect(response.status).toBe(403);
  });
  it("returns forbidden when request sent with correct credentials another user", async () => {
    await addUser();
    const userToBeUpdated = await addUser({
      username: "user2",
      email: "user2@mail.com",
      password: "P4ssword",
      inactive: false,
    });
    const response = await putUser(userToBeUpdated.id, null, {
      auth: { email: "user1@mail.com", password: "P4ssword" },
    });
    expect(response.status).toBe(403);
  });
  it("returns forbidden when request sent with user be inactive", async () => {
    const inactiveUser = await addUser({ ...activeUser, inactive: true });
    const response = await putUser(inactiveUser.id, null, {
      auth: { email: "user1@mail.com", password: "P4ssword" },
    });
    expect(response.status).toBe(403);
  });
  it("returns 200 when request sent correct credentials", async () => {
    const savedUser = await addUser();
    const validUpdate = { username: "updated-user" };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: "P4ssword" },
    });
    expect(response.status).toBe(200);
  });
  it("updates username when request sent correct credentials", async () => {
    const savedUser = await addUser();
    const validUpdate = { username: "updated-user" };
    await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: "P4ssword" },
    });
    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser.username).toBe(validUpdate.username);
  });
});
describe("Token expiration", () => {
  it("returns 403 when token is older 1 week", async () => {
    const savedUser = await addUser();
    const token = "test-token";
    const oneWeeksAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 1);
    await Token.create({
      id: savedUser.id,
      token: token,
      lastUsedAt: oneWeeksAgo,
    });
    const validUpdate = { username: "for-test" };
    const response = await putUser(savedUser.id, validUpdate, {
      token: token,
    });
    expect(response.status).toBe(403);
  });
  it("refreshes token when unixperid token is used ", async () => {
    const savedUser = await addUser();
    const token = "test-token";
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await Token.create({
      id: savedUser.id,
      token: token,
      lastUsedAt: fourDaysAgo,
    });
    const rightBeforeSendingRequest = new Date();
    const validUpdate = { username: "for-test" };
    await putUser(savedUser.id, validUpdate, {
      token: token,
    });
    const tokenInDB = await Token.findOne({ token: token });
    expect(tokenInDB.lastUsedAt.getTime()).toBeGreaterThan(
      rightBeforeSendingRequest.getTime()
    );
  });
  it("refreshes token when unixperid token is used for unauthenticated point ", async () => {
    const savedUser = await addUser();
    const token = "test-token";
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await Token.create({
      id: savedUser.id,
      token: token,    
      lastUsedAt: fourDaysAgo,
    });
    const rightBeforeSendingRequest = new Date();
    await request(app).get('/api/1.0/users').set('Authorization',`Bearer ${token}`)
    const tokenInDB = await Token.findOne({ token: token });
    expect(tokenInDB.lastUsedAt.getTime()).toBeGreaterThan(
      rightBeforeSendingRequest.getTime()
    );
  });

});
