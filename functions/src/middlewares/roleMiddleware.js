const getUserStatus = require("../utils/getUserStatus");

const roleMiddleware = async (req, res, next) => {
  try {
    // El ID de la comunidad SIEMPRE viene desde la ruta
    // Ejemplo: /communities/:id
    const communityId = req.params.id || req.params.cId;

    // El ID del usuario SIEMPRE viene del token decodificado
    const userId = req.user?.uid;

    console.log("roleMiddleware → userId:", userId);
    console.log("roleMiddleware → communityId:", communityId);

    // Si falta alguno, seguí sin asignar rol
    if (!communityId || !userId) {
      return next(); // nunca next(req,res)
    }

    // Obtener el rol desde Firestore
    req.user.role = await getUserStatus(userId, communityId);

    next();
  } catch (error) {
    console.error("Error en roleMiddleware:", error);
    next(error);
  }
};

module.exports = roleMiddleware;
