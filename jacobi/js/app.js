"use strict";

// ==================================================
// DATOS DE LA SESIÓN 7
// ==================================================

const EPSILON_NUMERICO = 1e-12;
const TOLERANCIA_JACOBI = 1e-4;
const MAX_ITERACIONES = 1000;
const entradaLineal = typeof module !== "undefined" && module.exports
  ? require("../../shared/linear-input.js") : window.LinearInput;

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
  for (let indice = 0; indice < dimension; indice += 1) {
    const fila = matriz[indice];
    if (!Array.isArray(fila) || fila.length !== dimension) {
      throw new TypeError(`La fila ${indice + 1} debe contener ${dimension} elementos.`);
    }
    if (!Array.from(fila).every((valor) => typeof valor === "number" && Number.isFinite(valor))) {
      throw new TypeError("Todos los coeficientes deben ser números finitos.");
    }
  }
}

function validarVector(vector, dimension, nombre) {
  if (!Array.isArray(vector) || vector.length !== dimension) {
    throw new TypeError(`${nombre} debe contener exactamente ${dimension} elementos.`);
  }
  if (!Array.from(vector).every((valor) => typeof valor === "number" && Number.isFinite(valor))) {
    throw new TypeError(`${nombre} solo puede contener números finitos.`);
  }
}

function normaInfinito(vector) {
  if (!Array.isArray(vector) || vector.length === 0) throw new TypeError("El vector no puede estar vacío.");
  validarVector(vector, vector.length, "El vector");
  return Math.max(...vector.map((valor) => Math.abs(valor)));
}

function calcularErrorRelativo(actual, anterior) {
  validarVector(actual, anterior.length, "El vector actual");
  validarVector(anterior, actual.length, "El vector anterior");

  const diferencia = actual.map((valor, indice) => valor - anterior[indice]);
  const numerador = normaInfinito(diferencia);
  const denominador = normaInfinito(actual);

  if (denominador === 0) {
    return numerador === 0 ? 0 : Number.POSITIVE_INFINITY;
  }

  return numerador / denominador;
}

function analizarDominanciaDiagonal(matriz) {
  validarMatrizCuadrada(matriz);

  const filas = matriz.map((fila, indice) => {
    const diagonal = Math.abs(fila[indice]);
    const terminosNoDiagonales = fila
      .filter((_, columna) => columna !== indice)
      .map((valor) => Math.abs(valor));
    const sumaNoDiagonal = terminosNoDiagonales.reduce((suma, valor) => suma + valor, 0);
    if (!Number.isFinite(sumaNoDiagonal)) throw new ArithmeticError("La suma de coeficientes excede el rango numérico permitido.");

    return {
      fila: indice + 1,
      diagonal,
      terminosNoDiagonales,
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
    if (diagonal === 0) {
      throw new ArithmeticError(`El elemento diagonal a[${i + 1},${i + 1}] es cero o demasiado pequeño.`);
    }

    const sumaNoDiagonal = fila.reduce(
      (suma, coeficiente, j) => suma + (j === i ? 0 : coeficiente * anterior[j]),
      0
    );
    const valor = (vectorB[i] - sumaNoDiagonal) / diagonal;
    if (!Number.isFinite(valor)) throw new ArithmeticError(`La iteración produjo un valor no finito en x${i + 1}; el método puede estar divergiendo.`);
    return valor;
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
  if (!Number.isSafeInteger(maxIteraciones) || maxIteraciones <= 0) {
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
        dominancia,
        inicial: [...inicial],
        tolerancia,
        residuo: calcularResiduo(matriz, actual, vectorB)
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
    dominancia,
    inicial: [...inicial],
    tolerancia,
    residuo: calcularResiduo(matriz, anterior, vectorB)
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
  const residuo = vectorB.map((valor, indice) => valor - producto[indice]);
  validarVector(residuo, matriz.length, "El residuo");
  return residuo;
}

function formatearNumero(numero, decimales = 6) {
  if (!Number.isFinite(numero)) {
    return String(numero);
  }
  const normalizado = Object.is(numero, -0) ? 0 : numero;
  if (normalizado !== 0 && Math.abs(normalizado) < 10 ** -decimales) return normalizado.toExponential(6);
  return normalizado.toFixed(decimales);
}

function formatearError(error) {
  if (!Number.isFinite(error)) {
    return String(error);
  }
  return error === 0 ? "0" : error.toExponential(6);
}

function formatearDetalle(numero) {
  if (Number.isInteger(numero)) return String(numero);
  return formatearNumero(numero).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
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
      formatearDetalle(detalle.diagonal),
      detalle.terminosNoDiagonales.map(formatearDetalle).join(" + ") || "0",
      formatearDetalle(detalle.sumaNoDiagonal),
      `${formatearDetalle(detalle.diagonal)} ${detalle.dominante ? ">" : "≤"} ${formatearDetalle(detalle.sumaNoDiagonal)}`
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
    ? `${analisis.filas.length === 1 ? "La desigualdad se cumple" : `Las ${analisis.filas.length} desigualdades se cumplen`}: A es estrictamente diagonal dominante por filas.`
    : "La matriz no es estrictamente diagonal dominante; este criterio no garantiza la convergencia.";
}

function mostrarHistorial(resultado) {
  const cuerpo = document.getElementById("iteration-body");
  const filaInicial = document.createElement("tr");
  const cabecera = document.getElementById("iteration-header");
  cabecera.replaceChildren(...["k", ...resultado.inicial.map((_, i) => `x${i + 1}⁽ᵏ⁾`), "Error relativo"].map((texto) => {
    const celda = document.createElement("th");
    celda.scope = "col";
    celda.textContent = texto;
    return celda;
  }));
  ["0", ...resultado.inicial.map((valor) => formatearNumero(valor)), "-"].forEach((valor) => {
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
  document.getElementById("final-tolerance").textContent = formatearError(resultado.tolerancia);
  document.getElementById("final-residual").textContent = formatearError(normaInfinito(resultado.residuo));

  const estado = document.getElementById("final-status");
  estado.className = `status-message ${resultado.convergio ? "status-success" : "status-error"}`;
  estado.textContent = resultado.convergio
    ? `Criterio de parada alcanzado: ${formatearError(resultado.errorFinal)} ≤ ${formatearError(resultado.tolerancia)}.`
    : `No se alcanzó la tolerancia en ${resultado.iteraciones} iteraciones.`;
}

function actualizarEstadoGlobal(mensaje, correcto) {
  const estado = document.getElementById("global-status");
  estado.className = `status-message ${correcto ? "status-success" : "status-error"}`;
  estado.textContent = mensaje;
}

function describirIteracion(matriz, b, anterior, actual) {
  return matriz.map((fila, i) => {
    const productos = fila.flatMap((coeficiente, j) => j === i || coeficiente === 0
      ? [] : [`(${formatearDetalle(coeficiente)})(${formatearDetalle(anterior[j])})`]);
    return `x${i + 1} = (${formatearDetalle(b[i])} − [${productos.join(" + ") || "0"}]) / ${formatearDetalle(fila[i])} = ${formatearDetalle(actual[i])}`;
  });
}

let vistaOriginal;
let datosOperaciones = null;

function leerSistema() {
  const matriz = entradaLineal.matriz(document.getElementById("input-a").value);
  const b = entradaLineal.vector(document.getElementById("input-b").value, "El vector b");
  const inicial = entradaLineal.vector(document.getElementById("input-x0").value, "El vector inicial");
  const tolerancia = entradaLineal.numero(document.getElementById("input-tolerance").value, "La tolerancia");
  const maxIteraciones = entradaLineal.numero(document.getElementById("input-max-iterations").value, "El máximo de iteraciones");
  validarVector(b, matriz.length, "El vector b");
  validarVector(inicial, matriz.length, "El vector inicial");
  return { matriz, b, inicial, tolerancia, maxIteraciones };
}

function mostrarSistema(datos) {
  const { matriz, b, inicial, tolerancia, maxIteraciones } = datos;
  const original = JSON.stringify([matriz, b]) === JSON.stringify([A_JACOBI, B_JACOBI]);
  document.getElementById("system-title").textContent = original ? vistaOriginal.titulo : `Sistema de ${matriz.length} ${matriz.length === 1 ? "incógnita" : "incógnitas"}`;
  document.querySelector(".subtitle").textContent = original ? vistaOriginal.subtitulo : "Resolución iterativa de un sistema lineal";
  document.querySelector(".intro-section .section-heading > p").textContent = original
    ? vistaOriginal.contexto : "Sistema A·x = b con el vector inicial y los parámetros ingresados.";
  const ecuaciones = document.getElementById("system-equations");
  const formulas = document.getElementById("iteration-formulas");
  if (original) {
    ecuaciones.innerHTML = vistaOriginal.ecuaciones;
    formulas.innerHTML = vistaOriginal.formulas;
  } else {
    ecuaciones.replaceChildren(...entradaLineal.ecuaciones(matriz, b, formatearDetalle).map((texto) => {
      const fila = document.createElement("div");
      fila.className = "equation-row";
      fila.textContent = texto;
      return fila;
    }));
    formulas.replaceChildren(...matriz.map((fila, i) => {
      const formula = document.createElement("div");
      const productos = fila.flatMap((coeficiente, j) => j === i || coeficiente === 0 ? [] : [`(${formatearDetalle(coeficiente)})x${j + 1}⁽ᵏ⁾`]);
      formula.textContent = `x${i + 1}⁽ᵏ⁺¹⁾ = (${formatearDetalle(b[i])} − [${productos.join(" + ") || "0"}]) / ${formatearDetalle(fila[i])}`;
      return formula;
    }));
  }
  document.getElementById("matrix-a").replaceChildren(crearTablaMatriz(matriz, "Matriz A"));
  document.getElementById("vector-b").replaceChildren(crearTablaMatriz(b.map((x) => [x]), "Vector b"));
  document.getElementById("vector-x0").replaceChildren(crearTablaMatriz(inicial.map((x) => [x]), "Vector inicial"));
  document.getElementById("tolerance-value").textContent = formatearError(tolerancia);
  document.getElementById("stopping-description").textContent = `Vector inicial: [${inicial.map(formatearDetalle).join(", ")}]. Parada: Eₖ ≤ ${formatearError(tolerancia)}; máximo ${maxIteraciones} iteraciones.`;
  document.getElementById("theorem-note").textContent = "Garantía teórica: la dominancia diagonal estricta por filas es una condición suficiente de convergencia desde cualquier vector inicial. Si no se cumple, este criterio no garantiza ni descarta la convergencia; revisa el historial y el residuo.";
  ["system-equations", "system-preview", "convergence-section", "iteration-formulas"].forEach((id) => {
    document.getElementById(id).hidden = false;
  });
  mostrarDominancia(analizarDominanciaDiagonal(matriz));
}

function invalidarSistema() {
  ["results", "system-equations", "system-preview", "convergence-section", "iteration-formulas"].forEach((id) => {
    document.getElementById(id).hidden = true;
  });
  datosOperaciones = null;
  document.getElementById("iteration-development").open = false;
  document.getElementById("iteration-steps").replaceChildren();
  document.getElementById("stopping-description").textContent = "Datos modificados. Calcula con los valores ingresados.";
  const estado = document.getElementById("global-status");
  estado.className = "status-message status-info";
  estado.textContent = "Datos modificados. Listo para un nuevo cálculo.";
}

function restaurarEjemplo() {
  document.getElementById("input-a").value = entradaLineal.textoMatriz(A_JACOBI);
  document.getElementById("input-b").value = B_JACOBI.join(" ");
  document.getElementById("input-x0").value = X_INICIAL.join(" ");
  document.getElementById("input-tolerance").value = TOLERANCIA_JACOBI;
  document.getElementById("input-max-iterations").value = MAX_ITERACIONES;
  invalidarSistema();
  mostrarSistema({ matriz: A_JACOBI, b: B_JACOBI, inicial: X_INICIAL, tolerancia: TOLERANCIA_JACOBI, maxIteraciones: MAX_ITERACIONES });
  document.getElementById("global-status").textContent = "Ejemplo original restaurado. Listo para calcular.";
}

function ejecutarJacobi(evento) {
  evento?.preventDefault();
  const resultados = document.getElementById("results");
  invalidarSistema();

  try {
    const datos = leerSistema();
    mostrarSistema(datos);
    const resultado = resolverJacobi(datos.matriz, datos.b, datos.inicial, datos.tolerancia, datos.maxIteraciones);

    mostrarHistorial(resultado);
    mostrarResultadoFinal(resultado);
    datosOperaciones = { ...datos, resultado };
    resultados.hidden = false;
    actualizarEstadoGlobal(
      resultado.convergio
        ? `Cálculo terminado correctamente`
        : "El cálculo terminó sin alcanzar la tolerancia.",
      resultado.convergio
    );
    if (!resultado.dominancia.esEstrictamenteDominante) {
      document.getElementById("global-status").textContent += " Advertencia: no se cumple el criterio suficiente de dominancia diagonal; revisa el residuo y las iteraciones.";
    }
  } catch (error) {
    if (!(error instanceof TypeError) && !(error instanceof ArithmeticError)) console.error(error);
    actualizarEstadoGlobal(`No fue posible ejecutar Jacobi: ${error.message}`, false);
  }
}

function iniciarAplicacion() {
  vistaOriginal = {
    ecuaciones: document.getElementById("system-equations").innerHTML,
    formulas: document.getElementById("iteration-formulas").innerHTML,
    titulo: document.getElementById("system-title").textContent,
    subtitulo: document.querySelector(".subtitle").textContent,
    contexto: document.querySelector(".intro-section .section-heading > p").textContent
  };
  restaurarEjemplo();
  const formulario = document.getElementById("system-form");
  formulario.addEventListener("submit", ejecutarJacobi);
  formulario.addEventListener("input", invalidarSistema);
  document.getElementById("restore-button").addEventListener("click", restaurarEjemplo);
  document.getElementById("clear-button").addEventListener("click", () => {
    formulario.querySelectorAll("textarea, input").forEach((campo) => { campo.value = ""; });
    invalidarSistema();
    document.getElementById("input-a").focus();
  });
  document.getElementById("iteration-development").addEventListener("toggle", (evento) => {
    if (!evento.target.open || !datosOperaciones || document.getElementById("iteration-steps").children.length) return;
    const { matriz, b, inicial, resultado } = datosOperaciones;
    let anterior = inicial;
    const pasos = resultado.historial.map(({ iteracion, vector }) => {
      const item = document.createElement("li");
      item.textContent = `Iteración ${iteracion}: ${describirIteracion(matriz, b, anterior, vector).join("; ")}`;
      anterior = vector;
      return item;
    });
    document.getElementById("iteration-steps").replaceChildren(...pasos);
  });
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
    resolverJacobi,
    describirIteracion
  };
}
