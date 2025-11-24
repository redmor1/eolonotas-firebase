const Joi = require("joi");
const userRepository = require("../repositories/userRepository");
const { auth } = require("../config/firebase");

const updateProfileSchema = Joi.object().keys({
  displayName: Joi.string().min(3).max(50).optional(),
  photoURL: Joi.string().uri().optional(),
  preferences: Joi.object()
    .keys({
      theme: Joi.string().valid("light", "dark").optional(),
      notifications: Joi.boolean().optional(),
    })
    .optional(),
});

const userService = {
  getProfile: async function getProfile(userId) {
    const user = await userRepository.getById(userId);

    return user;
  },

  updateProfile: async function updateProfile(userId, updateData) {
    const { error } = updateProfileSchema.validate(updateData);

    if (error) {
      const e = new Error();
      e.status = 400;
      e.message = error.details[0].message;
      throw e;
    }
    // actualiza el displayname y photourl en servicio de auth
    if (updateData.displayName || updateData.photoURL) {
      try {
        await auth.updateUser(userId, {
          displayName: updateData.displayName,
          photoURL: updateData.photoURL,
        });
      } catch (err) {
        console.error("Error updating auth user:", err);
      }
    }

    const updatedUser = await userRepository.update(userId, updateData, true);

    return updatedUser;
  },

  // servicio para trigger
  initializeNewUser: async function (uid, email, displayName, photoURL) {
    // crear perfil
    await userRepository.create(uid, { email, displayName, photoURL });

    console.log(`Usuario ${uid} inicializado`);
  },
};

module.exports = userService;
