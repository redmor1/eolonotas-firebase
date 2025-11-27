const express = require("express");
const cors = require("cors");
const functions = require("firebase-functions");
const logging = require("../src/middlewares/logging");
const errorHandler = require("../src/middlewares/errorHandler");
const communityService = require("../src/services/communityService");
const validateFirebaseIdToken = require("../src/middlewares/validateFirebaseIdToken");
const roleMiddleware = require("../src/middlewares/roleMiddleware");
const validateRole = require("../src/middlewares/validateRole");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(logging);
app.use(validateFirebaseIdToken);

//Controlers y Rutas

app.post("/", async (req, res, next) => {
  try {
    const data = req.body;
    console.log(data);
    const ownerId = req.user.uid;
    console.log(ownerId);
    const communityData = { ...data, ownerId: ownerId };
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

app.get("/:cId", async (req, res, next) => {
  try {
    const communityId = req.params.cId;
    const result = await communityService.getById(communityId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/:cId/members", async (req, res, next) => {
  try {
    const communityId = req.params.cId;
    const result = await communityService.getAllMembers(communityId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.put("/:cId", async (req, res, next) => {
  try {
    const communityId = req.params.cId;
    const userId = req.user.uid;
    const data = req.body;
    const result = await communityService.update(communityId, userId, data);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.delete("/:cId", async (req, res, next) => {
  try {
    const communityId = req.params.cId;
    const userId = req.user.uid;
    const result = await communityService.delete(communityId, userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.delete("/:cId/members/:userId", async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const communityId = req.params.cId;
    const result = await communityService.removeMember(communityId, userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/:cId/join", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const communityId = req.params.cId;
    console.log(userId);
    const result = await communityService.join(communityId, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post(
  "/:cId/members",
  roleMiddleware,
  validateRole("admin", "owner"),
  async (req, res, next) => {
    try {
      const communityId = req.params.cId;
      const userId = req.body.userId;
      console.log(userId);
      console.log(communityId);
      const result = await communityService.addMember(communityId, userId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

app.post("/:cId/decks/:dId", async (req, res, next) => {
  try {
    const communityId = req.params.cId;
    const deckId = req.params.dId;
    const userId = req.user.uid;
    const result = await communityService.addDeck(userId, communityId, deckId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/:cId/decks/", async (req, res, next) => {
  try {
    const communityId = req.params.cId;
    const result = await communityService.getAllDecks(communityId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/:cId/decks/:dId/download", async (req, res, next) => {
  try {
    const communityId = req.params.cId;
    const deckId = req.params.dId;
    const userId = req.user.uid;
    const result = await communityService.dowloadDeck(
      userId,
      communityId,
      deckId
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.delete("/:cId/decks/:dId", async (req, res, next) => {
  try {
    const communityId = req.params.cId;
    const deckId = req.params.dId;
    const result = await communityService.deleteDeck(communityId, deckId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/:cId/ratings", async (req, res, next) => {
  try {
    const communityId = req.params.cId;
    const userId = req.user.uid;
    const raiting = req.body.rate;
    const result = await communityService.rateCommunity(
      communityId,
      userId,
      raiting
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/:cId/ratings", async (req, res, next) => {
  try {
    const communityId = req.params.cId;
    const result = await communityService.getCommunityRating(communityId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);
module.exports = functions.https.onRequest(app);
