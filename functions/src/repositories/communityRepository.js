const { db, storage } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");
const cardRepository = require("./cardRepository");
const deckRepository = require("./deckRepository");

const communityRepository = {
  checkUserStatus: async (userId, communityId, role) => {
    const ref = db
      .collection("users")
      .doc(userId)
      .collection("communities")
      .doc(communityId);
    const doc = await ref.get();
    if (!doc.exists) return false;
    const user = doc.data();
    const result = user.status === role ? true : false;
    return result;
  },

  getUserData: async (userId, roleOrCommunityId) => {
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      throw new Error("No se encontró el usuario");
    }
    const user = doc.data();

    let role = null;
    if (roleOrCommunityId) {
      if (["owner", "member", "admin"].includes(roleOrCommunityId)) {
        role = roleOrCommunityId;
      } else {
        try {
          const statusDoc = await db
            .collection("users")
            .doc(userId)
            .collection("communities")
            .doc(roleOrCommunityId)
            .get();
          if (statusDoc.exists) {
            role = statusDoc.data().status;
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      }
    }

    const userDto = {
      id: doc.id,
      displayName: user.displayName,
      photoURL: user.photoURL || "",
      role: role,
    };
    return userDto;
  },

  getUserByEmail: async email => {
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", email).get();

    if (snapshot.empty) {
      throw new Error("No se encontró usuario con ese email");
    }

    const doc = snapshot.docs[0];
    const user = doc.data();

    return {
      id: doc.id,
      displayName: user.displayName,
      photoURL: user.photoURL || "",
      email: user.email,
    };
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
    const userCommunitiesRef = db
      .collection("users")
      .doc(userId)
      .collection("communities");
    
    const snapshot = await userCommunitiesRef.get();
    
    if (snapshot.empty) {
      return [];
    }

    const communityIds = snapshot.docs.map(doc => doc.id);
    
    const communityRefs = communityIds.map(id => 
      db.collection("communities").doc(id).get()
    );

    const communityDocs = await Promise.all(communityRefs);

    const result = communityDocs
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, ...doc.data() }));

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
    if (doc.data().ownerId !== userId)
      throw new Error("No tenés permisos para eliminar esta comunidad");

    const bucket = storage.bucket();

    // 1. Eliminar todos los mazos y sus imágenes
    const decksSnapshot = await communityRef.collection("decks").get();
    const deleteDecksPromises = decksSnapshot.docs.map(async deckDoc => {
      const cardsSnapshot = await deckDoc.ref.collection("cards").get();
      const deleteCardsPromises = cardsSnapshot.docs.map(async cardDoc => {
        const cardData = cardDoc.data();
        if (cardData.imagePath) {
          const folderPath = `communities/${communityId}/decks/${deckDoc.id}/cards/${cardDoc.id}/`;
          try {
            await bucket.deleteFiles({ prefix: folderPath });
          } catch (error) {
            console.error("Error eliminando imágenes de card:", error);
          }
        }
        await cardDoc.ref.delete();
      });
      await Promise.all(deleteCardsPromises);
      await deckDoc.ref.delete();
    });
    await Promise.all(deleteDecksPromises);



    // 3. Eliminar referencia en los usuarios miembros
    const members = doc.data().members || [];
    const removeMemberRefPromises = members.map(member => {
      return db
        .collection("users")
        .doc(member.id)
        .collection("communities")
        .doc(communityId)
        .delete();
    });
    await Promise.all(removeMemberRefPromises);

    // 4. Eliminar la comunidad
    await communityRef.delete();

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
      membersCount: FieldValue.increment(1),
    });
    const result = await communityRef.get();

    // Agregando la comunidad al usario con el estatus

    await userRef.set({ status: "member" });

    return result.data();
  },

  addMember: async (communityId, userData) => {
    const userRef = db
      .collection("users")
      .doc(userData.id)
      .collection("communities")
      .doc(communityId);

    const communityRef = db.collection("communities").doc(communityId);
    await communityRef.update({
      members: FieldValue.arrayUnion(userData),
      membersCount: FieldValue.increment(1),
    });
    const result = await communityRef.get();

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

      await communityRef.update({
        members: updatedMembers,
        membersCount: FieldValue.increment(-1),
      });

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
      cardCount: 0,
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

  rateDeck: async (communityId, deckId, userId, rating) => {
    const ratingRef = db
      .collection("communities")
      .doc(communityId)
      .collection("decks")
      .doc(deckId)
      .collection("ratings")
      .doc(userId);

    // Guardar o actualizar el voto del usuario
    await ratingRef.set(
      {
        userId,
        rating,
        ratedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Calcular promedio y cantidad de votos
    const ratingsSnapshot = await db
      .collection("communities")
      .doc(communityId)
      .collection("decks")
      .doc(deckId)
      .collection("ratings")
      .get();

    const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating);
    const averageRating =
      ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

    // Actualizar los campos en el deck
    const deckRef = db
      .collection("communities")
      .doc(communityId)
      .collection("decks")
      .doc(deckId);

    await deckRef.update({
      averageRating,
      ratingCount: ratings.length,
    });

    return { averageRating, ratingCount: ratings.length };
  },

  getDeckRating: async (communityId, deckId) => {
    const deckRef = db
      .collection("communities")
      .doc(communityId)
      .collection("decks")
      .doc(deckId);

    const doc = await deckRef.get();
    if (!doc.exists) throw new Error("Deck no encontrado");

    const data = doc.data();
    return {
      averageRating: data.averageRating || 0,
      ratingCount: data.ratingCount || 0,
    };
  },

  updateMemberRole: async (communityId, userId, newRole) => {
    const userRef = db
      .collection("users")
      .doc(userId)
      .collection("communities")
      .doc(communityId);

    const doc = await userRef.get();
    if (!doc.exists) throw new Error("El usuario no es parte de la comunidad");

    await userRef.update({ status: newRole });

    // tambien actualizar el rol en el array members de la comunidad
    const communityRef = db.collection("communities").doc(communityId);
    const communityDoc = await communityRef.get();

    if (communityDoc.exists) {
      const members = communityDoc.data().members || [];
      const updatedMembers = members.map(member => {
        if (member.id === userId) {
          return { ...member, role: newRole };
        }
        return member;
      });

      await communityRef.update({ members: updatedMembers });
    }

    return { success: true, userId, newRole };
  },

  getAllDecks: async communityId => {
    const communityRef = db.collection("communities").doc(communityId);
    const decksRef = communityRef.collection("decks");
    const snap = await decksRef.get();

    const decksWithUserNames = await Promise.all(
      snap.docs.map(async doc => {
        const deckData = doc.data();
        let userDisplayName = "";

        if (deckData.originalOwnerId) {
          try {
            const userDoc = await db
              .collection("users")
              .doc(deckData.originalOwnerId)
              .get();
            if (userDoc.exists) {
              userDisplayName = userDoc.data().displayName || "";
            }
          } catch (error) {
            console.error("Error obteniendo nombre de usuario:", error);
          }
        }

        return {
          id: doc.id,
          ...deckData,
          userDisplayName,
        };
      })
    );

    return decksWithUserNames;
  },
};

module.exports = communityRepository;
