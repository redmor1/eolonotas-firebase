const Joi = require("joi");
const cardRepository = require("../repositories/cardRepository");
const deckRepository = require("../repositories/deckRepository");
const { db } = require("../config/firebase");
const { calculateSM2 } = require("../utils/sm2Algorithm");

const baseCardSchema = Joi.object()
  .keys({
    type: Joi.string().valid("basic", "write", "fill", "image").required(),
    easinessFactor: Joi.number().min(1.3).optional().default(2.5),
    repetitions: Joi.number().integer().min(0).optional().default(0),
    intervalDays: Joi.number().integer().min(1).optional().default(1),
    nextReviewDate: Joi.date().optional().allow(null).default(null),
    lastReviewedDate: Joi.date().optional().allow(null).default(null),
  })
  .unknown(true);

// schemas especificos por tipo de card
const createCardBasicSchema = Joi.object({
  question: Joi.string().required(),
  answer: Joi.string().required(),
}).unknown(true);

const createCardWriteSchema = Joi.object({
  question: Joi.string().required(),
  answer: Joi.string().required(),
}).unknown(true);

const createCardFillSchema = Joi.object({
  fullContent: Joi.string().required(),
  fragments: Joi.string().required(),
}).unknown(true);

const createCardImageSchema = Joi.object({
  title: Joi.string().required(),
  originalImageUri: Joi.string(),
  modifiedImageUri: Joi.string(),
}).unknown(true);

const updateCardSchema = Joi.object({
  question: Joi.string().optional(),
  answer: Joi.string().optional(),
  fullContent: Joi.string().optional(),
  fragments: Joi.string().optional(),
  title: Joi.string().optional(),
  originalImageUri: Joi.string().optional(),
  modifiedImageUri: Joi.string().optional(),
}).unknown(true);

const reviewCardSchema = Joi.object({
  quality: Joi.number().min(0).max(5).required(),
});

const cardService = {
  getAllCards: async function (userId, deckId) {
    await deckRepository.getById(userId, deckId);

    const cards = await cardRepository.getAllByDeckId(userId, deckId);
    return cards;
  },

  createCard: async function (userId, deckId, cardData) {
    // 1. Validar esquema base
    const { error: baseError, value: baseValue } =
      baseCardSchema.validate(cardData);

    console.log(baseValue);
    if (baseError) {
      const e = new Error();
      e.status = 400;
      e.message = baseError.details[0].message;
      throw e;
    }

    // 2. Validar esquema específico según el tipo
    let specificError;

    if (baseValue.type === "basic") {
      const { error } = createCardBasicSchema.validate(baseValue);
      specificError = error;
    } else if (baseValue.type === "write") {
      const { error } = createCardWriteSchema.validate(baseValue);
      specificError = error;
    } else if (baseValue.type === "fill") {
      const { error } = createCardFillSchema.validate(baseValue);
      specificError = error;
    } else if (baseValue.type === "image") {
      const { error } = createCardImageSchema.validate(baseValue);
      specificError = error;
    }

    if (specificError) {
      const e = new Error();
      e.status = 400;
      e.message = specificError.details[0].message;
      throw e;
    }

    // verifica que el deck le pertenece al usuario
    await deckRepository.getById(userId, deckId);

    const cardRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc(deckId)
      .collection("cards")
      .doc();

    const newCard = await cardRepository.create(
      userId,
      deckId,
      cardRef.id,
      baseValue
    );

    return newCard;
  },

  getCardById: async function (userId, deckId, cardId) {
    // verifica que el deck le pertenece al usuario
    await deckRepository.getById(userId, deckId);
    const card = await cardRepository.getById(userId, deckId, cardId);
    return card;
  },

  updateCard: async function (userId, deckId, cardId, updateData) {
    const { error } = updateCardSchema.validate(updateData);

    if (error) {
      const e = new Error();
      e.status = 400;
      e.message = error.details[0].message;
      throw e;
    }

    // verifica que el deck le pertenece al usuario
    await deckRepository.getById(userId, deckId);

    // verifica que la card existe
    await cardRepository.getById(userId, deckId, cardId);

    const updatedCard = await cardRepository.update(
      userId,
      deckId,
      cardId,
      updateData,
      true
    );

    return updatedCard;
  },

  deleteCard: async function (userId, deckId, cardId) {
    // verifica que el deck le pertenece al usuario
    await deckRepository.getById(userId, deckId);

    // verifica que la card existe
    await cardRepository.getById(userId, deckId, cardId);

    const result = await cardRepository.delete(userId, deckId, cardId);
    return result;
  },

  getDueCards: async function (userId) {
    const dueCards = await cardRepository.getDueCards(userId);
    return dueCards;
  },

  deleteAllCardsByDeckId: async function (userId, deckId) {
    const cards = await cardRepository.getAllByDeckId(userId, deckId);

    for (const card of cards) {
      await cardRepository.delete(userId, deckId, card.id);
    }

    return { success: true, deletedCount: cards.length };
  },

  // registrar un repaso
  reviewCard: async function (userId, deckId, cardId, quality) {
    const { error } = reviewCardSchema.validate({ quality });

    if (error) {
      const e = new Error();
      e.status = 400;
      e.message = error.details[0].message;
      throw e;
    }

    const card = await cardRepository.getById(userId, deckId, cardId);

    const reviewData = calculateSM2(
      quality,
      card.easinessFactor,
      card.repetitions,
      card.intervalDays
    );

    const updatedCard = await cardRepository.updateReviewProgress(
      userId,
      deckId,
      cardId,
      reviewData
    );

    return updatedCard;
  },
};

module.exports = cardService;
