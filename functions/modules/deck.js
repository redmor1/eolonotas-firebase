const express = require("express");
const cors = require("cors");
const functions = require("firebase-functions");
const logging = require("../src/middlewares/logging");
const errorHandler = require("../src/middlewares/errorHandler");
const deckService = require("../src/services/deckService");
const validateFirebaseIdToken = require("../src/middlewares/validateFirebaseIdToken");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(logging);
app.use(validateFirebaseIdToken);

app.get("/", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const decks = await deckService.getAllDecks(userId);
    res.status(200).json(decks);
  } catch (error) {
    next(error);
  }
});

app.post("/", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const deckData = { ...req.body, userId };
    const deck = await deckService.createDeck(deckData);
    res.status(201).json(deck);
  } catch (error) {
    next(error);
  }
});

app.get("/:id", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const deckId = req.params.id;
    const deck = await deckService.getDeckById(deckId, userId);
    res.status(200).json(deck);
  } catch (error) {
    next(error);
  }
});

app.put("/:id", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const deckId = req.params.id;
    const updateData = req.body;
    const updatedDeck = await deckService.updateDeck(
      deckId,
      userId,
      updateData
    );
    res.status(200).json(updatedDeck);
  } catch (error) {
    next(error);
  }
});

app.delete("/:id", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const deckId = req.params.id;
    const result = await deckService.deleteDeck(deckId, userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);
module.exports = functions.https.onRequest(app);
