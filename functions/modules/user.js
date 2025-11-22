const express = require("express");
const cors = require("cors");
const functions = require("firebase-functions");
const logging = require("../src/middlewares/logging");
const errorHandler = require("../src/middlewares/errorHandler");
const userService = require("../src/services/userService");
const validateFirebaseIdToken = require("../src/middlewares/validateFirebaseIdToken");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(logging);
app.use(validateFirebaseIdToken);

// sincronizar usuario
app.post("/sync", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { localUpdatedAt, localData } = req.body;
    const result = await userService.syncUser(
      userId,
      localUpdatedAt,
      localData
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/profile", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const profile = await userService.getProfile(userId);
    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
});

app.put("/profile", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const updateData = req.body;
    const updatedProfile = await userService.updateProfile(userId, updateData);
    res.status(200).json(updatedProfile);
  } catch (error) {
    next(error);
  }
});

// TODO: conseguir perfil publico de otro usuario
app.get("/public-profile/:id", async (req, res) => {});

app.use(errorHandler);
module.exports = functions.https.onRequest(app);
