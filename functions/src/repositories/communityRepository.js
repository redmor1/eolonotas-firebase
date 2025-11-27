const { db } = require("../config/firebase");

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

  getOwnerId: async communityId => {
    const communitieRef = db.collection("communities").doc(communityId);
    const doc = await communitieRef.get();
    if (!doc.exists) throw new Error("No se encontro la comunidad");
    const community = doc.data();
    const ownerId = community.ownerId;
    return ownerId;
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
};

module.exports = communityRepository;
