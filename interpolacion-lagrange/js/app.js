"use strict";

const motorLagrange = typeof module !== "undefined" && module.exports
  ? require("./lagrange.js")
  : window.LagrangeEngine;
const {
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
} = motorLagrange;

function formatearNumero(valor, decimales = 6) {
  const normalizado = Object.is(valor, -0) ? 0 : valor;
  if (normalizado !== 0 && Math.abs(normalizado) < 10 ** -decimales) return normalizado.toExponential(6);
  return normalizado.toFixed(decimales);
}

function formatearEje(valor, amplitud) {
  if (valor !== 0 && (Math.abs(valor) < 0.001 || Math.abs(valor) >= 1e7)) {
    const precision = Math.min(15, Math.max(3, Math.ceil(Math.log10(Math.max(1, Math.abs(valor) / amplitud))) + 2));
    return valor.toExponential(precision);
  }
  const decimales = Math.min(15, Math.max(0, 2 - Math.floor(Math.log10(amplitud))));
  return String(Number(valor.toFixed(decimales)));
}

function formatearDetalle(valor) {
  if (Number.isInteger(valor)) {
    return String(valor);
  }
  return formatearNumero(valor).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function convertirSubindice(valor) {
  const digitos = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
  return String(valor).split("").map((digito) => digitos[digito]).join("");
}

function nombrePolinomio(cantidadNodos) {
  return `P${convertirSubindice(cantidadNodos - 1)}`;
}

function crearAplicacion(document, modo) {
const esOriginal = modo === "original";
const unidad = esOriginal ? " ms" : "";
if (esOriginal) document.querySelector(".input-section .section-heading > p").textContent = "Datos experimentales y punto de evaluación del ejercicio original.";
if (!esOriginal) {
  document.querySelector(".input-table thead th:nth-child(2)").textContent = "xᵢ";
  document.querySelector(".input-table thead th:nth-child(3)").textContent = "yᵢ";
  document.querySelectorAll(".result-label")[1].textContent = "Valor interpolado";
  document.querySelector("#result-section .section-heading > p").textContent = "Valor del polinomio construido con los nodos de este ejercicio.";
}

function crearCelda(fila, texto) {
  const celda = document.createElement("td");
  celda.textContent = texto;
  fila.append(celda);
}

function crearFilaNodo(indice, x = "", y = "") {
  const fila = document.createElement("tr");
  fila.className = "node-row";

  const encabezado = document.createElement("th");
  encabezado.scope = "row";
  encabezado.textContent = `x${convertirSubindice(indice)}`;
  fila.append(encabezado);

  [["x", x, esOriginal ? "Memoria" : "Coordenada x"], ["y", y, esOriginal ? "Latencia" : "Valor y"]].forEach(([variable, valor, descripcion]) => {
    const celda = document.createElement("td");
    const etiqueta = document.createElement("label");
    const entrada = document.createElement("input");
    const id = document.id(`${variable}-${indice}`);
    etiqueta.className = "visually-hidden";
    etiqueta.htmlFor = id;
    etiqueta.textContent = `${descripcion} del nodo ${indice}`;
    entrada.id = id;
    entrada.className = `node-${variable}`;
    entrada.type = "number";
    entrada.step = "any";
    entrada.required = true;
    entrada.readOnly = esOriginal;
    entrada.value = valor === "" ? "" : String(valor);
    celda.append(etiqueta, entrada);
    fila.append(celda);
  });

  const celda = document.createElement("td");
  const eliminar = document.createElement("button");
  eliminar.type = "button";
  eliminar.className = "secondary-button remove-node-button";
  eliminar.textContent = "Eliminar";
  celda.append(eliminar);
  fila.append(celda);
  return fila;
}

function actualizarConteoNodos() {
  const cantidad = document.querySelectorAll("#nodes-body .node-row").length;
  document.querySelectorAll("#nodes-body .node-row").forEach((fila, i) => {
    fila.querySelector("th").textContent = `x${convertirSubindice(i)}`;
    ["x", "y"].forEach((variable) => {
      const campo = fila.querySelector(`.node-${variable}`);
      campo.id = document.id(`${variable}-${i}`);
      campo.previousElementSibling.htmlFor = campo.id;
      campo.previousElementSibling.textContent = `${variable === "x" ? (esOriginal ? "Memoria" : "Coordenada x") : (esOriginal ? "Latencia" : "Valor y")} del nodo ${i}`;
    });
    const boton = fila.querySelector(".remove-node-button");
    boton.disabled = cantidad <= 2;
    boton.setAttribute("aria-label", `Eliminar nodo ${i}`);
  });
  document.getElementById("node-count").textContent =
    `${cantidad} nodos · polinomio ${nombrePolinomio(cantidad)}`;
  return cantidad;
}

function agregarFilaNodo(x = "", y = "") {
  const cuerpo = document.getElementById("nodes-body");
  const indice = cuerpo.children.length;
  const fila = crearFilaNodo(indice, x, y);
  cuerpo.append(fila);
  actualizarConteoNodos();
  return fila.querySelector(".node-x");
}

function crearElementoSvg(nombre, atributos = {}) {
  const elemento = document.createElementNS("http://www.w3.org/2000/svg", nombre);
  Object.entries(atributos).forEach(([atributo, valor]) => {
    elemento.setAttribute(atributo, atributo === "id" ? document.id(valor) : String(valor));
  });
  return elemento;
}

function leerFormulario() {
  if (esOriginal) return { nodos: NODOS_INICIALES.map((nodo) => ({ ...nodo })), xEvaluar: PUNTO_EVALUACION_INICIAL };
  const filas = Array.from(document.querySelectorAll("#nodes-body .node-row"));
  const campoEvaluacion = document.getElementById("x-eval");
  const campos = [
    ...filas.flatMap((fila) => [fila.querySelector(".node-x"), fila.querySelector(".node-y")]),
    campoEvaluacion
  ];
  if (campos.some((campo) => campo.value.trim() === "")) {
    throw new ValidationError("Completa todos los nodos y el punto a evaluar.");
  }

  const nodos = filas.map((fila) => ({
    x: Number(fila.querySelector(".node-x").value),
    y: Number(fila.querySelector(".node-y").value)
  }));
  const xEvaluar = Number(campoEvaluacion.value);

  validarNodos(nodos);
  validarNumero(xEvaluar, "El punto a evaluar");
  return { nodos, xEvaluar };
}

function actualizarEstado(mensaje, tipo) {
  const estado = document.getElementById("calculation-status");
  estado.className = `status-message status-${tipo}`;
  estado.textContent = mensaje;
}

function mostrarProcedimiento(resultado, xEvaluar) {
  const cuerpo = document.getElementById("procedure-body");
  const polinomio = nombrePolinomio(resultado.terminos.length);
  cuerpo.replaceChildren();

  resultado.terminos.forEach((termino) => {
    const fila = document.createElement("tr");
    const numeradorSimbolico = termino.factores
      .map(({ xComparado }) => `(${formatearDetalle(xEvaluar)} - ${formatearDetalle(xComparado)})`)
      .join(" · ");
    const denominadorSimbolico = termino.factores
      .map(({ xComparado }) => `(${formatearDetalle(termino.x)} - ${formatearDetalle(xComparado)})`)
      .join(" · ");
    const numeradorNumerico = termino.factores
      .map(({ numerador }) => formatearDetalle(numerador))
      .join(" · ");
    const denominadorNumerico = termino.factores
      .map(({ denominador }) => formatearDetalle(denominador))
      .join(" · ");

    const subindice = convertirSubindice(termino.indice);
    crearCelda(fila, `Paso ${termino.indice + 1}: L${subindice}`);
    crearCelda(
      fila,
      `L${subindice}(${formatearDetalle(xEvaluar)}) = [${numeradorSimbolico}] / [${denominadorSimbolico}]`
    );
    crearCelda(
      fila,
      `(${numeradorNumerico}) / (${denominadorNumerico}) = ${formatearDetalle(termino.numerador)} / ${formatearDetalle(termino.denominador)}`
    );
    crearCelda(fila, formatearNumero(termino.base));
    crearCelda(
      fila,
      `${formatearDetalle(termino.y)} · ${formatearNumero(termino.base)} = ${formatearNumero(termino.contribucion)}`
    );
    cuerpo.append(fila);
  });

  const sumaBases = resultado.bases.reduce((suma, base) => suma + base, 0);
  document.getElementById("basis-check").textContent =
    `Comprobación: Σ Lₖ(${formatearDetalle(xEvaluar)}) = ${formatearNumero(sumaBases)}.`;
  const sumaContribuciones = resultado.terminos
    .map(({ y, base }) => `${formatearDetalle(y)}(${formatearNumero(base)})`)
    .join(" + ");
  document.getElementById("final-sum").textContent =
    `${polinomio}(${formatearDetalle(xEvaluar)}) = ${sumaContribuciones} = ${formatearNumero(resultado.valor)}${unidad}`;
}

function limpiarProcedimiento() {
  document.getElementById("procedure-body").replaceChildren();
  document.getElementById("basis-check").textContent = "";
  document.getElementById("final-sum").textContent = "";
}

function actualizarEtiquetasPolinomio(cantidadNodos, xEvaluar = null) {
  const polinomio = nombrePolinomio(cantidadNodos);
  const argumento = xEvaluar === null ? "x" : formatearNumero(xEvaluar, 4);
  document.getElementById("evaluation-label").textContent = `${polinomio}(${argumento})`;
  document.getElementById("applied-formula").textContent =
    `${polinomio}(x_eval) = Σ yₖLₖ(x_eval)`;
  document.getElementById("legend-polynomial").textContent = `${polinomio}(x)`;
  document.getElementById("chart-description-text").textContent =
    `Polinomio ${polinomio}(x) representado en el intervalo [2, 12].`;
}

function limpiarSalidas() {
  const cantidadNodos = document.querySelectorAll("#nodes-body .node-row").length;
  actualizarEtiquetasPolinomio(cantidadNodos);
  document.getElementById("interpolated-value").textContent = "-";
  limpiarProcedimiento();
  const descripcion = crearElementoSvg("desc", { id: "chart-description" });
  descripcion.textContent = "Sin cálculo vigente.";
  document.getElementById("lagrange-chart").replaceChildren(descripcion);
  document.getElementById("chart-note").textContent = "";
  document.querySelectorAll(".calculation-output").forEach((seccion) => {
    seccion.hidden = true;
  });
}

function mostrarSalidas() {
  document.querySelectorAll(".calculation-output").forEach((seccion) => {
    seccion.hidden = false;
  });
}

function dibujarGrafica(nodos, xEvaluar, valorEvaluado) {
  const svg = document.getElementById("lagrange-chart");
  const [xMin, xMax] = intervaloGrafico(nodos, xEvaluar);
  const muestras = muestrearPolinomio(nodos, xMin, xMax);
  const nodosVisibles = nodos.filter(({ x }) => x >= xMin && x <= xMax);
  const evaluacionVisible = xEvaluar >= xMin && xEvaluar <= xMax;
  const valoresY = [
    ...muestras.map(({ y }) => y),
    ...nodosVisibles.map(({ y }) => y),
    ...(evaluacionVisible ? [valorEvaluado] : [])
  ];

  const [yMin, yMax] = rangoGrafico(valoresY);

  const movil = window.matchMedia("(max-width: 720px)").matches;
  const ancho = movil ? 380 : 900;
  const alto = movil ? 420 : 500;
  const cientifico = [yMin, yMax].some((y) => y !== 0 && (Math.abs(y) < 0.001 || Math.abs(y) >= 1e7));
  const margen = { izquierda: cientifico ? 110 : movil ? 64 : 82, derecha: movil ? 18 : 30, superior: 28, inferior: 68 };
  svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
  svg.style.aspectRatio = `${ancho} / ${alto}`;
  const anchoUtil = ancho - margen.izquierda - margen.derecha;
  const altoUtil = alto - margen.superior - margen.inferior;
  const mapearX = (x) => margen.izquierda + ((x - xMin) / (xMax - xMin)) * anchoUtil;
  const mapearY = (y) => margen.superior + ((yMax - y) / (yMax - yMin)) * altoUtil;

  svg.replaceChildren();
  const descripcion = crearElementoSvg("desc", { id: "chart-description" });
  descripcion.textContent =
    `Curva del polinomio interpolador, ${nodos.length} nodos experimentales y punto evaluado.`;
  svg.append(descripcion);
  svg.append(crearElementoSvg("rect", {
    x: margen.izquierda,
    y: margen.superior,
    width: anchoUtil,
    height: altoUtil,
    fill: "#ffffff"
  }));

  for (let indice = 0; indice <= 5; indice += 1) {
    const y = yMin + ((yMax - yMin) * indice) / 5;
    const posicionY = mapearY(y);
    svg.append(crearElementoSvg("line", {
      x1: margen.izquierda,
      y1: posicionY,
      x2: ancho - margen.derecha,
      y2: posicionY,
      stroke: "#dfe5e9",
      "stroke-width": 1
    }));
    const etiqueta = crearElementoSvg("text", {
      x: margen.izquierda - 12,
      y: posicionY + 5,
      fill: "#5c6874",
      "font-size": 14,
      "text-anchor": "end"
    });
    etiqueta.textContent = formatearEje(y, yMax - yMin);
    svg.append(etiqueta);
  }

  const divisiones = movil ? 3 : 5;
  for (let i = 0; i <= divisiones; i += 1) {
    const x = xMin + (xMax - xMin) * i / divisiones;
    const posicionX = mapearX(x);
    svg.append(crearElementoSvg("line", {
      x1: posicionX,
      y1: margen.superior,
      x2: posicionX,
      y2: alto - margen.inferior,
      stroke: "#edf0f2",
      "stroke-width": 1
    }));
    const etiqueta = crearElementoSvg("text", {
      x: posicionX,
      y: alto - margen.inferior + 26,
      fill: "#5c6874",
      "font-size": 14,
      "text-anchor": "middle"
    });
    etiqueta.textContent = formatearEje(x, xMax - xMin);
    svg.append(etiqueta);
  }

  svg.append(crearElementoSvg("line", {
    x1: margen.izquierda,
    y1: alto - margen.inferior,
    x2: ancho - margen.derecha,
    y2: alto - margen.inferior,
    stroke: "#0a2236",
    "stroke-width": 2
  }));
  svg.append(crearElementoSvg("line", {
    x1: margen.izquierda,
    y1: margen.superior,
    x2: margen.izquierda,
    y2: alto - margen.inferior,
    stroke: "#0a2236",
    "stroke-width": 2
  }));

  const ruta = muestras.map(({ x, y }, indice) => `${indice === 0 ? "M" : "L"} ${mapearX(x).toFixed(2)} ${mapearY(y).toFixed(2)}`).join(" ");
  svg.append(crearElementoSvg("path", {
    class: "polynomial-curve",
    d: ruta,
    fill: "none",
    stroke: "#12304a",
    "stroke-width": 4,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }));

  nodosVisibles.forEach(({ x, y }) => {
    svg.append(crearElementoSvg("circle", {
      class: "experimental-node",
      "data-x": x,
      "data-y": y,
      cx: mapearX(x),
      cy: mapearY(y),
      r: 7,
      fill: "#a44236",
      stroke: "#ffffff",
      "stroke-width": 3
    }));
  });

  if (evaluacionVisible) {
    const puntoX = mapearX(xEvaluar);
    const puntoY = mapearY(valorEvaluado);
    svg.append(crearElementoSvg("line", {
      x1: puntoX,
      y1: puntoY,
      x2: puntoX,
      y2: alto - margen.inferior,
      stroke: "#d3a124",
      "stroke-width": 2,
      "stroke-dasharray": "7 6"
    }));
    svg.append(crearElementoSvg("circle", {
      class: "interpolated-point",
      "data-x": xEvaluar,
      "data-y": valorEvaluado,
      cx: puntoX,
      cy: puntoY,
      r: 10,
      fill: "#e0ad2f",
      stroke: "#0a2236",
      "stroke-width": 4
    }));

    const etiquetaPunto = crearElementoSvg("text", {
      x: Math.min(puntoX + 14, ancho - 170),
      y: Math.max(puntoY - 15, margen.superior + 18),
      fill: "#0a2236",
      "font-size": 15,
      "font-weight": 700
    });
    etiquetaPunto.textContent = `(${formatearNumero(xEvaluar, 2)}, ${formatearNumero(valorEvaluado, 2)})`;
    svg.append(etiquetaPunto);
  }

  const etiquetaX = crearElementoSvg("text", {
    x: margen.izquierda + anchoUtil / 2,
    y: alto - 16,
    fill: "#17212b",
    "font-size": movil ? 13 : 16,
    "font-weight": 700,
    "text-anchor": "middle"
  });
  etiquetaX.textContent = esOriginal ? "Memoria asignada (GB)" : "Coordenada x";
  svg.append(etiquetaX);

  const etiquetaY = crearElementoSvg("text", {
    x: 22,
    y: margen.superior + altoUtil / 2,
    fill: "#17212b",
    "font-size": movil ? 13 : 16,
    "font-weight": 700,
    "text-anchor": "middle",
    transform: `rotate(-90 22 ${margen.superior + altoUtil / 2})`
  });
  etiquetaY.textContent = esOriginal ? "Latencia media (ms)" : "P(x)";
  svg.append(etiquetaY);

  const nota = document.getElementById("chart-note");
  const esInterpolacion = xEvaluar >= Math.min(...nodos.map(({ x }) => x)) && xEvaluar <= Math.max(...nodos.map(({ x }) => x));
  nota.textContent = `${esInterpolacion ? "Interpolación" : "Extrapolación"}: (${formatearNumero(xEvaluar, 2)}, ${formatearNumero(valorEvaluado, 2)}${unidad}).`;
  document.getElementById("chart-description-text").textContent = `Polinomio ${nombrePolinomio(nodos.length)}(x) en [${formatearDetalle(xMin)}, ${formatearDetalle(xMax)}].`;
}

function ejecutarInterpolacion(evento) {
  evento?.preventDefault();

  try {
    const { nodos, xEvaluar } = leerFormulario();
    const resultado = interpolarLagrange(nodos, xEvaluar);

    actualizarEtiquetasPolinomio(nodos.length, xEvaluar);
    document.getElementById("interpolated-value").textContent = formatearNumero(resultado.valor);
    mostrarProcedimiento(resultado, xEvaluar);
    dibujarGrafica(nodos, xEvaluar, resultado.valor);
    mostrarSalidas();
    actualizarEstado(`Interpolación calculada correctamente con ${nodos.length} nodos.`, "success");
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      console.error(error);
    }
    limpiarSalidas();
    actualizarEstado(error.message, "error");
  }
}

function cargarDatosIniciales() {
  document.getElementById("nodes-body").replaceChildren();
  NODOS_INICIALES.forEach(({ x, y }) => {
    agregarFilaNodo(x, y);
  });
  document.getElementById("x-eval").value = String(PUNTO_EVALUACION_INICIAL);
}

function agregarNodo() {
  if (esOriginal) return;
  const entrada = agregarFilaNodo();
  limpiarSalidas();
  actualizarEstado("Nuevo nodo agregado. Completa sus valores para volver a calcular.", "info");
  entrada.focus();
}

function marcarDatosPendientes(evento) {
  if (!evento.target.matches("input")) {
    return;
  }

  const hayResultadosVisibles = Array.from(document.querySelectorAll(".calculation-output"))
    .some((seccion) => !seccion.hidden);
  if (hayResultadosVisibles) {
    limpiarSalidas();
    actualizarEstado("Datos modificados. Presiona Calcular interpolación para obtener el nuevo resultado.", "info");
  }
}

function iniciarAplicacion() {
  cargarDatosIniciales();
  const formulario = document.getElementById("lagrange-form");
  formulario.addEventListener("submit", ejecutarInterpolacion);
  formulario.addEventListener("input", marcarDatosPendientes);
  document.getElementById("add-node-button").addEventListener("click", agregarNodo);
  document.getElementById("nodes-body").addEventListener("click", (evento) => {
    const boton = evento.target.closest(".remove-node-button");
    if (esOriginal || !boton || boton.disabled) return;
    boton.closest("tr").remove();
    actualizarConteoNodos();
    limpiarSalidas();
    actualizarEstado("Nodo eliminado. Listo para recalcular.", "info");
  });
  document.getElementById("clear-button").addEventListener("click", () => {
    if (!esOriginal) formulario.querySelectorAll("input").forEach((campo) => { campo.value = ""; });
    limpiarSalidas();
    actualizarEstado(esOriginal ? "Resultados borrados. Los nodos originales se conservan." : "Campos vacíos. Introduce los nodos del nuevo ejercicio.", "info");
  });
  document.getElementById("restore-button").addEventListener("click", () => {
    cargarDatosIniciales();
    limpiarSalidas();
    actualizarEstado("Ejemplo original restaurado. Listo para calcular.", "info");
    if (esOriginal) ejecutarInterpolacion();
  });
  window.matchMedia("(max-width: 720px)").addEventListener("change", () => {
    if (!document.getElementById("result-section").hidden) ejecutarInterpolacion();
  });
  limpiarSalidas();
}

iniciarAplicacion();
if (!esOriginal) document.getElementById("clear-button").click();
return { activar() { if (esOriginal) { cargarDatosIniciales(); ejecutarInterpolacion(); } } };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => window.ExercisePanels.montar(crearAplicacion), { once: true });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = motorLagrange;
}
