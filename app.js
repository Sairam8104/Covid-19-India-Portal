const express = require("express");
const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
app.use(express.json());
let db = null;
const installDatabase = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server is Running on http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
  }
};

installDatabase();

const authenticateToken = async (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.get("/states/", authenticateToken, async (request, response) => {
  const getStateDetails = `SELECT state_id as stateId,state_name as stateName,
     population FROM state;`;
  const stateNames = await db.all(getStateDetails);
  response.send(stateNames);
});

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateDetails = `SELECT state_id as stateId,state_name as stateName,
     population FROM state WHERE state_id = ${stateId};`;
  const stateNames = await db.get(getStateDetails);
  response.send(stateNames);
});

app.post("/districts/", authenticateToken, async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const createDistrictDetails = `INSERT INTO district 
    (district_name,state_id,cases,cured,active,deaths) VALUES 
    ("${districtName}",${stateId},${cases},${cured},${active},${deaths});`;
  await db.run(createDistrictDetails);
  response.send("District Successfully Added");
});

app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictDetails = `SELECT district_id as districtId,district_name as districtName, state_id as stateId,
     cases,cured,active,deaths FROM district WHERE district_id = ${districtId};`;
    const districtNames = await db.get(getDistrictDetails);
    response.send(districtNames);
  }
);

app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrict = `DELETE FROM district WHERE district_id = ${districtId};`;
    await db.run(deleteDistrict);
    response.send("District Removed");
  }
);

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const districtDetails = request.body;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = districtDetails;
    const updateDistrictDetails = `UPDATE district SET 
    district_name = "${districtName}",
    state_id = ${stateId},cases = ${cases},
    cured = ${cured},active=${active},deaths=${deaths};`;
    await db.run(updateDistrictDetails);
    response.send("District Details Updated");
  }
);

app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const stateStats = `SELECT SUM(cases) AS totalCases,
    SUM(cured) AS totalCured,SUM(active) AS totalActive,
    SUM(deaths) AS totalDeaths FROM district 
    WHERE state_id = ${stateId};`;
    const stateStatsDetails = await db.get(stateStats);
    response.send(stateStatsDetails);
  }
);

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const getUserDetailsQuery = `SELECT * FROM user WHERE username = "${username}";`;
  dbUser = await db.get(getUserDetailsQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordCorrect = await bcrypt.compare(password, dbUser.password);
    if (isPasswordCorrect) {
      const payload = { username: username };
      const jwtToken = await jwt.sign(payload, "MY_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

module.exports = app;
