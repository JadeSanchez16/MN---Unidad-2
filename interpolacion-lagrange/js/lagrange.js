(function (entornoGlobal) {
  "use strict";

  const EPSILON_NUMERICO = 1e-12;
  const INTERVALO_GRAFICA = Object.freeze([2, 12]);
  const PUNTO_EVALUACION_INICIAL = 6;
  const NODOS_INICIALES = Object.freeze([
    Object.freeze({ x: 2, y: 150 }),
    Object.freeze({ x: 4, y: 85 }),
    Object.freeze({ x: 8, y: 50 }),
    Object.freeze({ x: 12, y: 70 })
  ]);

  class ValidationError extends Error {
    constructor(mensaje) {
      super(mensaje);
      this.name = "ValidationError";
    }
  }

  function validarNumero(valor, nombre) {
    if (typeof valor !== "number" || !Number.isFinite(valor)) {
      throw new ValidationError(`${nombre} debe ser un número finito.`);
    }
  }

  function validarNodos(nodos) {
    if (!Array.isArray(nodos) || nodos.length !== 4) {
      throw new ValidationError("Se requieren exactamente cuatro nodos (x, y).");
    }

    nodos.forEach((nodo, indice) => {
      if (nodo === null || typeof nodo !== "object") {
        throw new ValidationError(`El nodo ${indice} no es válido.`);
      }
      validarNumero(nodo.x, `x${indice}`);
      validarNumero(nodo.y, `y${indice}`);
    });

    for (let i = 0; i < nodos.length; i += 1) {
      for (let j = i + 1; j < nodos.length; j += 1) {
        const escala = Math.max(1, Math.abs(nodos[i].x), Math.abs(nodos[j].x));
        if (Math.abs(nodos[i].x - nodos[j].x) <= EPSILON_NUMERICO * escala) {
          throw new ValidationError("Los cuatro valores de x deben ser distintos.");
        }
      }
    }
  }

  function interpolarLagrange(nodos, xEvaluar) {
    validarNodos(nodos);
    validarNumero(xEvaluar, "El punto a evaluar");

    const bases = [];
    let valor = 0;

    for (let k = 0; k < nodos.length; k += 1) {
      let numerador = 1;
      let denominador = 1;

      for (let i = 0; i < nodos.length; i += 1) {
        if (i !== k) {
          numerador *= xEvaluar - nodos[i].x;
          denominador *= nodos[k].x - nodos[i].x;
        }
      }

      const base = numerador / denominador;
      valor += nodos[k].y * base;
      if (!Number.isFinite(base) || !Number.isFinite(valor)) {
        throw new ValidationError("El cálculo produjo un valor fuera del rango numérico permitido.");
      }
      bases.push(base);
    }

    return { valor, bases };
  }

  function muestrearPolinomio(nodos, inicio = 2, fin = 12, cantidad = 241) {
    validarNodos(nodos);
    validarNumero(inicio, "El inicio del intervalo");
    validarNumero(fin, "El fin del intervalo");

    if (!(fin > inicio)) {
      throw new ValidationError("El fin del intervalo debe ser mayor que el inicio.");
    }
    if (!Number.isInteger(cantidad) || cantidad < 2) {
      throw new ValidationError("La cantidad de muestras debe ser un entero mayor o igual que 2.");
    }

    return Array.from({ length: cantidad }, (_, indice) => {
      const x = inicio + ((fin - inicio) * indice) / (cantidad - 1);
      return { x, y: interpolarLagrange(nodos, x).valor };
    });
  }

  const API = Object.freeze({
    EPSILON_NUMERICO,
    INTERVALO_GRAFICA,
    NODOS_INICIALES,
    PUNTO_EVALUACION_INICIAL,
    ValidationError,
    interpolarLagrange,
    muestrearPolinomio,
    validarNumero,
    validarNodos
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
  }
  if (entornoGlobal) {
    entornoGlobal.LagrangeEngine = API;
  }
})(typeof window !== "undefined" ? window : null);
