"use strict";

// ==================================================
// DATOS DE LA SESIÓN 7
// ==================================================

const EPSILON_NUMERICO = 1e-12;
const TOLERANCIA_JACOBI = 1e-4;
const MAX_ITERACIONES = 1000;

const A_JACOBI = Object.freeze([
  Object.freeze([10, -2, -1, 0]),
  Object.freeze([-1, 8, 0, -2]),
  Object.freeze([-2, 0, 12, -3]),
  Object.freeze([0, -1, -2, 9])
]);

const B_JACOBI = Object.freeze([15, 18, 25, 20]);
const X_INICIAL = Object.freeze([0, 0, 0, 0]);

// ==================================================
// VALIDACIONES Y UTILIDADES NUMÉRICAS
// ==================================================

class ArithmeticError extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "ArithmeticError";
  }
}

function validarMatrizCuadrada(matriz) {
  if (!Array.isArray(matriz) || matriz.length === 0) {
    throw new TypeError("La matriz A no puede estar vacía.");
  }

  const dimension = matriz.length;
  matriz.forEach((fila, indice) => {
    if (!Array.isArray(fila) || fila.length !== dimension) {
      throw new TypeError(`La fila ${indice + 1} debe contener ${dimension} elementos.`);
    }
    if (!fila.every((valor) => typeof valor === "number" && Number.isFinite(valor))) {
      throw new TypeError("Todos los coeficientes deben ser números finitos.");
    }
  });
}

function validarVector(vector, dimension, nombre) {
  if (!Array.isArray(vector) || vector.length !== dimension) {
    throw new TypeError(`${nombre} debe contener exactamente ${dimension} elementos.`);
  }
  if (!vector.every((valor) => typeof valor === "number" && Number.isFinite(valor))) {
    throw new TypeError(`${nombre} solo puede contener números finitos.`);
  }
}

function normaInfinito(vector) {
  validarVector(vector, vector.length, "El vector");
  return Math.max(...vector.map((valor) => Math.abs(valor)));
}

function calcularErrorRelativo(actual, anterior) {
  validarVector(actual, anterior.length, "El vector actual");
  validarVector(anterior, actual.length, "El vector anterior");

  const diferencia = actual.map((valor, indice) => valor - anterior[indice]);
  const numerador = normaInfinito(diferencia);
  const denominador = normaInfinito(actual);

  if (denominador <= EPSILON_NUMERICO) {
    return numerador <= EPSILON_NUMERICO ? 0 : Number.POSITIVE_INFINITY;
  }

  return numerador / denominador;
}

function analizarDominanciaDiagonal(matriz) {
  validarMatrizCuadrada(matriz);

  const filas = matriz.map((fila, indice) => {
    const diagonal = Math.abs(fila[indice]);
    const sumaNoDiagonal = fila.reduce(
      (suma, valor, columna) => suma + (columna === indice ? 0 : Math.abs(valor)),
      0
    );

    return {
      fila: indice + 1,
      diagonal,
      sumaNoDiagonal,
      dominante: diagonal > sumaNoDiagonal
    };
  });

  return {
    filas,
    esEstrictamenteDominante: filas.every(({ dominante }) => dominante)
  };
}

function iterarJacobi(matriz, vectorB, anterior) {
  validarMatrizCuadrada(matriz);
  validarVector(vectorB, matriz.length, "El vector b");
  validarVector(anterior, matriz.length, "La aproximación anterior");

  return matriz.map((fila, i) => {
    const diagonal = fila[i];
    if (Math.abs(diagonal) <= EPSILON_NUMERICO) {
      throw new ArithmeticError(`El elemento diagonal a[${i + 1},${i + 1}] es cero o demasiado pequeño.`);
    }

    const sumaNoDiagonal = fila.reduce(
      (suma, coeficiente, j) => suma + (j === i ? 0 : coeficiente * anterior[j]),
      0
    );
    return (vectorB[i] - sumaNoDiagonal) / diagonal;
  });
}

function resolverJacobi(
  matriz,
  vectorB,
  inicial,
  tolerancia,
  maxIteraciones = MAX_ITERACIONES
) {
  validarMatrizCuadrada(matriz);
  validarVector(vectorB, matriz.length, "El vector b");
  validarVector(inicial, matriz.length, "El vector inicial");

  if (typeof tolerancia !== "number" || !Number.isFinite(tolerancia) || tolerancia <= 0) {
    throw new TypeError("La tolerancia debe ser un número finito mayor que cero.");
  }
  if (!Number.isInteger(maxIteraciones) || maxIteraciones <= 0) {
    throw new TypeError("El máximo de iteraciones debe ser un entero positivo.");
  }

  const dominancia = analizarDominanciaDiagonal(matriz);
  const historial = [];
  let anterior = [...inicial];

  for (let k = 1; k <= maxIteraciones; k += 1) {
    const actual = iterarJacobi(matriz, vectorB, anterior);
    const error = calcularErrorRelativo(actual, anterior);

    historial.push({
      iteracion: k,
      vector: [...actual],
      error
    });

    if (error <= tolerancia) {
      return {
        solucion: [...actual],
        historial,
        iteraciones: k,
        errorFinal: error,
        convergio: true,
        dominancia
      };
    }

    anterior = actual;
  }

  return {
    solucion: [...anterior],
    historial,
    iteraciones: historial.length,
    errorFinal: historial.at(-1)?.error ?? Number.POSITIVE_INFINITY,
    convergio: false,
    dominancia
  };
}

function multiplicarMatrizVector(matriz, vector) {
  validarMatrizCuadrada(matriz);
  validarVector(vector, matriz.length, "El vector");
  return matriz.map((fila) => fila.reduce(
    (suma, coeficiente, indice) => suma + coeficiente * vector[indice],
    0
  ));
}

function calcularResiduo(matriz, solucion, vectorB) {
  const producto = multiplicarMatrizVector(matriz, solucion);
  validarVector(vectorB, producto.length, "El vector b");
  return vectorB.map((valor, indice) => valor - producto[indice]);
}

function formatearNumero(numero, decimales = 6) {
  if (!Number.isFinite(numero)) {
    return String(numero);
  }
  const normalizado = Math.abs(numero) < EPSILON_NUMERICO ? 0 : numero;
  return normalizado.toFixed(decimales);
}

function formatearError(error) {
  if (!Number.isFinite(error)) {
    return String(error);
  }
  return error === 0 ? "0" : error.toExponential(6);
}

// ==================================================
// PRESENTACIÓN
// ==================================================

function crearTablaMatriz(matriz, etiqueta) {
  const contenedor = document.createElement("div");
  contenedor.className = "matrix-wrap";

  const tabla = document.createElement("table");
  tabla.className = "matrix-table";
  tabla.setAttribute("aria-label", etiqueta);

  const cuerpo = document.createElement("tbody");
  matriz.forEach((fila) => {
    const filaHtml = document.createElement("tr");
    fila.forEach((valor) => {
      const celda = document.createElement("td");
      celda.textContent = Number.isInteger(valor) ? String(valor) : formatearNumero(valor);
      filaHtml.append(celda);
    });
    cuerpo.append(filaHtml);
  });

  tabla.append(cuerpo);
  contenedor.append(tabla);
  return contenedor;
}

function mostrarDatosIniciales() {
  document.getElementById("matrix-a").replaceChildren(crearTablaMatriz(A_JACOBI, "Matriz A"));
  document.getElementById("vector-b").replaceChildren(
    crearTablaMatriz(B_JACOBI.map((valor) => [valor]), "Vector b")
  );
  document.getElementById("vector-x0").replaceChildren(
    crearTablaMatriz(X_INICIAL.map((valor) => [valor]), "Vector inicial")
  );
  document.getElementById("tolerance-value").textContent = TOLERANCIA_JACOBI.toExponential(0);
}

function mostrarDominancia(analisis) {
  const cuerpo = document.getElementById("dominance-body");
  const filas = analisis.filas.map((detalle) => {
    const fila = document.createElement("tr");
    const valores = [
      detalle.fila,
      formatearNumero(detalle.diagonal, 0),
      formatearNumero(detalle.sumaNoDiagonal, 0),
      `${formatearNumero(detalle.diagonal, 0)} > ${formatearNumero(detalle.sumaNoDiagonal, 0)}`
    ];

    valores.forEach((valor, indice) => {
      const celda = document.createElement("td");
      celda.textContent = String(valor);
      if (indice === valores.length - 1) {
        celda.className = detalle.dominante ? "check-value" : "error-value";
      }
      fila.append(celda);
    });
    return fila;
  });
  cuerpo.replaceChildren(...filas);

  const estado = document.getElementById("dominance-status");
  estado.className = `status-message ${analisis.esEstrictamenteDominante ? "status-success" : "status-error"}`;
  estado.textContent = analisis.esEstrictamenteDominante
    ? "La matriz es estrictamente diagonal dominante por filas; Jacobi converge para el vector inicial dado."
    : "La matriz no es estrictamente diagonal dominante; este criterio no garantiza la convergencia.";
}

function mostrarHistorial(resultado) {
  const cuerpo = document.getElementById("iteration-body");
  const filaInicial = document.createElement("tr");
  ["0", ...X_INICIAL.map(() => "0.000000"), "-"] .forEach((valor) => {
    const celda = document.createElement("td");
    celda.textContent = valor;
    filaInicial.append(celda);
  });

  const filas = resultado.historial.map(({ iteracion, vector, error }) => {
    const fila = document.createElement("tr");
    [String(iteracion), ...vector.map((valor) => formatearNumero(valor)), formatearError(error)]
      .forEach((valor) => {
        const celda = document.createElement("td");
        celda.textContent = valor;
        fila.append(celda);
      });
    return fila;
  });

  cuerpo.replaceChildren(filaInicial, ...filas);
}

function mostrarResultadoFinal(resultado) {
  document.getElementById("final-vector").replaceChildren(
    crearTablaMatriz(resultado.solucion.map((valor) => [valor]), "Solución final aproximada")
  );
  document.getElementById("final-iterations").textContent = String(resultado.iteraciones);
  document.getElementById("final-error").textContent = formatearError(resultado.errorFinal);
  document.getElementById("final-tolerance").textContent = TOLERANCIA_JACOBI.toExponential(0);

  const estado = document.getElementById("final-status");
  estado.className = `status-message ${resultado.convergio ? "status-success" : "status-error"}`;
  estado.textContent = resultado.convergio
    ? `Convergencia alcanzada: ${formatearError(resultado.errorFinal)} ≤ ${TOLERANCIA_JACOBI.toExponential(0)}.`
    : `No se alcanzó la tolerancia en ${resultado.iteraciones} iteraciones.`;
}

function actualizarEstadoGlobal(mensaje, correcto) {
  const estado = document.getElementById("global-status");
  estado.className = `status-message ${correcto ? "status-success" : "status-error"}`;
  estado.textContent = mensaje;
}

function ejecutarJacobi() {
  const resultados = document.getElementById("results");
  resultados.hidden = true;

  try {
    const resultado = resolverJacobi(
      A_JACOBI,
      B_JACOBI,
      X_INICIAL,
      TOLERANCIA_JACOBI
    );

    mostrarHistorial(resultado);
    mostrarResultadoFinal(resultado);
    resultados.hidden = false;
    actualizarEstadoGlobal(
      resultado.convergio
        ? `Cálculo terminado correctamente en ${resultado.iteraciones} iteraciones.`
        : "El cálculo terminó sin alcanzar la tolerancia.",
      resultado.convergio
    );
  } catch (error) {
    console.error(error);
    actualizarEstadoGlobal(`No fue posible ejecutar Jacobi: ${error.message}`, false);
  }
}

function iniciarAplicacion() {
  mostrarDatosIniciales();
  mostrarDominancia(analizarDominanciaDiagonal(A_JACOBI));
  document.getElementById("solve-button").addEventListener("click", ejecutarJacobi);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", iniciarAplicacion, { once: true });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    A_JACOBI,
    B_JACOBI,
    X_INICIAL,
    TOLERANCIA_JACOBI,
    analizarDominanciaDiagonal,
    calcularErrorRelativo,
    calcularResiduo,
    iterarJacobi,
    normaInfinito,
    resolverJacobi
  };
}
