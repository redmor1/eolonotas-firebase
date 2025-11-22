const { db } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

const userRepository = {
  getById: async function (userId) {
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      throw new Error("User not found");
    }

    return { ...doc.data(), id: doc.id };
  },

  create: async function (userId, userData) {
    const userRef = db.collection("users").doc(userId);
    const dataWithTimestamp = {
      ...userData,
      preferences: userData.preferences || {
        theme: "dark",
        notifications: false,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await userRef.set(dataWithTimestamp);

    // obtener el documento recien creado para devolver los timestamps reales
    const doc = await userRef.get();
    return { ...doc.data(), id: doc.id };
  },

  update: async function (userId, userData, merge = true) {
    const userRef = db.collection("users").doc(userId);
    const dataWithTimestamp = {
      ...userData,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await userRef.set(dataWithTimestamp, { merge });

    // obtener el documento actualizado para devolver el timestamp real
    const doc = await userRef.get();
    return { ...doc.data(), id: doc.id };
  },

  getUpdatedAt: async function (userId) {
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return data && data.updatedAt ? data.updatedAt : 0;
  },
};

module.exports = userRepository;
