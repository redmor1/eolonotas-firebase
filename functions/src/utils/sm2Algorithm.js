/**
 * algoritmo SM-2 (SuperMemo 2)
 * calcula el siguiente intervalo de repaso basado en la calidad de la respuesta
 *
 * @param {number} quality - calidad de la respuesta (0-5)
 * @param {number} easinessFactor - factor de facilidad actual
 * @param {number} repetitions - numero de repeticiones consecutivas correctas
 * @param {number} intervalDays - intervalo actual en días
 * @returns {Object} datos actualizados de repaso (sin fechas, solo valores numéricos)
 */
function calculateSM2(quality, easinessFactor, repetitions, intervalDays) {
  let newEasinessFactor = easinessFactor;
  let newRepetitions = repetitions;
  let newIntervalDays = intervalDays;

  // calcular nuevo easiness factor
  newEasinessFactor =
    easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // minimo de 1.3
  if (newEasinessFactor < 1.3) {
    newEasinessFactor = 1.3;
  }

  // si la respuesta fue incorrecta (quality < 3)
  if (quality < 3) {
    newRepetitions = 0;
    newIntervalDays = 1;
  } else {
    newRepetitions = repetitions + 1;

    if (newRepetitions === 1) {
      newIntervalDays = 1;
    } else if (newRepetitions === 2) {
      newIntervalDays = 6;
    } else {
      newIntervalDays = Math.round(intervalDays * newEasinessFactor);
    }
  }

  return {
    easinessFactor: newEasinessFactor,
    repetitions: newRepetitions,
    intervalDays: newIntervalDays,
  };
}

module.exports = { calculateSM2 };
