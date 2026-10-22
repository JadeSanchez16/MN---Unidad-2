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
    if (!Array.isArray(nodos) || nodos.length < 2) {
      throw new ValidationError("Se requieren al menos dos nodos (x, y).");
    }

    Array.from(nodos).forEach((nodo, indice) => {
      if (!nodo || typeof nodo !== "object") {
        throw new ValidationError(`El nodo ${indice} no es válido.`);
      }
      validarNumero(nodo.x, `x${indice}`);
      validarNumero(nodo.y, `y${indice}`);
    });

    for (let i = 0; i < nodos.length; i += 1) {
      for (let j = i + 1; j < nodos.length; j += 1) {
        if (nodos[i].x === nodos[j].x) {
          throw new ValidationError("Todos los valores de x deben ser distintos.");
        }
      }
    }
  }

  function interpolarLagrange(nodos, xEvaluar) {
    validarNodos(nodos);
    validarNumero(xEvaluar, "El punto a evaluar");

    const bases = [];
    const terminos = [];
    let valor = 0;

    for (let k = 0; k < nodos.length; k += 1) {
      let numerador = 1;
      let denominador = 1;
      const factores = [];

      for (let i = 0; i < nodos.length; i += 1) {
        if (i !== k) {
          const factorNumerador = xEvaluar - nodos[i].x;
          const factorDenominador = nodos[k].x - nodos[i].x;
          const anteriorNumerador = numerador;
          numerador *= factorNumerador;
          denominador *= factorDenominador;
          if (!Number.isFinite(numerador) || !Number.isFinite(denominador) || denominador === 0
            || (numerador === 0 && anteriorNumerador !== 0 && factorNumerador !== 0)) {
            throw new ValidationError("Los productos de Lagrange exceden la precisión numérica disponible; cambia la escala de los nodos.");
          }
          factores.push({
            indice: i,
            xComparado: nodos[i].x,
            numerador: factorNumerador,
            denominador: factorDenominador
          });
        }
      }

      const base = numerador / denominador;
      const contribucion = nodos[k].y * base;
      valor += contribucion;
      if (!Number.isFinite(base) || !Number.isFinite(valor)) {
        throw new ValidationError("El cálculo produjo un valor fuera del rango numérico permitido.");
      }
      bases.push(base);
      terminos.push({
        indice: k,
        x: nodos[k].x,
        y: nodos[k].y,
        factores,
        numerador,
        denominador,
        base,
        contribucion
      });
    }

    return { valor, bases, terminos };
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

  function rangoGrafico(valores) {
    if (!Array.isArray(valores) || !valores.length) throw new ValidationError("La gráfica necesita valores finitos.");
    valores.forEach((valor) => validarNumero(valor, "La coordenada"));
    let minimo = Math.min(...valores);
    let maximo = Math.max(...valores);
    const margen = maximo === minimo ? Math.max(1, Math.abs(minimo) * 0.12) : (maximo - minimo) * 0.12;
    minimo -= margen;
    maximo += margen;
    if (!Number.isFinite(minimo) || !Number.isFinite(maximo) || !Number.isFinite(maximo - minimo) || !(maximo > minimo)) {
      throw new ValidationError("El rango de la gráfica excede la precisión numérica disponible; cambia la escala de los datos.");
    }
    return [minimo, maximo];
  }

  function intervaloGrafico(nodos, xEvaluar) {
    validarNodos(nodos);
    validarNumero(xEvaluar, "El punto a evaluar");
    const originales = nodos.length === NODOS_INICIALES.length && nodos.every((nodo, i) => nodo.x === NODOS_INICIALES[i].x && nodo.y === NODOS_INICIALES[i].y);
    if (originales && xEvaluar >= INTERVALO_GRAFICA[0] && xEvaluar <= INTERVALO_GRAFICA[1]) return [...INTERVALO_GRAFICA];
    return rangoGrafico([...nodos.map(({ x }) => x), xEvaluar]);
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
    validarNodos,
    rangoGrafico,
    intervaloGrafico
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
  }
  if (entornoGlobal) {
    entornoGlobal.LagrangeEngine = API;
  }
})(typeof window !== "undefined" ? window : null);
