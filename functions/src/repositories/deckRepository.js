const { db } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

const deckRepository = {
  // obtener todos los decks de un usuario
  getAllByUserId: async function (userId) {
    const decksRef = db.collection("users").doc(userId).collection("decks");
    const snapshot = await decksRef.get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  // obtener un deck especifico
  getById: async function (userId, deckId) {
    const deckRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc(deckId);

    const doc = await deckRef.get();

    if (!doc.exists) {
      throw new Error("Deck not found");
    }

    return { id: doc.id, ...doc.data() };
  },

  create: async function (userId, deckData) {
    const deckRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc();

    const dataWithTimestamp = {
      ...deckData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await deckRef.set(dataWithTimestamp);

    const doc = await deckRef.get();
    return { id: doc.id, ...doc.data() };
  },

  update: async function (userId, deckId, deckData, merge = true) {
    const deckRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc(deckId);

    const dataWithTimestamp = {
      ...deckData,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await deckRef.set(dataWithTimestamp, { merge });

    const doc = await deckRef.get();
    return { id: doc.id, ...doc.data() };
  },

  delete: async function (userId, deckId) {
    const deckRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc(deckId);

    await deckRef.delete();
    return { success: true, message: "Deck deleted successfully" };
  },

  getUpdatedAt: async function (userId, deckId) {
    const deckRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc(deckId);

    const doc = await deckRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return data && data.updatedAt ? data.updatedAt : 0;
  },

  updateCardCount: async function (userId, deckId, incrementValue) {
    const deckRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc(deckId);

    await deckRef.update({
      cardCount: FieldValue.increment(incrementValue),
      updatedAt: FieldValue.serverTimestamp(),
    });
  },
};

module.exports = deckRepository;
