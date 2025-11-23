const Joi = require("joi");
const userRepository = require("../repositories/userRepository");

const syncUserSchema = Joi.object().keys({
  localUpdatedAt: Joi.date().timestamp().required(),
  localData: Joi.object()
    .keys({
      displayName: Joi.string().min(3).max(50).optional(),
      preferences: Joi.object()
        .keys({
          theme: Joi.string().valid("light", "dark"),
          notifications: Joi.boolean(),
        })
        .optional(),
    })
    .required(),
});

const updateProfileSchema = Joi.object().keys({
  displayName: Joi.string().min(3).max(50).optional(),
  preferences: Joi.object()
    .keys({
      theme: Joi.string().valid("light", "dark").optional(),
      notifications: Joi.boolean().optional(),
    })
    .optional(),
});

const userService = {
  syncUser: async function syncUser(userId, localUpdatedAt, localData) {
    const { error } = syncUserSchema.validate({
      localUpdatedAt,
      localData,
    });

    if (error) {
      const e = new Error();
      e.status = 400;
      e.message = error.details[0].message;
      throw e;
    }

    // obtenr usuario de firestore
    const remoteUser = await userRepository.getById(userId);

    // si no existe, se crea con datos locales
    if (!remoteUser) {
      const newUserData = await userRepository.create(userId, {
        ...localData,
        updatedAt: localUpdatedAt,
      });

      return {
        status: "synced_to_cloud",
        data: newUserData,
      };
    }

    const remoteUpdatedAt = remoteUser.updatedAt || 0;

    // comparar timestamps
    if (localUpdatedAt > remoteUpdatedAt) {
      // local es mas reciente -> actualizar firebase
      await userRepository.update(userId, {
        ...localData,
        updatedAt: localUpdatedAt,
      });

      return {
        status: "synced_to_cloud",
        timestamp: localUpdatedAt,
      };
    } else if (remoteUpdatedAt > localUpdatedAt) {
      // firebase es mas reciente -> enviar datos remotos
      return {
        status: "synced_to_local",
        data: remoteUser,
        timestamp: remoteUpdatedAt,
      };
    }

    // estan sincronizados
    return {
      status: "up_to_date",
      timestamp: remoteUpdatedAt,
    };
  },

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
