const {
  onDocumentCreated,
  onDocumentDeleted,
} = require("firebase-functions/v2/firestore");
const deckService = require("../services/deckService");

exports.onCardCreated = onDocumentCreated(
  "users/{userId}/decks/{deckId}/cards/{cardId}",
  async (event) => {
    const { userId, deckId } = event.params;

    try {
      await deckService.incrementCardCount(userId, deckId, 1);
      console.log(`Card count incremented for deck ${deckId}`);
    } catch (error) {
      console.error(`Error incrementing card count for deck ${deckId}:`, error);
    }
  }
);

exports.onCardDeleted = onDocumentDeleted(
  "users/{userId}/decks/{deckId}/cards/{cardId}",
  async (event) => {
    const { userId, deckId } = event.params;

    try {
      await deckService.incrementCardCount(userId, deckId, -1);
      console.log(`Card count decremented for deck ${deckId}`);
    } catch (error) {
      console.error(`Error decrementing card count for deck ${deckId}:`, error);
    }
  }
);
