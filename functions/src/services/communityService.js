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

const communityService = {
  create: async (data, ownerId) => {
    const { error, value } = createSchema.validate(data);
    if (error) {
      const e = new Error();
      e.status = 400;
      e.message = baseError.details[0].message;
      throw e;
    }

    const communityDto = { ...value, members: [] };
    const communityId = await communityRepository.create(communityDto, ownerId);
  },
  getWithFilter: async (userId, filter) => {
    let result = [];
    console.log(filter);
    console.log(userId);
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
};

module.exports = communityService;
