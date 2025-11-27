const { admin } = require("../config/firebase");

async function validateFirebaseIdToken(req, res, next) {
  let idToken;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    // en emulador bypassear el verifyIdToken
    if (
      process.env.FUNCTIONS_EMULATOR === "true" &&
      idToken === "emulator-token"
    ) {
      req.user = { uid: "Qumjp5lKTJhHNvn2dyQGcnHK5o9H" };
    } else {
      console.log("Verifying ID token:", idToken);
      const decodedIdToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedIdToken;
    }
    next();
  } catch (error) {
    return res.status(403).json({ error: "Unauthorized" });
  }
}

module.exports = validateFirebaseIdToken;
