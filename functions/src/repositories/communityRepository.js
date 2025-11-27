const { db, admin, storage } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");
const cardRepository = require("./cardRepository");
const deckRepository = require("./deckRepository");
const { getAllDecks } = require("../services/deckService");

const communityRepository = {
  checkUserStatus: async (userId, communityId, role) => {
    const ref = db
      .collection("users")
      .doc(userId)
      .collection("communities")
      .doc(communityId);
    const doc = await ref.get();
    if (!doc.exists) throw new Error("No se encontro la comunidad");
    const user = doc.data();
    const result = user.status === role ? true : false;
    return result;
  },

  getUserData: async userId => {
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      throw new Error("No se encontró el usuario");
    }
    const user = doc.data();
    //console.log(user);
    const userDto = {
      id: doc.id,
      displayName: user.displayName,
      photoUrl: user.photoUrl || "",
    };
    return userDto;
  },

  create: async (communityData, ownerId) => {
    const communityRef = db.collection("communities").doc();
    await communityRef.set(communityData);
    const newCommunityId = communityRef.id;
    const status = { status: "owner" };

    const userRef = db
      .collection("users")
      .doc(ownerId)
      .collection("communities")
      .doc(newCommunityId);

    await userRef.set(status);
    return newCommunityId;
  },
  getMine: async userId => {
    const communityRef = db.collection("communities");
    const snap = await communityRef.where("ownerId", "==", userId).get();
    const result = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return result;
  },
  getPublic: async () => {
    const communityRef = db.collection("communities");
    const snap = await communityRef.where("isPublic", "==", true).get();

    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  getAllMine: async userId => {
    let result = [];
    const communityRef = db.collection("communities");
    const ownedSnap = await communityRef.where("ownerId", "==", userId).get();
    const memberSnap = await communityRef
      .where("members", "array-contains", userId)
      .get();

    result = [
      ...memberSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ...ownedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    ];
    return result;
  },
  getById: async communityId => {
    const communityRef = db.collection("communities").doc(communityId);
    const doc = await communityRef.get();
    if (!doc.exists) throw new Error("No se encontro la comunidad");
    return { id: doc.id, ...doc.data() };
  },

  update: async (communityId, updateData) => {
    const communityRef = db.collection("communities").doc(communityId);
    const doc = await communityRef.get();
    if (!doc.exists) throw new Error("No se encontro la comunidad");
    await communityRef.update(updateData);
    const updatedDoc = await communityRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  },

  // para eliminar la comunidad d solo el owner
  delete: async (communityId, userId) => {
    const communityRef = db.collection("communities").doc(communityId);
    const doc = await communityRef.get();
    if (!doc.exists) throw new Error("No se encontró la comunidad");
    if (!doc.data().ownerId !== userId)
      throw new Error("No tenés permisos para eliminar esta comunidad");

    await communityRef.delete();

    // Esto va para elmimnar la referencia
    const userRef = db
      .collection("users")
      .doc(userId)
      .collection("communities")
      .doc(communityId);
    await userRef.delete();

    return { success: true };
  },

  //PAra los usuarios

  join: async (communityId, userData) => {
    const userRef = db
      .collection("users")
      .doc(userData.id)
      .collection("communities")
      .doc(communityId);

    const communityRef = db.collection("communities").doc(communityId);
    await communityRef.update({
      members: FieldValue.arrayUnion(userData),
    });
    const result = await communityRef.get();

    // Agregando la comunidad al usario con el estatus

    await userRef.set({ status: "member" });

    return result.data();
  },
  getAllMembers: async communityId => {
    const communityRef = db.collection("communities").doc(communityId);
    const snap = await communityRef.get();

    if (!snap.exists) {
      throw new Error("Community not found");
    }

    const data = snap.data();
    const members = data.members || [];
    return members;
  },
  removeMember: async (communityId, userId) => {
    try {
      const communityRef = db.collection("communities").doc(communityId);
      const snap = await communityRef.get();

      if (!snap.exists) throw new Error("Community not found");

      const data = snap.data();
      const members = data.members || [];

      const updatedMembers = members.filter(m => m.id !== userId);

      await communityRef.update({ members: updatedMembers });

      return { success: true, removed: userId };
    } catch (error) {
      console.error("Error removing member:", error);
      throw error;
    }
  },

  // Para administrar mazos
  shareDeckToCommunity: async (userId, deckId, communityId) => {
    const bucket = storage.bucket();
    const deck = await deckRepository.getById(userId, deckId);

    const communityDeckRef = db
      .collection("communities")
      .doc(communityId)
      .collection("decks")
      .doc();

    const communityDeckData = {
      ...deck,
      originalOwnerId: userId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    delete communityDeckData.id;

    await communityDeckRef.set(communityDeckData);
    const cards = await cardRepository.getAllByDeckId(userId, deckId);
    const copyPromises = cards.map(async card => {
      const communityCardRef = communityDeckRef.collection("cards").doc();
      const cardData = {
        ...card,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      delete cardData.id;
      if (card.imagePath) {
        const originalPrefix = `users/${userId}/decks/${deckId}/cards/${card.id}/`;
        const newPrefix = `communities/${communityId}/decks/${communityDeckRef.id}/cards/${communityCardRef.id}/`;

        const [files] = await bucket.getFiles({ prefix: originalPrefix });
        const copyFilePromises = files.map(file =>
          file.copy(bucket.file(file.name.replace(originalPrefix, newPrefix)))
        );

        await Promise.all(copyFilePromises);

        // Guardar path de imagen en la card
        cardData.imagePath = newPrefix + card.imagePath.split("/").pop();
      }

      await communityCardRef.set(cardData);
    });

    await Promise.all(copyPromises);

    return { id: communityDeckRef.id, ...communityDeckData };
  },
  downloadDeckToUser: async (userId, communityId, deckId) => {
    const bucket = storage.bucket();

    const communityDeckRef = db
      .collection("communities")
      .doc(communityId)
      .collection("decks")
      .doc(deckId);

    const deckDoc = await communityDeckRef.get();
    if (!deckDoc.exists) throw new Error("Deck no encontrado en la comunidad");

    const deck = deckDoc.data();

    const userDeckRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc();

    const userDeckData = {
      ...deck,
      originalCommunityId: communityId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    delete userDeckData.id;
    delete userDeckData.originalOwnerId;

    await userDeckRef.set(userDeckData);

    const cardsSnapshot = await communityDeckRef.collection("cards").get();

    const copyCardsPromises = cardsSnapshot.docs.map(async cardDoc => {
      const card = cardDoc.data();

      const userCardRef = userDeckRef.collection("cards").doc();
      const cardData = {
        ...card,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      delete cardData.id;

      // Copiar imagenes si existen
      if (card.imagePath) {
        const originalPrefix = `communities/${communityId}/decks/${deckId}/cards/${cardDoc.id}/`;
        const newPrefix = `users/${userId}/decks/${userDeckRef.id}/cards/${userCardRef.id}/`;

        const [files] = await bucket.getFiles({ prefix: originalPrefix });
        const copyFilePromises = files.map(file =>
          file.copy(bucket.file(file.name.replace(originalPrefix, newPrefix)))
        );
        await Promise.all(copyFilePromises);

        cardData.imagePath = newPrefix + card.imagePath.split("/").pop();
      }

      await userCardRef.set(cardData);
    });

    await Promise.all(copyCardsPromises);

    return { id: userDeckRef.id, ...userDeckData };
  },
  deleteDeck: async (communityId, deckId) => {
    const deckRef = db
      .collection("communities")
      .doc(communityId)
      .collection("decks")
      .doc(deckId);

    const cardsSnapshot = await deckRef.collection("cards").get();
    const bucket = storage.bucket();

    const deleteCardsPromises = cardsSnapshot.docs.map(async cardDoc => {
      const cardData = cardDoc.data();

      if (cardData.imagePath) {
        const folderPath = `communities/${communityId}/decks/${deckId}/cards/${cardDoc.id}/`;
        try {
          await bucket.deleteFiles({ prefix: folderPath });
        } catch (error) {
          console.error("Error eliminando imágenes de card:", error);
        }
      }

      await cardDoc.ref.delete();
    });

    await Promise.all(deleteCardsPromises);

    await deckRef.delete();

    return {
      success: true,
      message: "Deck eliminado de la comunidad correctamente",
    };
  },

  // Para los ratings

  rateCommunity: async (communityId, userId, rating) => {
    const ratingRef = db
      .collection("communities")
      .doc(communityId)
      .collection("ratings")
      .doc(userId);

    // Guardar o actualizar el voto del usuario
    await ratingRef.set(
      {
        rating,
        ratedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Calcular promedio y cantidad de votos
    const ratingsSnapshot = await db
      .collection("communities")
      .doc(communityId)
      .collection("ratings")
      .get();

    const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating);
    const averageRating =
      ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

    // Actualizar los campos en la comunidad
    const communityRef = db.collection("communities").doc(communityId);
    await communityRef.update({
      averageRating,
      ratingCount: ratings.length,
    });

    return { averageRating, ratingCount: ratings.length };
  },

  getCommunityRating: async communityId => {
    const communityRef = db.collection("communities").doc(communityId);
    const doc = await communityRef.get();
    if (!doc.exists) throw new Error("Comunidad no encontrada");

    const data = doc.data();
    return {
      averageRating: data.averageRating || 0,
      ratingCount: data.ratingCount || 0,
    };
  },
};

module.exports = communityRepository;
