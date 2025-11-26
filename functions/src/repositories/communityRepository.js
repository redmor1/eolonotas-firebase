const { db } = require("../config/firebase");

const communityRepository = {
  create: async (communityData, ownerId) => {
    const communityRef = db.collection("communities").doc();
    await communityRef.set(communityData);
    const doc = communityRef.get();
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
};

module.exports = communityRepository;
