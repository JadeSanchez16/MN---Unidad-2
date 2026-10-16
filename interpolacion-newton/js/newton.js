(function (entornoGlobal) {
  "use strict";

  const EPSILON_NUMERICO = 1e-12;
  const TOLERANCIA_VALIDACION = 1e-9;
  const PUNTO_EVALUACION_INICIAL = 5;
  const NODOS_INICIALES = Object.freeze([
    Object.freeze({ x: 1, y: 45 }),
    Object.freeze({ x: 2, y: 65 }),
    Object.freeze({ x: 4, y: 110 }),
    Object.freeze({ x: 7, y: 220 })
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

  function validarDatos(X, Y) {
    if (!Array.isArray(X) || !Array.isArray(Y)) {
      throw new ValidationError("X e Y deben ser arreglos numéricos.");
    }
    if (X.length !== Y.length) {
      throw new ValidationError("Los arreglos X e Y deben tener la misma longitud.");
    }
    if (X.length < 1) {
      throw new ValidationError("Se requiere al menos un nodo para construir el polinomio.");
    }

    X.forEach((valor, indice) => validarNumero(valor, `x${indice}`));
    Y.forEach((valor, indice) => validarNumero(valor, `y${indice}`));

    for (let i = 0; i < X.length; i += 1) {
      for (let j = i + 1; j < X.length; j += 1) {
        const escala = Math.max(1, Math.abs(X[i]), Math.abs(X[j]));
        if (Math.abs(X[i] - X[j]) <= EPSILON_NUMERICO * escala) {
          throw new ValidationError("Todos los nodos X deben ser distintos.");
        }
      }
    }
  }

  function ordenarDatos(X, Y) {
    validarDatos(X, Y);
    const nodos = X.map((x, indice) => ({ x, y: Y[indice], indiceOriginal: indice }));
    nodos.sort((a, b) => a.x - b.x);
    return {
      X: nodos.map(({ x }) => x),
      Y: nodos.map(({ y }) => y),
      nodos
    };
  }

  function diferencias_divididas(X, Y) {
    validarDatos(X, Y);
    const cantidad = X.length;
    const tabla = Array.from({ length: cantidad }, () => Array(cantidad).fill(null));
    const pasos = [];

    for (let fila = 0; fila < cantidad; fila += 1) {
      tabla[fila][0] = Y[fila];
    }

    for (let orden = 1; orden < cantidad; orden += 1) {
      for (let fila = 0; fila < cantidad - orden; fila += 1) {
        const superior = tabla[fila + 1][orden - 1];
        const inferior = tabla[fila][orden - 1];
        const extremoDerecho = X[fila + orden];
        const extremoIzquierdo = X[fila];
        const numerador = superior - inferior;
        const denominador = extremoDerecho - extremoIzquierdo;
        const valor = numerador / denominador;

        if (!Number.isFinite(valor)) {
          throw new ValidationError("La tabla produjo un valor no finito; revisa la separación y magnitud de los nodos.");
        }

        tabla[fila][orden] = valor;
        pasos.push({
          orden,
          fila,
          desde: fila,
          hasta: fila + orden,
          superior,
          inferior,
          numerador,
          denominador,
          extremoDerecho,
          extremoIzquierdo,
          valor
        });
      }
    }

    return {
      tabla,
      coeficientes: tabla[0].slice(),
      pasos
    };
  }

  function multiplicarPolinomios(coeficientesA, coeficientesB) {
    const resultado = Array(coeficientesA.length + coeficientesB.length - 1).fill(0);
    for (let i = 0; i < coeficientesA.length; i += 1) {
      for (let j = 0; j < coeficientesB.length; j += 1) {
        resultado[i + j] += coeficientesA[i] * coeficientesB[j];
      }
    }
    return resultado;
  }

  function expandirPolinomioNewton(coeficientes, X) {
    if (!Array.isArray(coeficientes) || !Array.isArray(X) || coeficientes.length !== X.length) {
      throw new ValidationError("Los coeficientes y nodos deben tener la misma longitud.");
    }
    coeficientes.forEach((valor, indice) => validarNumero(valor, `a${indice}`));
    X.forEach((valor, indice) => validarNumero(valor, `x${indice}`));

    const estandar = Array(coeficientes.length).fill(0);
    const desarrollos = [];
    let base = [1];

    for (let k = 0; k < coeficientes.length; k += 1) {
      const termino = base.map((valor) => valor * coeficientes[k]);
      for (let potencia = 0; potencia < termino.length; potencia += 1) {
        estandar[potencia] += termino[potencia];
      }
      if (estandar.some((valor) => !Number.isFinite(valor))) {
        throw new ValidationError("La expansión algebraica excedió el rango numérico permitido.");
      }
      desarrollos.push({
        indice: k,
        coeficiente: coeficientes[k],
        nodosFactor: X.slice(0, k),
        base: base.slice(),
        termino,
        acumulado: estandar.slice()
      });
      if (k < coeficientes.length - 1) {
        base = multiplicarPolinomios(base, [-X[k], 1]);
      }
    }

    return { coeficientesEstandar: estandar, desarrollos };
  }

  function evaluarNewton(coeficientes, X, xEvaluar) {
    if (!Array.isArray(coeficientes) || !Array.isArray(X) || coeficientes.length !== X.length) {
      throw new ValidationError("Los coeficientes y nodos deben tener la misma longitud.");
    }
    if (coeficientes.length < 1) {
      throw new ValidationError("Se requiere al menos un coeficiente para evaluar el polinomio.");
    }
    validarNumero(xEvaluar, "El punto a evaluar");

    let valor = coeficientes.at(-1);
    const pasos = [{ indice: coeficientes.length - 1, inicial: true, resultado: valor }];
    for (let k = coeficientes.length - 2; k >= 0; k -= 1) {
      const anterior = valor;
      const factor = xEvaluar - X[k];
      valor = coeficientes[k] + factor * anterior;
      if (!Number.isFinite(valor)) {
        throw new ValidationError("La evaluación produjo un valor fuera del rango numérico permitido.");
      }
      pasos.push({
        indice: k,
        inicial: false,
        coeficiente: coeficientes[k],
        nodo: X[k],
        factor,
        anterior,
        resultado: valor
      });
    }
    return { valor, pasos };
  }

  function evaluarEstandar(coeficientes, x) {
    validarNumero(x, "El punto a evaluar");
    let valor = 0;
    for (let k = coeficientes.length - 1; k >= 0; k -= 1) {
      valor = valor * x + coeficientes[k];
    }
    return valor;
  }

  function obtenerAdvertencias(X, Y, coeficientes) {
    const advertencias = [];
    const maxX = Math.max(...X.map(Math.abs), 1);
    const maxY = Math.max(...Y.map(Math.abs), 1);
    let separacionMinima = Number.POSITIVE_INFINITY;
    let separacionMaxima = 0;

    for (let i = 0; i < X.length; i += 1) {
      for (let j = i + 1; j < X.length; j += 1) {
        const distancia = Math.abs(X[i] - X[j]);
        separacionMinima = Math.min(separacionMinima, distancia);
        separacionMaxima = Math.max(separacionMaxima, distancia);
      }
    }

    if (X.length > 1 && separacionMaxima / separacionMinima > 1e8) {
      advertencias.push("Los nodos tienen separaciones muy desiguales; el resultado puede ser sensible al redondeo.");
    }
    if (maxX > 1e8 || maxY > 1e12) {
      advertencias.push("La magnitud de los datos es elevada; interpreta los últimos dígitos con cautela.");
    }
    const maxCoeficiente = Math.max(...coeficientes.map(Math.abs), 0);
    if (maxCoeficiente > maxY * 1e10) {
      advertencias.push("Los coeficientes presentan crecimiento elevado, posible señal de mala condición numérica.");
    }
    return advertencias;
  }

  function resolverNewton(XEntrada, YEntrada, xEvaluar, grado = XEntrada.length - 1) {
    validarDatos(XEntrada, YEntrada);
    validarNumero(xEvaluar, "El punto a evaluar");
    if (!Number.isInteger(grado) || grado < 0 || grado >= XEntrada.length) {
      throw new ValidationError(`El grado debe ser un entero entre 0 y ${XEntrada.length - 1}.`);
    }

    const datosOrdenados = ordenarDatos(XEntrada, YEntrada);
    const X = datosOrdenados.X.slice(0, grado + 1);
    const Y = datosOrdenados.Y.slice(0, grado + 1);
    const diferencias = diferencias_divididas(X, Y);
    const expansion = expandirPolinomioNewton(diferencias.coeficientes, X);
    const evaluacion = evaluarNewton(diferencias.coeficientes, X, xEvaluar);
    const validaciones = X.map((x, indice) => {
      const calculado = evaluarNewton(diferencias.coeficientes, X, x).valor;
      const diferencia = calculado - Y[indice];
      const tolerancia = TOLERANCIA_VALIDACION * Math.max(1, Math.abs(Y[indice]));
      return {
        x,
        esperado: Y[indice],
        calculado,
        diferencia,
        tolerancia,
        valido: Math.abs(diferencia) <= tolerancia
      };
    });
    const minimo = Math.min(...X);
    const maximo = Math.max(...X);
    const clasificacion = xEvaluar >= minimo && xEvaluar <= maximo
      ? "interpolación"
      : "extrapolación";

    return {
      grado,
      X,
      Y,
      nodosUsados: X.map((x, indice) => ({ x, y: Y[indice] })),
      nodosOrdenados: datosOrdenados.nodos,
      tabla: diferencias.tabla,
      pasosDiferencias: diferencias.pasos,
      coeficientes: diferencias.coeficientes,
      coeficientesEstandar: expansion.coeficientesEstandar,
      desarrollos: expansion.desarrollos,
      valor: evaluacion.valor,
      pasosEvaluacion: evaluacion.pasos,
      validaciones,
      clasificacion,
      advertencias: obtenerAdvertencias(X, Y, diferencias.coeficientes)
    };
  }

  function muestrearNewton(coeficientes, X, inicio, fin, cantidad = 321) {
    validarNumero(inicio, "El inicio del intervalo gráfico");
    validarNumero(fin, "El fin del intervalo gráfico");
    if (!(fin > inicio)) {
      throw new ValidationError("El intervalo gráfico debe tener amplitud positiva.");
    }
    if (!Number.isInteger(cantidad) || cantidad < 2) {
      throw new ValidationError("La cantidad de muestras debe ser un entero mayor o igual que 2.");
    }
    return Array.from({ length: cantidad }, (_, indice) => {
      const x = inicio + ((fin - inicio) * indice) / (cantidad - 1);
      return { x, y: evaluarNewton(coeficientes, X, x).valor };
    });
  }

  const API = Object.freeze({
    EPSILON_NUMERICO,
    TOLERANCIA_VALIDACION,
    PUNTO_EVALUACION_INICIAL,
    NODOS_INICIALES,
    ValidationError,
    validarNumero,
    validarDatos,
    ordenarDatos,
    diferencias_divididas,
    expandirPolinomioNewton,
    evaluarNewton,
    evaluarEstandar,
    resolverNewton,
    muestrearNewton
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
  }
  if (entornoGlobal) {
    entornoGlobal.NewtonEngine = API;
  }
})(typeof window !== "undefined" ? window : null);
