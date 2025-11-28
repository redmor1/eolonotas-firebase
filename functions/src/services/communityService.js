const Joi = require("joi");
const communityRepository = require("../repositories/communityRepository");

const createSchema = Joi.object().keys({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().optional().default("").max(250),
  isPublic: Joi.boolean().optional().default(false),
  ownerId: Joi.string()
    .required()
    .min(28)
    .max(28)
    .message("El id del usuario no es válido"),
});

const communityIdSchema = Joi.string().required().min(20).max(20);

// const ratingSchema = Joi.number().integer().min(1).max(5).required();

const updateUserStatuSchema = Joi.string()
  .valid("admin", "owner", "member")
  .required();

const userIdSchema = Joi.string()
  .required()
  .min(28)
  .max(28)
  .message("El id del usuario no es válido");

const updateNameDescriptionSchema = Joi.object()
  .keys({
    name: Joi.string().required().min(3).max(100),
    description: Joi.string().optional().default("").max(250),
  })
  .or("name", "description");

const communityService = {
  create: async (data, ownerId) => {
    const { error, value } = createSchema.validate(data);
    if (error) {
      const e = new Error();
      e.status = 400;
      e.message = error.details[0].message;
      throw e;
    }

    const ownerData = await communityRepository.getUserData(ownerId, "owner");
    const communityDto = {
      ...value,
      members: [ownerData],
      membersCount: 1,
    };
    const communityId = await communityRepository.create(communityDto, ownerId);
    return communityId;
  },
  getWithFilter: async (userId, filter) => {
    let result = [];
    if (filter === "mine") {
      result = await communityRepository.getAllMine(userId);
    } else {
      result = await communityRepository.getPublic()
    }
    return result;
  },
  getById: async data => {
    const { error, value } = communityIdSchema.validate(data);
    if (error) {
      const e = new Error();
      e.status = 400;
      e.message = error.details[0].message;
      throw e;
    }
    const result = communityRepository.getById(value);
    return result;
  },
  update: async (communityId, userId, data) => {
    const { error: dataError, value: dataValue } =
      updateNameDescriptionSchema.validate(data);
    if (dataError) {
      const e = new Error();
      e.status = 400;
      e.message = dataError.details[0].message;
      throw e;
    }
    const { error: commIdError, value: commIdValue } =
      communityIdSchema.validate(communityId);
    if (commIdError) {
      const e = new Error();
      e.status = 400;
      e.message = commIdError.details[0].message;
      throw e;
    }


    const isOwner = communityRepository.checkUserStatus(
      userId,
      commIdValue,
      "owner"
    );

    if (!isOwner) {
      throw new Error("Solo el owner puede actualizar la comunidad");
    }

    const result = await communityRepository.update(commIdValue, dataValue);
    return result;
  },

  delete: async (communityId, userId) => {
    const { error: commIdError, value: commIdValue } =
      communityIdSchema.validate(communityId);
    if (commIdError) {
      const e = new Error();
      e.status = 400;
      e.message = commIdError.details[0].message;
      throw e;
    }
    const isOwner = communityRepository.checkUserStatus(
      userId,
      commIdValue,
      "owner"
    );

    if (!isOwner) {
      throw new Error("Solo el owner puede actualizar la comunidad");
    }

    const result = communityRepository.delete(commIdValue, userId);
    return result;
  },

  // Para los usuarios
  join: async (communityId, userId) => {
    const { error: userIdError, value: userIdValue } =
      userIdSchema.validate(userId);
    if (userIdError) {
      const e = new Error();
      e.status = 400;
      e.message = userIdError.details[0].message;
      throw e;
    }

    const { error: commIdError, value: commIdValue } =
      communityIdSchema.validate(communityId);
    if (commIdError) {
      const e = new Error();
      e.status = 400;
      e.message = commIdError.details[0].message;
      throw e;
    }
    const userData = await communityRepository.getUserData(userIdValue, "member");
    const result = await communityRepository.addMember(commIdValue, userData);
    return result;
  },
  addMember: async (communityId, userId) => {
    const { error: userIdError, value: userIdValue } =
      userIdSchema.validate(userId);
    if (userIdError) {
      const e = new Error();
      e.status = 400;
      e.message = userIdError.details[0].message;
      throw e;
    }

    const { error: commIdError, value: commIdValue } =
      communityIdSchema.validate(communityId);
    if (commIdError) {
      const e = new Error();
      e.status = 400;
      e.message = commIdError.details[0].message;
      throw e;
    }

    const isMember = await communityRepository.checkUserStatus(
      userIdValue,
      commIdValue,
      "member"
    );
    const isAdmin = await communityRepository.checkUserStatus(
      userIdValue,
      commIdValue,
      "admin"
    );
    let result;
    if (!isMember && !isAdmin) {
      const userData = await communityRepository.getUserData(userIdValue, "member");
      result = await communityRepository.join(commIdValue, userData);
    } else {
      result = { mensaje: "El usuario ya existe en la comunidad" };
    }
    return result;
  },

  inviteMember: async (communityId, email, requestUserId) => {
    const emailSchema = Joi.string().email().required();
    const { error: emailError, value: emailValue } = emailSchema.validate(email);
    if (emailError) {
      const e = new Error();
      e.status = 400;
      e.message = emailError.details[0].message;
      throw e;
    }

    const { error: commIdError, value: commIdValue } =
      communityIdSchema.validate(communityId);
    if (commIdError) {
      const e = new Error();
      e.status = 400;
      e.message = commIdError.details[0].message;
      throw e;
    }

    // Verificar permisos (owner o admin)
    const isOwner = await communityRepository.checkUserStatus(
      requestUserId,
      commIdValue,
      "owner"
    );
    const isAdmin = await communityRepository.checkUserStatus(
      requestUserId,
      commIdValue,
      "admin"
    );

    if (!isOwner && !isAdmin) {
      const e = new Error("No tienes permisos para invitar miembros");
      e.status = 403;
      throw e;
    }

    // Buscar usuario por email
    const user = await communityRepository.getUserByEmail(emailValue);

    // Verificar si ya es miembro
    const isMember = await communityRepository.checkUserStatus(
      user.id,
      commIdValue,
      "member"
    );
    const isUserAdmin = await communityRepository.checkUserStatus(
      user.id,
      commIdValue,
      "admin"
    );
    const isUserOwner = await communityRepository.checkUserStatus(
      user.id,
      commIdValue,
      "owner"
    );

    if (isMember || isUserAdmin || isUserOwner) {
      const e = new Error("El usuario ya es miembro de la comunidad");
      e.status = 400;
      throw e;
    }

    // Agregar usuario
    const userData = { ...user, role: "member" };
    const result = await communityRepository.addMember(commIdValue, userData);
    return result;
  },
  getAllMembers: async communityId => {
    const { error: commIdError } =
      communityIdSchema.validate(communityId);
    if (commIdError) {
      const e = new Error();
      e.status = 400;
      e.message = commIdError.details[0].message;
      throw e;
    }

    const result = await communityRepository.getAllMembers(communityId);
    return result;
  },
  removeMember: async (communityId, userId) => {
    const { error: userIdError, value: userIdValue } =
      userIdSchema.validate(userId);
    if (userIdError) {
      const e = new Error();
      e.status = 400;
      e.message = userIdError.details[0].message;
      throw e;
    }

    const { error: commIdError, value: commIdValue } =
      communityIdSchema.validate(communityId);
    if (commIdError) {
      const e = new Error();
      e.status = 400;
      e.message = commIdError.details[0].message;
      throw e;
    }

    const isOwner = await communityRepository.checkUserStatus(
      userIdValue,
      commIdValue,
      "owner"
    );

    if (isOwner) {
      const e = new Error("No se puede eliminar al dueño de la comunidad");
      e.status = 400;
      throw e;
    }

    const result = await communityRepository.removeMember(
      commIdValue,
      userIdValue
    );
    return result;
  },

  addDeck: async (userId, communityId, deckId) => {
    const resut = await communityRepository.shareDeckToCommunity(
      userId,
      deckId,
      communityId
    );
    return resut;
  },
  getAllDecks: async communityId => {
    const { error: commIdError } =
      communityIdSchema.validate(communityId);
    if (commIdError) {
      const e = new Error();
      e.status = 400;
      e.message = commIdError.details[0].message;
      throw e;
    }
    const result = await communityRepository.getAllDecks(communityId);
    return result;
  },
  dowloadDeck: async (userId, communityId, deckId) => {
    const { error: userIdError, value: userIdValue } =
      userIdSchema.validate(userId);
    if (userIdError) {
      const e = new Error();
      e.status = 400;
      e.message = userIdError.details[0].message;
      throw e;
    }

    const { error: commIdError, value: commIdValue } =
      communityIdSchema.validate(communityId);
    if (commIdError) {
      const e = new Error();
      e.status = 400;
      e.message = commIdError.details[0].message;
      throw e;
    }

    const result = await communityRepository.downloadDeckToUser(
      userIdValue,
      commIdValue,
      deckId
    );
    return result;
  },
  deleteDeck: async (communityId, deckId) => {
    const { error: commIdError } =
      communityIdSchema.validate(communityId);
    if (commIdError) {
      const e = new Error();
      e.status = 400;
      e.message = commIdError.details[0].message;
      throw e;
    }
    const result = await communityRepository.deleteDeck(communityId, deckId);
    return result;
  },
  rateDeck: async (communityId, deckId, userId, raiting) => {
    const ratingSchema = Joi.number().integer().min(1).max(5).required();
    const { error: ratingError, value: ratingValue } =
      ratingSchema.validate(raiting);
    if (ratingError) {
      const e = new Error();
      e.status = 400;
      e.message = ratingError.details[0].message;
      throw e;
    }

    const { error: commIdError, value: commIdValue } =
      communityIdSchema.validate(communityId);
    if (commIdError) {
      const e = new Error();
      e.status = 400;
      e.message = commIdError.details[0].message;
      throw e;
    }

    
    if (!deckId || typeof deckId !== "string") {
        const e = new Error("ID de mazo inválido");
        e.status = 400;
        throw e;
    }

    const { error: userIdError, value: userIdValue } =
      userIdSchema.validate(userId);
    if (userIdError) {
      const e = new Error();
      e.status = 400;
      e.message = userIdError.details[0].message;
      throw e;
    }

    const result = communityRepository.rateDeck(
      commIdValue,
      deckId,
      userIdValue,
      ratingValue
    );
    return result;
  },
  getDeckRating: async (communityId, deckId) => {
    const { error: commIdError, value: commIdValue } =
      communityIdSchema.validate(communityId);
    if (commIdError) {
      const e = new Error();
      e.status = 400;
      e.message = commIdError.details[0].message;
      throw e;
    }
    
    if (!deckId || typeof deckId !== "string") {
        const e = new Error("ID de mazo inválido");
        e.status = 400;
        throw e;
    }

    const result = await communityRepository.getDeckRating(commIdValue, deckId);
    return result;
  },

  updateMemberRole: async (communityId, targetUserId, newRole, requestUserId) => {
    const { error: commIdError, value: commIdValue } =
      communityIdSchema.validate(communityId);
    if (commIdError) {
      const e = new Error();
      e.status = 400;
      e.message = commIdError.details[0].message;
      throw e;
    }

    const { error: userIdError, value: targetUserIdValue } =
      userIdSchema.validate(targetUserId);
    if (userIdError) {
      const e = new Error();
      e.status = 400;
      e.message = userIdError.details[0].message;
      throw e;
    }

    const { error: roleError, value: roleValue } =
      updateUserStatuSchema.validate(newRole);
    if (roleError) {
      const e = new Error();
      e.status = 400;
      e.message = roleError.details[0].message;
      throw e;
    }

    const isOwner = await communityRepository.checkUserStatus(
      requestUserId,
      commIdValue,
      "owner"
    );
    if (!isOwner) {
      const e = new Error("Solo el owner puede cambiar roles");
      e.status = 403;
      throw e;
    }

    const result = await communityRepository.updateMemberRole(
      commIdValue,
      targetUserIdValue,
      roleValue
    );
    return result;
  },
};

module.exports = communityService;
