"use strict";

const EPSILON_NUMERICO = 1e-12;
const INTERVALO_GRAFICA = Object.freeze([2, 12]);
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
    bases.push(base);
    valor += nodos[k].y * base;
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

function formatearNumero(valor, decimales = 6) {
  const normalizado = Math.abs(valor) < EPSILON_NUMERICO ? 0 : valor;
  return normalizado.toFixed(decimales);
}

function formatearEje(valor) {
  if (Math.abs(valor) >= 100) {
    return valor.toFixed(0);
  }
  if (Math.abs(valor) >= 10) {
    return valor.toFixed(1);
  }
  return valor.toFixed(2);
}

function crearElementoSvg(nombre, atributos = {}) {
  const elemento = document.createElementNS("http://www.w3.org/2000/svg", nombre);
  Object.entries(atributos).forEach(([atributo, valor]) => {
    elemento.setAttribute(atributo, String(valor));
  });
  return elemento;
}

function leerFormulario() {
  const nodos = Array.from({ length: 4 }, (_, indice) => ({
    x: Number(document.getElementById(`x-${indice}`).value),
    y: Number(document.getElementById(`y-${indice}`).value)
  }));
  const xEvaluar = Number(document.getElementById("x-eval").value);

  const campos = [
    ...Array.from({ length: 4 }, (_, indice) => document.getElementById(`x-${indice}`)),
    ...Array.from({ length: 4 }, (_, indice) => document.getElementById(`y-${indice}`)),
    document.getElementById("x-eval")
  ];
  if (campos.some((campo) => campo.value.trim() === "")) {
    throw new ValidationError("Completa los cuatro nodos y el punto a evaluar.");
  }

  validarNodos(nodos);
  validarNumero(xEvaluar, "El punto a evaluar");
  return { nodos, xEvaluar };
}

function actualizarEstado(mensaje, tipo) {
  const estado = document.getElementById("calculation-status");
  estado.className = `status-message status-${tipo}`;
  estado.textContent = mensaje;
}

function dibujarGrafica(nodos, xEvaluar, valorEvaluado) {
  const svg = document.getElementById("lagrange-chart");
  const [xMin, xMax] = INTERVALO_GRAFICA;
  const muestras = muestrearPolinomio(nodos, xMin, xMax);
  const nodosVisibles = nodos.filter(({ x }) => x >= xMin && x <= xMax);
  const evaluacionVisible = xEvaluar >= xMin && xEvaluar <= xMax;
  const valoresY = [
    ...muestras.map(({ y }) => y),
    ...nodosVisibles.map(({ y }) => y),
    ...(evaluacionVisible ? [valorEvaluado] : [])
  ];

  let yMin = Math.min(...valoresY);
  let yMax = Math.max(...valoresY);
  const amplitud = yMax - yMin;
  const margenY = amplitud <= EPSILON_NUMERICO ? Math.max(1, Math.abs(yMax) * 0.1) : amplitud * 0.12;
  yMin -= margenY;
  yMax += margenY;

  const ancho = 900;
  const alto = 500;
  const margen = { izquierda: 82, derecha: 30, superior: 28, inferior: 68 };
  const anchoUtil = ancho - margen.izquierda - margen.derecha;
  const altoUtil = alto - margen.superior - margen.inferior;
  const mapearX = (x) => margen.izquierda + ((x - xMin) / (xMax - xMin)) * anchoUtil;
  const mapearY = (y) => margen.superior + ((yMax - y) / (yMax - yMin)) * altoUtil;

  svg.replaceChildren();
  const descripcion = crearElementoSvg("desc", { id: "chart-description" });
  descripcion.textContent = "Curva del polinomio interpolador, cuatro nodos experimentales y punto evaluado.";
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
    etiqueta.textContent = formatearEje(y);
    svg.append(etiqueta);
  }

  for (let x = xMin; x <= xMax; x += 2) {
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
    etiqueta.textContent = String(x);
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
    d: ruta,
    fill: "none",
    stroke: "#12304a",
    "stroke-width": 4,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }));

  nodosVisibles.forEach(({ x, y }) => {
    svg.append(crearElementoSvg("circle", {
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
    "font-size": 16,
    "font-weight": 700,
    "text-anchor": "middle"
  });
  etiquetaX.textContent = "Memoria asignada (GB)";
  svg.append(etiquetaX);

  const etiquetaY = crearElementoSvg("text", {
    x: 22,
    y: margen.superior + altoUtil / 2,
    fill: "#17212b",
    "font-size": 16,
    "font-weight": 700,
    "text-anchor": "middle",
    transform: `rotate(-90 22 ${margen.superior + altoUtil / 2})`
  });
  etiquetaY.textContent = "Latencia media (ms)";
  svg.append(etiquetaY);

  const nota = document.getElementById("chart-note");
  nota.textContent = evaluacionVisible
    ? `Punto interpolado: (${formatearNumero(xEvaluar, 2)}, ${formatearNumero(valorEvaluado, 2)} ms).`
    : `El resultado fue calculado, pero x = ${formatearNumero(xEvaluar, 2)} está fuera del intervalo gráfico [2, 12].`;
}

function ejecutarInterpolacion(evento) {
  evento?.preventDefault();

  try {
    const { nodos, xEvaluar } = leerFormulario();
    const resultado = interpolarLagrange(nodos, xEvaluar);

    document.getElementById("evaluation-label").textContent = `P₃(${formatearNumero(xEvaluar, 4)})`;
    document.getElementById("interpolated-value").textContent = formatearNumero(resultado.valor);
    dibujarGrafica(nodos, xEvaluar, resultado.valor);
    actualizarEstado("Interpolación calculada correctamente con los cuatro nodos.", "success");
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      console.error(error);
    }
    document.getElementById("evaluation-label").textContent = "P₃(x)";
    document.getElementById("interpolated-value").textContent = "-";
    document.getElementById("lagrange-chart").replaceChildren();
    document.getElementById("chart-note").textContent = "";
    actualizarEstado(error.message, "error");
  }
}

function iniciarAplicacion() {
  document.getElementById("lagrange-form").addEventListener("submit", ejecutarInterpolacion);
  ejecutarInterpolacion();
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", iniciarAplicacion, { once: true });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    INTERVALO_GRAFICA,
    NODOS_INICIALES,
    interpolarLagrange,
    muestrearPolinomio,
    validarNodos
  };
}
