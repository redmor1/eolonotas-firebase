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

    const communityDto = {
      ...value,
      members: [],
      membersCount: 1,
      ratings: 0,
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
};

module.exports = communityService;
