const { db } = require("../config/firebase");

const getUserStatus = async (userId, communityId) => {
  const ref = db
    .collection("users")
    .doc(userId)
    .collection("communities")
    .doc(communityId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("No se encontro la comunidad");
  const user = doc.data();
  const result = user.status;
  return result;
};

module.exports = getUserStatus;
