/**
 * Import function triggers from their respective submodules
 * usando Firebase Functions v2
 */

const { setGlobalOptions } = require("firebase-functions/v2"); // v2 API
const userApp = require("./modules/user");
const deckApp = require("./modules/deck");
const cardApp = require("./modules/card");
const communityApp = require("./modules/community");
const initializeNewUser = require("./src/triggers/userTriggers");
const { onCardCreated, onCardDeleted } = require("./src/triggers/cardTriggers");

// Configuración global de máximo de instancias (v2)
setGlobalOptions({ maxInstances: 10 });

// Exportar funciones de forma clara
exports.initializeNewUser = initializeNewUser;
exports.user = userApp;
exports.deck = deckApp;
exports.card = cardApp;
exports.community = communityApp;
exports.onCardCreated = onCardCreated;
exports.onCardDeleted = onCardDeleted;
