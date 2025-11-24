const Joi = require("joi");
const deckRepository = require("../repositories/deckRepository");
const cardService = require("./cardService");
const { db } = require("../config/firebase");

const createDeckSchema = Joi.object().keys({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional().allow(""),
  userId: Joi.string().required(),
  isPublic: Joi.boolean().optional().default(false),
  isFavorite: Joi.boolean().optional().default(false),
});

const updateDeckSchema = Joi.object().keys({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional().allow(""),
  isPublic: Joi.boolean().optional(),
  isFavorite: Joi.boolean().optional(),
});

const deckService = {
  getAllDecks: async function getAllDecks(userId) {
    const decks = await deckRepository.getAllByUserId(userId);
    return decks;
  },

  createDeck: async function createDeck(deckData) {
    const { value, error } = createDeckSchema.validate(deckData);

    if (error) {
      const e = new Error();
      e.status = 400;
      e.message = error.details[0].message;
      throw e;
    }

    const userId = value.userId;

    // generar un nuevo ID para el mazo
    const deckRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc();

    const newDeck = await deckRepository.create(userId, deckRef.id, value);

    return newDeck;
  },

  getDeckById: async function getDeckById(deckId, userId) {
    const deck = await deckRepository.getById(userId, deckId);
    return deck;
  },

  updateDeck: async function updateDeck(deckId, userId, updateData) {
    const { error } = updateDeckSchema.validate(updateData);

    if (error) {
      const e = new Error();
      e.status = 400;
      e.message = error.details[0].message;
      throw e;
    }

    // verificar que el mazo existe y pertenece al usuario
    await deckRepository.getById(userId, deckId);

    const updatedDeck = await deckRepository.update(
      userId,
      deckId,
      updateData,
      true
    );

    return updatedDeck;
  },

  deleteDeck: async function deleteDeck(deckId, userId) {
    // verificar que el mazo existe y pertenece al usuario
    await deckRepository.getById(userId, deckId);

    // primero eliminar todas las cards asociadas al mazo (firebase no elimina las subcolecciones automaticamente)
    await cardService.deleteAllCardsByDeckId(userId, deckId);

    // despues eliminar el deck
    const result = await deckRepository.delete(userId, deckId);

    return result;
  },
};

module.exports = deckService;
