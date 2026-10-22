"use strict";

// ==================================================
// CONFIGURACIÓN Y DATOS
// ==================================================

const EPSILON = 1e-9;
const entradaLineal = typeof module !== "undefined" && module.exports
  ? require("../../shared/linear-input.js") : window.LinearInput;

const A = Object.freeze([
  Object.freeze([4, 2, 1]),
  Object.freeze([12, 10, 5]),
  Object.freeze([-8, 8, 7])
]);

const B1 = Object.freeze([14, 46, 26]);
const B2 = Object.freeze([20, 62, 30]);

// ==================================================
// VALIDACIONES
// ==================================================

function validarMatrizCuadrada(matriz) {
  if (!Array.isArray(matriz) || matriz.length === 0) {
    throw new TypeError("La matriz A no puede estar vacía.");
  }

  const dimension = matriz.length;
  for (let indice = 0; indice < dimension; indice += 1) {
    const fila = matriz[indice];
    if (!Array.isArray(fila) || fila.length !== dimension) {
      throw new TypeError(`La fila ${indice + 1} no tiene ${dimension} elementos; la matriz debe ser cuadrada.`);
    }

    for (let columna = 0; columna < dimension; columna += 1) {
      const valor = fila[columna];
      if (typeof valor !== "number" || !Number.isFinite(valor)) {
        throw new TypeError("Todos los elementos de la matriz deben ser números finitos.");
      }
    }
  }

  return true;
}

function validarVector(matriz, vector) {
  validarMatrizCuadrada(matriz);

  if (!Array.isArray(vector) || vector.length !== matriz.length) {
    throw new TypeError(`El vector debe contener exactamente ${matriz.length} elementos.`);
  }

  if (!Array.from(vector).every((valor) => typeof valor === "number" && Number.isFinite(valor))) {
    throw new TypeError("Todos los elementos del vector deben ser números finitos.");
  }

  return true;
}

function validarResultadoNumerico(valores, nombre) {
  if (!valores.every((valor) => typeof valor === "number" && Number.isFinite(valor))) {
    throw new ArithmeticError(`${nombre} contiene un resultado no numérico o infinito.`);
  }
}

// Error semántico para distinguir fallos aritméticos controlados.
class ArithmeticError extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "ArithmeticError";
  }
}

// ==================================================
// UTILIDADES MATEMÁTICAS
// ==================================================

function crearMatrizCeros(filas, columnas) {
  return Array.from({ length: filas }, () => Array(columnas).fill(0));
}

function copiarMatriz(matriz) {
  return matriz.map((fila) => [...fila]);
}

function multiplicarMatrices(matrizA, matrizB) {
  if (!Array.isArray(matrizA) || !Array.isArray(matrizB) || matrizA.length === 0 || matrizB.length === 0) {
    throw new TypeError("Las matrices que se multiplicarán no pueden estar vacías.");
  }

  const columnasA = matrizA[0]?.length;
  const columnasB = matrizB[0]?.length;
  const matricesValidas = matrizA.every((fila) => Array.isArray(fila) && fila.length === columnasA)
    && matrizB.every((fila) => Array.isArray(fila) && fila.length === columnasB);

  if (!matricesValidas || columnasA !== matrizB.length) {
    throw new TypeError("Las dimensiones de las matrices no son compatibles para la multiplicación.");
  }

  const resultado = crearMatrizCeros(matrizA.length, columnasB);
  for (let i = 0; i < matrizA.length; i += 1) {
    for (let j = 0; j < columnasB; j += 1) {
      for (let k = 0; k < columnasA; k += 1) {
        resultado[i][j] += matrizA[i][k] * matrizB[k][j];
      }
    }
  }

  return resultado;
}

function multiplicarMatrizVector(matriz, vector) {
  validarVector(matriz, vector);
  return matriz.map((fila) => fila.reduce(
    (acumulado, valor, indice) => acumulado + valor * vector[indice],
    0
  ));
}

function aproximadamenteIguales(valorA, valorB, tolerancia = EPSILON) {
  return Number.isFinite(valorA) && Number.isFinite(valorB)
    && Math.abs(valorA - valorB) <= tolerancia * Math.max(1, Math.abs(valorA), Math.abs(valorB));
}

function vectoresAproximadamenteIguales(vectorA, vectorB, tolerancia = EPSILON) {
  return vectorA.length === vectorB.length
    && vectorA.every((valor, indice) => aproximadamenteIguales(valor, vectorB[indice], tolerancia));
}

function matricesAproximadamenteIguales(matrizA, matrizB, tolerancia = EPSILON) {
  return matrizA.length === matrizB.length
    && matrizA.every((fila, indice) => vectoresAproximadamenteIguales(fila, matrizB[indice], tolerancia));
}

function formatearNumero(numero) {
  if (!Number.isFinite(numero)) {
    return String(numero);
  }

  const normalizado = Object.is(numero, -0) ? 0 : numero;
  if (normalizado !== 0 && Math.abs(normalizado) < 1e-6) return normalizado.toExponential(6);
  const enteroCercano = Math.round(normalizado);
  if (Math.abs(normalizado - enteroCercano) <= EPSILON) {
    return String(enteroCercano);
  }

  return Number(normalizado.toFixed(6)).toString();
}

// ==================================================
// FACTORIZACIÓN LU - DOOLITTLE
// ==================================================

function factorizarDoolittle(matriz) {
  validarMatrizCuadrada(matriz);

  const datos = copiarMatriz(matriz);
  const dimension = datos.length;
  const L = crearMatrizCeros(dimension, dimension);
  const U = crearMatrizCeros(dimension, dimension);

  for (let i = 0; i < dimension; i += 1) {
    L[i][i] = 1;

    for (let j = i; j < dimension; j += 1) {
      let suma = 0;
      for (let k = 0; k < i; k += 1) {
        suma += L[i][k] * U[k][j];
      }
      U[i][j] = datos[i][j] - suma;
      validarResultadoNumerico([U[i][j]], "La matriz U");
    }

    if (U[i][i] === 0) {
      throw new ArithmeticError(`El pivote U[${i + 1}][${i + 1}] es cero o demasiado pequeño. No se puede continuar sin pivoteo.`);
    }

    for (let j = i + 1; j < dimension; j += 1) {
      let suma = 0;
      for (let k = 0; k < i; k += 1) {
        suma += L[j][k] * U[k][i];
      }
      L[j][i] = (datos[j][i] - suma) / U[i][i];
      validarResultadoNumerico([L[j][i]], "La matriz L");
    }
  }

  return { L, U };
}

// ==================================================
// SUSTITUCIÓN HACIA ADELANTE
// ==================================================

function sustitucionAdelante(L, b) {
  validarVector(L, b);
  const y = Array(L.length).fill(0);

  for (let i = 0; i < L.length; i += 1) {
    if (L[i][i] === 0) {
      throw new ArithmeticError(`El pivote L[${i + 1}][${i + 1}] es cero o demasiado pequeño.`);
    }

    let suma = 0;
    for (let j = 0; j < i; j += 1) {
      suma += L[i][j] * y[j];
    }
    y[i] = (b[i] - suma) / L[i][i];
  }

  validarResultadoNumerico(y, "El vector intermedio y");
  return y;
}

// ==================================================
// SUSTITUCIÓN HACIA ATRÁS
// ==================================================

function sustitucionAtras(U, y) {
  validarVector(U, y);
  const x = Array(U.length).fill(0);

  for (let i = U.length - 1; i >= 0; i -= 1) {
    if (U[i][i] === 0) {
      throw new ArithmeticError(`El pivote U[${i + 1}][${i + 1}] es cero o demasiado pequeño.`);
    }

    let suma = 0;
    for (let j = i + 1; j < U.length; j += 1) {
      suma += U[i][j] * x[j];
    }
    x[i] = (y[i] - suma) / U[i][i];
  }

  validarResultadoNumerico(x, "El vector solución x");
  return x;
}

// ==================================================
// VERIFICACIONES
// ==================================================

function resolverConFactores(matriz, L, U, b) {
  validarMatrizCuadrada(matriz);
  const y = sustitucionAdelante(L, b);
  const x = sustitucionAtras(U, y);
  const productoAx = multiplicarMatrizVector(matriz, x);
  validarResultadoNumerico(productoAx, "El producto A·x");
  const residuo = Math.max(...b.map((valor, i) => Math.abs(valor - productoAx[i])));
  const escala = Math.max(...b.map(Math.abs), ...matriz.map((fila) => fila.reduce((suma, valor, j) => suma + Math.abs(valor * x[j]), 0)));
  validarResultadoNumerico([residuo, escala], "La verificación residual");
  const errorResidual = escala === 0 ? residuo : residuo / escala;

  return {
    b: [...b],
    y,
    x,
    productoAx,
    residuo,
    errorResidual,
    verificado: Number.isFinite(errorResidual) && errorResidual <= EPSILON
  };
}

function describirDoolittle(matriz, L, U) {
  const pasos = [];

  for (let i = 0; i < matriz.length; i += 1) {
    pasos.push(`Se fija L[${i + 1},${i + 1}] = 1.`);

    for (let j = i; j < matriz.length; j += 1) {
      const productos = [];
      let suma = 0;
      for (let k = 0; k < i; k += 1) {
        productos.push(`(${formatearNumero(L[i][k])})(${formatearNumero(U[k][j])})`);
        suma += L[i][k] * U[k][j];
      }
      const desarrollo = productos.length > 0 ? productos.join(" + ") : "0";
      pasos.push(
        `U[${i + 1},${j + 1}] = ${formatearNumero(matriz[i][j])} - [${desarrollo}] = ${formatearNumero(U[i][j])}.`
      );
    }

    for (let j = i + 1; j < matriz.length; j += 1) {
      const productos = [];
      let suma = 0;
      for (let k = 0; k < i; k += 1) {
        productos.push(`(${formatearNumero(L[j][k])})(${formatearNumero(U[k][i])})`);
        suma += L[j][k] * U[k][i];
      }
      const desarrollo = productos.length > 0 ? productos.join(" + ") : "0";
      pasos.push(
        `L[${j + 1},${i + 1}] = (${formatearNumero(matriz[j][i])} - [${desarrollo}]) / ${formatearNumero(U[i][i])} = ${formatearNumero(L[j][i])}.`
      );
    }
  }

  return pasos;
}

function describirSustitucionAdelante(L, b, y) {
  return y.map((valor, i) => {
    const terminos = [];
    for (let j = 0; j < i; j += 1) {
      terminos.push(`(${formatearNumero(L[i][j])})(${formatearNumero(y[j])})`);
    }
    const suma = terminos.length > 0 ? terminos.join(" + ") : "0";
    return `y${i + 1} = (${formatearNumero(b[i])} - [${suma}]) / ${formatearNumero(L[i][i])} = ${formatearNumero(valor)}.`;
  });
}

function describirSustitucionAtras(U, y, x) {
  const pasos = [];
  for (let i = U.length - 1; i >= 0; i -= 1) {
    const terminos = [];
    for (let j = i + 1; j < U.length; j += 1) {
      terminos.push(`(${formatearNumero(U[i][j])})(${formatearNumero(x[j])})`);
    }
    const suma = terminos.length > 0 ? terminos.join(" + ") : "0";
    pasos.push(
      `x${i + 1} = (${formatearNumero(y[i])} - [${suma}]) / ${formatearNumero(U[i][i])} = ${formatearNumero(x[i])}.`
    );
  }
  return pasos;
}

function comprobarErrorControlado(operacion) {
  try {
    operacion();
    return false;
  } catch (error) {
    return error instanceof Error;
  }
}

// ==================================================
// UTILIDADES DE INTERFAZ
// ==================================================

function crearAplicacion(document, modo) {
const esOriginal = modo === "original";
if (!esOriginal) {
  const titulo = document.getElementById("system-title");
  titulo.textContent = "Datos del nuevo sistema";
  document.querySelector(".intro-section .section-heading > p").textContent = "Sistema A·x = b con uno o dos vectores independientes.";
}

function crearTablaMatriz(matriz) {
  const contenedor = document.createElement("div");
  contenedor.className = "matrix-wrap";

  const tabla = document.createElement("table");
  tabla.className = "matrix-table";
  tabla.setAttribute("aria-label", "Representación matricial");

  const cuerpo = document.createElement("tbody");
  matriz.forEach((fila) => {
    const filaHtml = document.createElement("tr");
    fila.forEach((valor) => {
      const celda = document.createElement("td");
      celda.textContent = formatearNumero(valor);
      filaHtml.append(celda);
    });
    cuerpo.append(filaHtml);
  });

  tabla.append(cuerpo);
  contenedor.append(tabla);
  return contenedor;
}

function mostrarMatriz(id, matriz) {
  const destino = document.getElementById(id);
  destino.replaceChildren(crearTablaMatriz(matriz));
}

function mostrarVector(id, vector) {
  mostrarMatriz(id, vector.map((valor) => [valor]));
}

function crearPanelMatriz(titulo, datos) {
  const panel = document.createElement("article");
  panel.className = "result-panel";

  const encabezado = document.createElement("h3");
  encabezado.textContent = titulo;
  panel.append(encabezado, crearTablaMatriz(datos));
  return panel;
}

function crearPanelSolucion(solucion, indice) {
  const panel = document.createElement("article");
  panel.className = "result-panel";

  const encabezado = document.createElement("h3");
  encabezado.textContent = `x de U · x = y${indice}`;
  const lista = document.createElement("dl");
  lista.className = "result-list";

  solucion.forEach((valor, indice) => {
    const fila = document.createElement("div");
    fila.className = "result-row";
    const termino = document.createElement("dt");
    termino.textContent = `x${indice + 1}`;
    const resultado = document.createElement("dd");
    resultado.textContent = formatearNumero(valor);
    fila.append(termino, resultado);
    lista.append(fila);
  });

  const etiquetaVector = document.createElement("p");
  etiquetaVector.className = "vector-label";
  etiquetaVector.textContent = "Vector solución completo";

  panel.append(encabezado, lista, etiquetaVector, crearTablaMatriz(solucion.map((valor) => [valor])));
  return panel;
}

function mostrarEscenario(id, escenario, indice) {
  const destino = document.getElementById(id);
  destino.replaceChildren(
    crearPanelMatriz(`b${indice}`, escenario.b.map((valor) => [valor])),
    crearPanelMatriz(`y${indice} de L · y${indice} = b${indice}`, escenario.y.map((valor) => [valor])),
    crearPanelSolucion(escenario.x, indice),
    crearPanelMatriz("Producto A · x", escenario.productoAx.map((valor) => [valor]))
  );
}

function mostrarPasos(id, pasos) {
  const destino = document.getElementById(id);
  const elementos = pasos.map((paso) => {
    const elemento = document.createElement("li");
    elemento.textContent = paso;
    return elemento;
  });
  destino.replaceChildren(...elementos);
}

function actualizarEstado(elemento, mensaje, correcto) {
  elemento.className = `status-message ${correcto ? "status-success" : "status-error"}`;
  elemento.textContent = `${correcto ? "✓" : "✗"} ${mensaje}`;
}

function mostrarDatosIniciales() {
  mostrarMatriz("matrix-a", A);
  mostrarVector("vector-b1", B1);
  mostrarVector("vector-b2", B2);
}

function limpiarResultados() {
  document.getElementById("results").hidden = true;
  [
    "matrix-l", "matrix-u", "matrix-lu", "doolittle-steps",
    "scenario-1-content", "scenario-1-forward-steps", "scenario-1-backward-steps",
    "scenario-2-content", "scenario-2-forward-steps", "scenario-2-backward-steps"
  ].forEach((id) => {
    document.getElementById(id).replaceChildren();
  });
  ["factorization-status", "scenario-1-status", "scenario-2-status"].forEach((id) => {
    const elemento = document.getElementById(id);
    elemento.className = "status-message";
    elemento.textContent = "";
  });
}

// ==================================================
// PRUEBAS INTERNAS
// ==================================================

function ejecutarPruebasInternas(resultados) {
  const LEsperada = [[1, 0, 0], [3, 1, 0], [-2, 3, 1]];
  const UEsperada = [[4, 2, 1], [0, 4, 2], [0, 0, 3]];
  const pruebas = [
    ["Doolittle L correcta", matricesAproximadamenteIguales(resultados.L, LEsperada)],
    ["Doolittle U correcta", matricesAproximadamenteIguales(resultados.U, UEsperada)],
    ["L*U = A", matricesAproximadamenteIguales(resultados.productoLU, A)],
    ["y1 correcta", vectoresAproximadamenteIguales(resultados.escenario1.y, [14, 4, 42])],
    ["solución b1 correcta", vectoresAproximadamenteIguales(resultados.escenario1.x, [3, -6, 14])],
    ["A*xB1 = b1", resultados.escenario1.verificado],
    ["y2 correcta", vectoresAproximadamenteIguales(resultados.escenario2.y, [20, 2, 64])],
    ["solución b2 correcta", vectoresAproximadamenteIguales(resultados.escenario2.x, [4.75, -10.1666666667, 21.3333333333])],
    ["A*xB2 = b2", resultados.escenario2.verificado],
    ["A no fue modificada", matricesAproximadamenteIguales(A, [[4, 2, 1], [12, 10, 5], [-8, 8, 7]])],
    ["Doolittle funciona para otra dimensión", (() => {
      const prueba = factorizarDoolittle([[2, 1], [4, 3]]);
      return matricesAproximadamenteIguales(multiplicarMatrices(prueba.L, prueba.U), [[2, 1], [4, 3]]);
    })()],
    ["pivote cero produce error controlado", comprobarErrorControlado(() => factorizarDoolittle([[0, 1], [1, 1]]))],
    ["matriz no cuadrada produce error controlado", comprobarErrorControlado(() => factorizarDoolittle([[1, 2, 3], [4, 5, 6]]))],
    ["vector incompatible produce error controlado", comprobarErrorControlado(() => sustitucionAdelante(resultados.L, [1, 2]))]
  ];

  pruebas.forEach(([nombre, aprobada]) => {
    const mensaje = `${aprobada ? "PASS" : "FAIL"} - ${nombre}`;
    if (aprobada) {
      console.log(mensaje);
    } else {
      console.error(mensaje);
    }
  });

  return {
    total: pruebas.length,
    aprobadas: pruebas.filter(([, aprobada]) => aprobada).length,
    todasAprobadas: pruebas.every(([, aprobada]) => aprobada)
  };
}

// ==================================================
// FLUJO PRINCIPAL
// ==================================================

function leerSistema() {
  if (esOriginal) return { matriz: A.map((fila) => [...fila]), b1: [...B1], b2: [...B2] };
  const matriz = entradaLineal.matriz(document.getElementById("input-a").value);
  const b1 = entradaLineal.vector(document.getElementById("input-b1").value, "El vector b₁");
  const b2 = document.getElementById("second-scenario").checked
    ? entradaLineal.vector(document.getElementById("input-b2").value, "El vector b₂") : null;
  validarVector(matriz, b1);
  if (b2) validarVector(matriz, b2);
  return { matriz, b1, b2 };
}

let presentacionOriginal;

function mostrarSistema(matriz, b1, b2) {
  document.getElementById("solve-description").textContent = b2
    ? "Factoriza A una vez y resuelve ambos escenarios." : "Factoriza A y resuelve el vector b₁.";
  mostrarMatriz("matrix-a", matriz);
  mostrarVector("vector-b1", b1);
  document.getElementById("vector-b2").closest("article").hidden = !b2;
  if (b2) mostrarVector("vector-b2", b2);
  const original = esOriginal && JSON.stringify(matriz) === JSON.stringify(A) && JSON.stringify(b1) === JSON.stringify(B1);
  const ecuaciones = document.getElementById("system-equations");
  if (original) {
    ecuaciones.innerHTML = presentacionOriginal.ecuaciones;
    document.getElementById("problem-context").innerHTML = presentacionOriginal.contexto;
  } else {
    ecuaciones.replaceChildren(...entradaLineal.ecuaciones(matriz, b1, formatearNumero).map((texto) => {
      const fila = document.createElement("article");
      fila.className = "equation-row";
      fila.textContent = texto;
      return fila;
    }));
    document.getElementById("problem-context").textContent = `Sistema A·x = b de ${matriz.length} ${matriz.length === 1 ? "incógnita" : "incógnitas"}. Doolittle sin pivoteo: todos los pivotes deben ser distintos de cero.`;
  }
  ecuaciones.hidden = false;
  document.getElementById("system-preview").hidden = false;
}

function invalidarSistema() {
  limpiarResultados();
  document.getElementById("system-equations").hidden = true;
  document.getElementById("system-preview").hidden = true;
  const estado = document.getElementById("global-status");
  estado.className = "status-message status-info";
  estado.textContent = "Datos modificados. Calcula para actualizar el sistema y sus resultados.";
}

function restaurarEjemplo() {
  document.getElementById("input-a").value = entradaLineal.textoMatriz(A);
  document.getElementById("input-b1").value = B1.join(" ");
  document.getElementById("input-b2").value = B2.join(" ");
  document.getElementById("second-scenario").checked = true;
  document.getElementById("input-b2").disabled = false;
  invalidarSistema();
  mostrarSistema(A, B1, B2);
  document.getElementById("global-status").textContent = "Ejemplo original restaurado. Listo para calcular.";
}

function resolverSistema(evento) {
  evento?.preventDefault();
  const estadoGlobal = document.getElementById("global-status");
  limpiarResultados();

  try {
    const { matriz, b1, b2 } = leerSistema();
    mostrarSistema(matriz, b1, b2);

    // Única factorización válida del flujo principal; ambos escenarios reutilizan estos objetos.
    const { L, U } = factorizarDoolittle(matriz);
    const productoLU = multiplicarMatrices(L, U);
    const factorizacionCorrecta = matricesAproximadamenteIguales(productoLU, matriz);

    const escenario1 = resolverConFactores(matriz, L, U, b1);
    const escenario2 = b2 ? resolverConFactores(matriz, L, U, b2) : null;
    const resultados = { L, U, productoLU, escenario1, escenario2 };
    const esEjemplo = JSON.stringify([matriz, b1, b2]) === JSON.stringify([A, B1, B2]);
    const pruebas = esEjemplo ? ejecutarPruebasInternas(resultados) : null;

    mostrarMatriz("matrix-l", L);
    mostrarMatriz("matrix-u", U);
    mostrarMatriz("matrix-lu", productoLU);
    mostrarPasos("doolittle-steps", describirDoolittle(matriz, L, U));
    mostrarEscenario("scenario-1-content", escenario1, 1);
    mostrarPasos("scenario-1-forward-steps", describirSustitucionAdelante(L, b1, escenario1.y));
    mostrarPasos("scenario-1-backward-steps", describirSustitucionAtras(U, escenario1.y, escenario1.x));
    document.getElementById("second-scenario-results").hidden = !escenario2;
    if (escenario2) {
      mostrarEscenario("scenario-2-content", escenario2, 2);
      mostrarPasos("scenario-2-forward-steps", describirSustitucionAdelante(L, b2, escenario2.y));
      mostrarPasos("scenario-2-backward-steps", describirSustitucionAtras(U, escenario2.y, escenario2.x));
    }

    actualizarEstado(
      document.getElementById("factorization-status"),
      `Verificación L·U = A: ${factorizacionCorrecta ? "CORRECTA" : "ERROR"}`,
      factorizacionCorrecta
    );
    actualizarEstado(
      document.getElementById("scenario-1-status"),
      `Verificación A·x = b1: ${escenario1.verificado ? "CORRECTA" : "ERROR"}. ||b1 − Ax||∞ = ${formatearNumero(escenario1.residuo)}`,
      escenario1.verificado
    );
    if (escenario2) actualizarEstado(
      document.getElementById("scenario-2-status"),
      `Verificación A·x = b2: ${escenario2.verificado ? "CORRECTA" : "ERROR"}. ||b2 − Ax||∞ = ${formatearNumero(escenario2.residuo)}`,
      escenario2.verificado
    );

    const todoCorrecto = factorizacionCorrecta
      && escenario1.verificado
      && (!escenario2 || escenario2.verificado)
      && (!pruebas || pruebas.todasAprobadas);
    const pivoteSensible = U.some((fila, i) => Math.abs(fila[i]) <= 1e-12 * Math.max(...matriz[i].map(Math.abs)));

    actualizarEstado(
      estadoGlobal,
      todoCorrecto
        ? `Cálculo terminado correctamente.`
        : "El cálculo terminó con verificaciones pendientes. Revisa la factorización y los residuos.",
      todoCorrecto
    );
    if (pivoteSensible) {
      estadoGlobal.className = "status-message status-info";
      estadoGlobal.textContent += " Advertencia: un pivote es pequeño respecto a los datos; los resultados pueden ser sensibles al redondeo.";
    }
    document.getElementById("results").hidden = false;
  } catch (error) {
    if (!(error instanceof TypeError) && !(error instanceof ArithmeticError)) console.error(error);
    actualizarEstado(estadoGlobal, `No fue posible resolver el sistema: ${error.message}`, false);
  }
}

function iniciarAplicacion() {
  presentacionOriginal = {
    ecuaciones: document.getElementById("system-equations").innerHTML,
    contexto: document.getElementById("problem-context").innerHTML
  };
  restaurarEjemplo();
  const formulario = document.getElementById("system-form");
  formulario.addEventListener("submit", resolverSistema);
  formulario.addEventListener("input", invalidarSistema);
  document.getElementById("second-scenario").addEventListener("change", (evento) => {
    document.getElementById("input-b2").disabled = !evento.target.checked;
  });
  document.getElementById("restore-button").addEventListener("click", () => {
    restaurarEjemplo();
  });
  document.getElementById("clear-button").addEventListener("click", () => {
    if (esOriginal) {
      limpiarResultados();
      const estado = document.getElementById("global-status");
      estado.className = "status-message status-info";
      estado.textContent = "Resultados borrados. Los datos originales de la tarea se conservan.";
      return;
    }
    ["input-a", "input-b1", "input-b2"].forEach((id) => { document.getElementById(id).value = ""; });
    invalidarSistema();
    document.getElementById("input-a").focus();
  });
}

iniciarAplicacion();
if (!esOriginal) document.getElementById("clear-button").click();
return { activar() { if (esOriginal) restaurarEjemplo(); } };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => window.ExercisePanels.montar(crearAplicacion), { once: true });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    A,
    B1,
    B2,
    formatearNumero,
    factorizarDoolittle,
    sustitucionAdelante,
    sustitucionAtras,
    multiplicarMatrices,
    multiplicarMatrizVector,
    matricesAproximadamenteIguales,
    vectoresAproximadamenteIguales,
    resolverConFactores,
    describirDoolittle,
    describirSustitucionAdelante,
    describirSustitucionAtras
  };
}
