const express = require("express");
const cors = require("cors");
const functions = require("firebase-functions");
const logging = require("../src/middlewares/logging");
const errorHandler = require("../src/middlewares/errorHandler");
const cardService = require("../src/services/cardService");
const validateFirebaseIdToken = require("../src/middlewares/validateFirebaseIdToken");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(logging);
app.use(validateFirebaseIdToken);

app.get("/decks/:deckId/cards", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { deckId } = req.params;
    const cards = await cardService.getAllCards(userId, deckId);
    res.status(200).json(cards);
  } catch (error) {
    next(error);
  }
});

app.post("/decks/:deckId/cards", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { deckId } = req.params;
    const cardData = req.body;
    const card = await cardService.createCard(userId, deckId, cardData);
    res.status(201).json(card);
  } catch (error) {
    next(error);
  }
});

app.get("/decks/:deckId/cards/:cardId", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { deckId, cardId } = req.params;
    const card = await cardService.getCardById(userId, deckId, cardId);
    res.status(200).json(card);
  } catch (error) {
    next(error);
  }
});

app.put("/decks/:deckId/cards/:cardId", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { deckId, cardId } = req.params;
    const updateData = req.body;
    const updatedCard = await cardService.updateCard(
      userId,
      deckId,
      cardId,
      updateData
    );
    res.status(200).json(updatedCard);
  } catch (error) {
    next(error);
  }
});

app.delete("/decks/:deckId/cards/:cardId", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { deckId, cardId } = req.params;
    const result = await cardService.deleteCard(userId, deckId, cardId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// obtener cards que estan para repasar hoy
app.get("/due", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const dueCards = await cardService.getDueCards(userId);
    res.status(200).json(dueCards);
  } catch (error) {
    next(error);
  }
});

// repasar una card
app.post("/decks/:deckId/cards/:cardId/review", async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { deckId, cardId } = req.params;
    const { quality } = req.body;
    const updatedCard = await cardService.reviewCard(
      userId,
      deckId,
      cardId,
      quality
    );
    res.status(200).json(updatedCard);
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);
module.exports = functions.https.onRequest(app);
