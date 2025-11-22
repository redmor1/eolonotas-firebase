const functions = require("firebase-functions/v1");
const userService = require("../services/userService");

// trigger para crear perfil de usuario al registrarse
exports.initializeNewUser = functions.auth.user().onCreate(async (user) => {
  try {
    const { uid, email, displayName, photoURL } = user;
    await userService.initializeNewUser(uid, email, displayName, photoURL);
  } catch (error) {
    console.error("Error en trigger initializeNewUser:", error);
  }
});
