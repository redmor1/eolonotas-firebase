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

const ratingSchema = Joi.number().integer().min(1).max(5).required();

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

    const ownerData = await communityRepository.getUserData(ownerId);
    console.log(ownerData);
    const communityDto = {
      ...value,
      members: [ownerData],
      membersCount: 1,
      ratings: [],
      averageRating: 0,
    };
    const communityId = await communityRepository.create(communityDto, ownerId);
  },
  getWithFilter: async (userId, filter) => {
    let result = [];
    if (filter === "mine") {
      result = await communityRepository.getMine(userId);
    } else {
      result =
        filter === "public"
          ? await communityRepository.getPublic()
          : await communityRepository.getAllMine(userId);
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
    console.log(commIdValue);

    const isOwner = communityRepository.checkUserStatus(
      userId,
      commIdValue,
      "owner"
    );

    if (!isOwner) {
      throw new Error("Solo el owner puede actualizar la comunidad");
    }

    const result = communityRepository.update(commIdValue, dataValue);
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
    const userData = await communityRepository.getUserData(userIdValue);
    console.log("Llegue hasta userData");
    console.log(userData);
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
    if (!isMember && !isAdmin) {
      const userData = await communityRepository.getUserData(userIdValue);
      const result = await communityRepository.join(commIdValue, userData);
    } else {
      const result = { mensaje: "El usuario ya existe en la comunidad" };
    }
    return result;
  },
  getAllMembers: async communityId => {
    const { error: commIdError, value: commIdValue } =
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
    const { error: commIdError, value: commIdValue } =
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
    const { error: commIdError, value: commIdValue } =
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
  rateCommunity: async (communityId, userId, raiting) => {
    const { error: ratingError, value: ratingValue } =
      ratingSchema.validate(raiting);
    if (ratingError) {
      const e = new Error();
      e.status = 400;
      e.message = commIdError.details[0].message;
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

    const { error: userIdError, value: userIdValue } =
      userIdSchema.validate(userId);
    if (userIdError) {
      const e = new Error();
      e.status = 400;
      e.message = userIdError.details[0].message;
      throw e;
    }

    const result = communityRepository.rateCommunity(
      commIdValue,
      userIdValue,
      ratingValue
    );
    return result;
  },
  getCommunityRating: async communityId => {
    const { error: commIdError, value: commIdValue } =
      communityIdSchema.validate(communityId);
    if (commIdError) {
      const e = new Error();
      e.status = 400;
      e.message = commIdError.details[0].message;
      throw e;
    }

    const result = await communityRepository.getCommunityRating(commIdValue);
  },
};

module.exports = communityService;
