const express = require("express");
const cors = require("cors");
const functions = require("firebase-functions");
const logging = require("../src/middlewares/logging");
const errorHandler = require("../src/middlewares/errorHandler");
const communityService = require("../src/services/communityService");
const validateFirebaseIdToken = require("../src/middlewares/validateFirebaseIdToken");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(logging);
app.use(validateFirebaseIdToken);

//Controlers y Rutas

app.post("/", async (req, res, next) => {
  try {
    const communityData = req.body;
    const { ownerId } = communityData;
    await communityService.create(communityData, ownerId);
    res.status(201).json({ mensaje: "comunidad creada con éxito" });
  } catch (error) {
    next(error);
  }
});

app.get("/", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const filter = req.query.filter;
    const result = await communityService.getWithFilter(userId, filter);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);
module.exports = functions.https.onRequest(app);
