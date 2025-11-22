const functions = require("firebase-functions/v1");
const userService = require("../services/userService");

// trigger para crear perfil de usuario al registrarse
exports.createUserProfile = functions.auth.user().onCreate(async (user) => {
  try {
    await userService.createProfileOnAuth(user);
  } catch (error) {
    console.error("Error en trigger createUserProfile:", error);
  }
});
