const { db } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

const cardRepository = {
  getAllByDeckId: async function (userId, deckId) {
    const cardsRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc(deckId)
      .collection("cards");

    const snapshot = await cardsRef.get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  getById: async function (userId, deckId, cardId) {
    const cardRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc(deckId)
      .collection("cards")
      .doc(cardId);

    const doc = await cardRef.get();

    if (!doc.exists) {
      throw new Error("Card not found");
    }

    return { id: doc.id, ...doc.data() };
  },

  create: async function (userId, deckId, cardId, cardData) {
    const cardRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc(deckId)
      .collection("cards")
      .doc(cardId);

    const dataWithTimestamp = {
      ...cardData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await cardRef.set(dataWithTimestamp);

    const doc = await cardRef.get();
    return { id: doc.id, ...doc.data() };
  },

  update: async function (userId, deckId, cardId, cardData, merge = true) {
    const cardRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc(deckId)
      .collection("cards")
      .doc(cardId);

    const dataWithTimestamp = {
      ...cardData,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await cardRef.set(dataWithTimestamp, { merge });

    const doc = await cardRef.get();
    return { id: doc.id, ...doc.data() };
  },

  delete: async function (userId, deckId, cardId) {
    const cardRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc(deckId)
      .collection("cards")
      .doc(cardId);

    await cardRef.delete();
    return { success: true, message: "Card deleted successfully" };
  },

  // obtener cards pendientes de repaso (nextReviewDate <= hoy)
  getDueCards: async function (userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const decksRef = db.collection("users").doc(userId).collection("decks");
    const decksSnapshot = await decksRef.get();

    const dueCards = [];

    for (const deckDoc of decksSnapshot.docs) {
      const cardsRef = deckDoc.ref.collection("cards");
      const cardsSnapshot = await cardsRef
        .where("nextReviewDate", "<=", today)
        .get();

      cardsSnapshot.forEach((cardDoc) => {
        dueCards.push({
          id: cardDoc.id,
          deckId: deckDoc.id,
          ...cardDoc.data(),
        });
      });
    }

    return dueCards;
  },

  // actualizar progreso de repaso (SM-2)
  updateReviewProgress: async function (userId, deckId, cardId, reviewData) {
    const cardRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc(deckId)
      .collection("cards")
      .doc(cardId);

    const dataWithTimestamp = {
      easinessFactor: reviewData.easinessFactor,
      repetitions: reviewData.repetitions,
      intervalDays: reviewData.intervalDays,
      nextReviewDate: reviewData.nextReviewDate,
      lastReviewedDate: reviewData.lastReviewedDate,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await cardRef.update(dataWithTimestamp);

    const doc = await cardRef.get();
    return { id: doc.id, ...doc.data() };
  },
};

module.exports = cardRepository;
