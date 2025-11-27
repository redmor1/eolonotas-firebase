const Joi = require("joi");
const deckRepository = require("../repositories/deckRepository");
const cardService = require("./cardService");


const createDeckSchema = Joi.object().keys({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional().allow(""),
  userId: Joi.string().required(),
  isFavorite: Joi.boolean().optional().default(false),
  cardCount: Joi.number().optional().default(0),
});

const updateDeckSchema = Joi.object().keys({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional().allow(""),
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

    const newDeck = await deckRepository.create(userId, value);

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

  incrementCardCount: async function (userId, deckId, amount) {
    await deckRepository.updateCardCount(userId, deckId, amount);
  },
};

module.exports = deckService;
