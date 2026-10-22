"use strict";

const motorNewton = typeof module !== "undefined" && module.exports
  ? require("./newton.js")
  : window.NewtonEngine;
const {
  EPSILON_NUMERICO,
  NODOS_INICIALES,
  PUNTO_EVALUACION_INICIAL,
  ValidationError,
  resolverNewton,
  muestrearNewton
} = motorNewton;

const COLORES_GRADOS = ["#5d6872", "#1f7a68", "#9a5f16", "#12304a", "#8c3f65", "#40699c"];

function convertirSubindice(valor) {
  const digitos = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
  return String(valor).split("").map((digito) => digitos[digito]).join("");
}

function convertirSuperindice(valor) {
  const digitos = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  return String(valor).split("").map((digito) => digitos[digito]).join("");
}

function normalizarCero(valor) {
  return Object.is(valor, -0) ? 0 : valor;
}

function formatearDecimal(valor, decimales = 6) {
  const normalizado = normalizarCero(valor);
  if (Number.isInteger(normalizado)) {
    return String(normalizado);
  }
  if (Math.abs(normalizado) < 10 ** -decimales || Math.abs(normalizado) >= 1e12) {
    return normalizado.toExponential(Math.max(6, decimales)).replace(/(\.\d*?[1-9])0+e/, "$1e").replace(/\.0+e/, "e");
  }
  return normalizado.toFixed(decimales).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function aproximarFraccion(valor, maximoDenominador = 1000) {
  const normalizado = normalizarCero(valor);
  if (!Number.isFinite(normalizado)) {
    return null;
  }
  if (Number.isInteger(normalizado)) {
    return { numerador: normalizado, denominador: 1 };
  }

  const signo = normalizado < 0 ? -1 : 1;
  const absoluto = Math.abs(normalizado);
  let mejor = null;
  for (let denominador = 1; denominador <= maximoDenominador; denominador += 1) {
    const numerador = Math.round(absoluto * denominador);
    const error = Math.abs(absoluto - numerador / denominador);
    if (mejor === null || error < mejor.error) {
      mejor = { numerador: signo * numerador, denominador, error };
    }
    if (numerador !== 0 && Number.isSafeInteger(numerador) && error <= 1e-11 * absoluto) {
      break;
    }
  }
  return mejor && mejor.numerador !== 0 && Number.isSafeInteger(mejor.numerador) && mejor.error <= 1e-10 * absoluto ? mejor : null;
}

function formatearExacto(valor) {
  const fraccion = aproximarFraccion(valor);
  if (fraccion && fraccion.denominador !== 1) {
    return `${fraccion.numerador}/${fraccion.denominador}`;
  }
  return formatearDecimal(valor);
}

function formatearExactoConDecimal(valor) {
  const exacto = formatearExacto(valor);
  const decimal = formatearDecimal(valor);
  return exacto === decimal ? exacto : `${exacto} (${decimal})`;
}

function nombrePolinomio(grado) {
  return `P${convertirSubindice(grado)}`;
}

function formatearFactor(nodo) {
  return nodo < 0 ? `(x + ${formatearExacto(Math.abs(nodo))})` : `(x - ${formatearExacto(nodo)})`;
}

function formatearPolinomio(coeficientes, variable = "x") {
  const terminos = [];
  for (let potencia = coeficientes.length - 1; potencia >= 0; potencia -= 1) {
    const coeficiente = normalizarCero(coeficientes[potencia]);
    if (coeficiente === 0) {
      continue;
    }
    const absoluto = Math.abs(coeficiente);
    let cuerpo;
    if (potencia === 0) {
      cuerpo = formatearExacto(absoluto);
    } else {
      const textoCoeficiente = formatearExacto(absoluto);
      const factorCoeficiente = Math.abs(absoluto - 1) <= EPSILON_NUMERICO ? "" : /e/.test(textoCoeficiente) ? `(${textoCoeficiente})` : textoCoeficiente;
      const potenciaTexto = potencia === 1 ? "" : convertirSuperindice(potencia);
      cuerpo = `${factorCoeficiente}${variable}${potenciaTexto}`;
    }
    if (terminos.length === 0) {
      terminos.push(coeficiente < 0 ? `-${cuerpo}` : cuerpo);
    } else {
      terminos.push(`${coeficiente < 0 ? "-" : "+"} ${cuerpo}`);
    }
  }
  return terminos.length ? terminos.join(" ") : "0";
}

function formatearFormaNewton(resultado) {
  const partes = [];
  resultado.coeficientes.forEach((coeficiente, indice) => {
    const factores = resultado.X.slice(0, indice).map(formatearFactor).join("");
    const absoluto = Math.abs(normalizarCero(coeficiente));
    const omitirUnidad = indice > 0 && Math.abs(absoluto - 1) <= EPSILON_NUMERICO;
    const cuerpo = `${omitirUnidad ? "" : formatearExacto(absoluto)}${factores}` || "0";
    if (indice === 0) {
      partes.push(coeficiente < 0 ? `-${cuerpo}` : cuerpo);
    } else {
      partes.push(`${coeficiente < 0 ? "-" : "+"} ${cuerpo}`);
    }
  });
  return `${nombrePolinomio(resultado.grado)}(x) = ${partes.join(" ")}`;
}

function nombreDiferencia(X, inicio, orden) {
  return `f[${X.slice(inicio, inicio + orden + 1).map((x) => formatearDecimal(x)).join(", ")}]`;
}

function calcularRangoGrafico(valores) {
  let minimo = Math.min(...valores);
  let maximo = Math.max(...valores);
  const amplitud = maximo - minimo;
  const margen = amplitud === 0 ? Math.max(1, Math.abs(minimo) * 0.12) : amplitud * 0.12;
  minimo -= margen;
  maximo += margen;
  if (!Number.isFinite(minimo) || !Number.isFinite(maximo) || !Number.isFinite(maximo - minimo) || !(maximo > minimo)) {
    throw new ValidationError("El rango de la gráfica excede la precisión numérica disponible; cambia la escala de los datos.");
  }
  return [minimo, maximo];
}

function formatearEje(valor, amplitud) {
  const absoluto = Math.abs(valor);
  if (absoluto > 0 && (absoluto < 0.001 || absoluto >= 1e7)) {
    const precision = Math.min(15, Math.max(2, Math.ceil(Math.log10(Math.max(1, absoluto / amplitud))) + 2));
    return valor.toExponential(precision).replace(/(\.\d*?)0+e/, "$1e").replace(/\.e/, "e");
  }
  const decimales = Math.min(15, Math.max(0, 2 - Math.floor(Math.log10(amplitud))));
  return formatearDecimal(valor, decimales);
}

function crearAplicacion(document, modo) {
const esOriginal = modo === "original";
const unidad = esOriginal ? " ms" : "";
if (!esOriginal) {
  document.getElementById("data-title").textContent = "Datos del nuevo ejercicio";
  document.querySelector(".input-table thead th:nth-child(2)").textContent = "xᵢ";
  document.querySelector(".input-table thead th:nth-child(3)").textContent = "yᵢ";
  document.querySelectorAll(".result-label")[1].textContent = "Valor interpolado";
}

function crearElementoSvg(nombre, atributos = {}) {
  const elemento = document.createElementNS("http://www.w3.org/2000/svg", nombre);
  Object.entries(atributos).forEach(([atributo, valor]) => elemento.setAttribute(atributo, atributo === "id" ? document.id(valor) : String(valor)));
  return elemento;
}

function crearCelda(fila, texto, clase = "") {
  const celda = document.createElement("td");
  celda.textContent = texto;
  if (clase) {
    celda.className = clase;
  }
  fila.append(celda);
  return celda;
}

function crearFilaNodo(indice, x = "", y = "") {
  const fila = document.createElement("tr");
  fila.className = "node-row";

  const encabezado = document.createElement("th");
  encabezado.scope = "row";
  encabezado.className = "node-label";
  encabezado.textContent = `x${convertirSubindice(indice)}`;
  fila.append(encabezado);

  [["x", x, esOriginal ? "Carga" : "Coordenada x"], ["y", y, esOriginal ? "Latencia" : "Valor y"]].forEach(([variable, valor, descripcion]) => {
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

  const accion = document.createElement("td");
  const eliminar = document.createElement("button");
  eliminar.type = "button";
  eliminar.className = "remove-node-button";
  eliminar.textContent = "Eliminar";
  eliminar.setAttribute("aria-label", `Eliminar nodo ${indice}`);
  accion.append(eliminar);
  fila.append(accion);
  return fila;
}

function reindexarFilas() {
  const filas = Array.from(document.querySelectorAll("#nodes-body .node-row"));
  filas.forEach((fila, indice) => {
    fila.querySelector(".node-label").textContent = `x${convertirSubindice(indice)}`;
    [["x", esOriginal ? "Carga" : "Coordenada x"], ["y", esOriginal ? "Latencia" : "Valor y"]].forEach(([variable, descripcion]) => {
      const entrada = fila.querySelector(`.node-${variable}`);
      const etiqueta = entrada.previousElementSibling;
      entrada.id = document.id(`${variable}-${indice}`);
      etiqueta.htmlFor = entrada.id;
      etiqueta.textContent = `${descripcion} del nodo ${indice}`;
    });
    fila.querySelector(".remove-node-button").setAttribute("aria-label", `Eliminar nodo ${indice}`);
  });
  const deshabilitar = filas.length === 1;
  filas.forEach((fila) => {
    fila.querySelector(".remove-node-button").disabled = deshabilitar;
  });
  document.getElementById("node-count").textContent = `${filas.length} punto${filas.length === 1 ? "" : "s"} disponible${filas.length === 1 ? "" : "s"}`;
  return filas.length;
}

function actualizarSelectorGrado(preferirMaximo = false) {
  const selector = document.getElementById("degree-select");
  const cantidad = document.querySelectorAll("#nodes-body .node-row").length;
  const anterior = Number(selector.value);
  selector.replaceChildren();
  for (let grado = 0; grado < cantidad; grado += 1) {
    const opcion = document.createElement("option");
    opcion.value = String(grado);
    opcion.textContent = `Grado ${grado} (${grado + 1} nodo${grado === 0 ? "" : "s"})`;
    selector.append(opcion);
  }
  selector.value = String(preferirMaximo || !Number.isInteger(anterior) ? cantidad - 1 : Math.min(anterior, cantidad - 1));
}

function agregarFilaNodo(x = "", y = "", preferirMaximo = true) {
  const cuerpo = document.getElementById("nodes-body");
  const fila = crearFilaNodo(cuerpo.children.length, x, y);
  cuerpo.append(fila);
  reindexarFilas();
  actualizarSelectorGrado(preferirMaximo);
  return fila.querySelector(".node-x");
}

function leerFormulario() {
  if (esOriginal) return {
    X: NODOS_INICIALES.map(({ x }) => x), Y: NODOS_INICIALES.map(({ y }) => y),
    xEvaluar: PUNTO_EVALUACION_INICIAL, grado: NODOS_INICIALES.length - 1
  };
  const filas = Array.from(document.querySelectorAll("#nodes-body .node-row"));
  const campos = filas.flatMap((fila) => [fila.querySelector(".node-x"), fila.querySelector(".node-y")]);
  const campoEvaluacion = document.getElementById("x-eval");
  campos.push(campoEvaluacion);
  if (campos.some((campo) => campo.value.trim() === "")) {
    throw new ValidationError("Completa todos los valores X, Y y el punto a evaluar.");
  }
  return {
    X: filas.map((fila) => Number(fila.querySelector(".node-x").value)),
    Y: filas.map((fila) => Number(fila.querySelector(".node-y").value)),
    xEvaluar: Number(campoEvaluacion.value),
    grado: Number(document.getElementById("degree-select").value)
  };
}

function actualizarEstado(mensaje, tipo) {
  const estado = document.getElementById("calculation-status");
  estado.className = `status-message status-${tipo}`;
  estado.textContent = mensaje;
}

function ocultarResultados() {
  document.getElementById("calculation-output").hidden = true;
  const descripcion = crearElementoSvg("desc", { id: "chart-description" });
  descripcion.textContent = "Sin cálculo vigente.";
  document.getElementById("newton-chart").replaceChildren(descripcion);
}

function mostrarResumen(resultado, xEvaluar) {
  document.getElementById("evaluation-label").textContent = `${nombrePolinomio(resultado.grado)}(${formatearDecimal(xEvaluar, 4)})`;
  document.getElementById("interpolated-value").textContent = formatearDecimal(resultado.valor, 6);
  document.getElementById("calculation-kind").textContent = resultado.clasificacion;
  const usados = resultado.X.map((x) => formatearDecimal(x)).join(", ");
  document.getElementById("selection-criterion").textContent =
    `Grado ${resultado.grado}: nodos ordenados utilizados X = [${usados}].`;

  const advertencias = document.getElementById("warning-list");
  advertencias.replaceChildren();
  advertencias.hidden = resultado.advertencias.length === 0;
  resultado.advertencias.forEach((mensaje) => {
    const parrafo = document.createElement("p");
    parrafo.textContent = `Advertencia: ${mensaje}`;
    advertencias.append(parrafo);
  });
}

function mostrarDiferencias(resultado) {
  const tabla = document.getElementById("differences-table");
  const encabezado = document.createElement("thead");
  const filaEncabezado = document.createElement("tr");
  ["X", "f[X]", ...Array.from({ length: resultado.grado }, (_, indice) => `Orden ${indice + 1}`)].forEach((texto) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = texto;
    filaEncabezado.append(th);
  });
  encabezado.append(filaEncabezado);

  const cuerpo = document.createElement("tbody");
  resultado.X.forEach((x, filaIndice) => {
    const fila = document.createElement("tr");
    crearCelda(fila, formatearDecimal(x));
    for (let orden = 0; orden <= resultado.grado; orden += 1) {
      const valor = resultado.tabla[filaIndice][orden];
      crearCelda(
        fila,
        valor === null ? "—" : formatearExactoConDecimal(valor),
        valor === null ? "empty-cell" : filaIndice === 0 ? "coefficient-cell" : ""
      );
    }
    cuerpo.append(fila);
  });
  tabla.replaceChildren(encabezado, cuerpo);

  const tira = document.getElementById("coefficient-strip");
  tira.replaceChildren();
  resultado.coeficientes.forEach((coeficiente, indice) => {
    const elemento = document.createElement("span");
    elemento.textContent = `a${convertirSubindice(indice)} = ${formatearExactoConDecimal(coeficiente)}`;
    tira.append(elemento);
  });

  const pasos = document.getElementById("differences-steps");
  pasos.replaceChildren();
  resultado.pasosDiferencias.forEach((paso) => {
    const item = document.createElement("li");
    const actual = nombreDiferencia(resultado.X, paso.fila, paso.orden);
    const superior = nombreDiferencia(resultado.X, paso.fila + 1, paso.orden - 1);
    const inferior = nombreDiferencia(resultado.X, paso.fila, paso.orden - 1);
    item.textContent = `${actual} = (${superior} - ${inferior}) / (${formatearDecimal(paso.extremoDerecho)} - ${formatearDecimal(paso.extremoIzquierdo)}) = (${formatearExacto(paso.superior)} - ${formatearExacto(paso.inferior)}) / ${formatearExacto(paso.denominador)} = ${formatearExactoConDecimal(paso.valor)}`;
    pasos.append(item);
  });
}

function sumaFirmada(valores) {
  const noCero = valores.map(normalizarCero).filter((valor) => valor !== 0);
  if (!noCero.length) {
    return "0";
  }
  return noCero.map((valor, indice) => {
    const cuerpo = formatearExacto(Math.abs(valor));
    if (indice === 0) {
      return valor < 0 ? `-${cuerpo}` : cuerpo;
    }
    return `${valor < 0 ? "-" : "+"} ${cuerpo}`;
  }).join(" ");
}

function mostrarPolinomio(resultado) {
  const nombre = nombrePolinomio(resultado.grado);
  document.getElementById("general-formula").textContent =
    `${nombre}(x) = Σ(k = 0, …, ${resultado.grado}) aₖ ∏(j = 0, …, k - 1)(x - xⱼ), con producto vacío = 1`;
  const coeficientes = resultado.coeficientes.map((valor, indice) => `a${convertirSubindice(indice)} = ${formatearExacto(valor)}`).join("; ");
  const nodos = resultado.X.map((valor, indice) => `x${convertirSubindice(indice)} = ${formatearDecimal(valor)}`).join("; ");
  document.getElementById("substituted-formula").textContent = `${coeficientes}; ${nodos}`;
  document.getElementById("newton-formula").textContent = formatearFormaNewton(resultado);

  const cuerpo = document.getElementById("development-body");
  cuerpo.replaceChildren();
  resultado.desarrollos.forEach((desarrollo) => {
    const fila = document.createElement("tr");
    const factores = desarrollo.nodosFactor.map(formatearFactor).join("");
    crearCelda(fila, `T${convertirSubindice(desarrollo.indice)}`);
    crearCelda(fila, `${formatearExacto(desarrollo.coeficiente)}${factores}`);
    crearCelda(fila, formatearPolinomio(desarrollo.termino));
    cuerpo.append(fila);
  });

  const agrupaciones = [];
  for (let potencia = resultado.grado; potencia >= 0; potencia -= 1) {
    const aportes = resultado.desarrollos
      .map(({ termino }) => termino[potencia] || 0)
      .filter((valor) => valor !== 0);
    const variable = potencia === 0 ? "constante" : potencia === 1 ? "x" : `x${convertirSuperindice(potencia)}`;
    agrupaciones.push(`${variable}: ${sumaFirmada(aportes)} = ${formatearExacto(resultado.coeficientesEstandar[potencia])}`);
  }
  document.getElementById("power-grouping").textContent = agrupaciones.join("; ");
  document.getElementById("standard-polynomial").textContent = `${nombre}(x) = ${formatearPolinomio(resultado.coeficientesEstandar)}`;
}

function mostrarEvaluacion(resultado, xEvaluar) {
  const partes = [];
  for (let indice = 0; indice < resultado.grado; indice += 1) {
    partes.push(`${formatearExacto(resultado.coeficientes[indice])} + (${formatearDecimal(xEvaluar)} - ${formatearDecimal(resultado.X[indice])})[`);
  }
  partes.push(formatearExacto(resultado.coeficientes.at(-1)));
  partes.push("]".repeat(resultado.grado));
  document.getElementById("nested-formula").textContent = `${nombrePolinomio(resultado.grado)}(${formatearDecimal(xEvaluar)}) = ${partes.join("")}`;

  const lista = document.getElementById("evaluation-steps");
  lista.replaceChildren();
  resultado.pasosEvaluacion.forEach((paso) => {
    const item = document.createElement("li");
    item.textContent = paso.inicial
      ? `b${convertirSubindice(paso.indice)} = a${convertirSubindice(paso.indice)} = ${formatearExactoConDecimal(paso.resultado)}`
      : `b${convertirSubindice(paso.indice)} = a${convertirSubindice(paso.indice)} + (${formatearDecimal(xEvaluar)} - ${formatearDecimal(paso.nodo)})b${convertirSubindice(paso.indice + 1)} = ${formatearExacto(paso.coeficiente)} + ${formatearExacto(paso.factor)}(${formatearExacto(paso.anterior)}) = ${formatearExactoConDecimal(paso.resultado)}`;
    lista.append(item);
  });
  document.getElementById("evaluation-result").textContent =
    `${nombrePolinomio(resultado.grado)}(${formatearDecimal(xEvaluar)}) = ${formatearExactoConDecimal(resultado.valor)}${unidad}`;
}

function mostrarValidacion(resultado) {
  const sustituciones = document.getElementById("validation-steps");
  sustituciones.replaceChildren();
  resultado.validaciones.forEach((validacion) => {
    const partes = [];
    for (let indice = 0; indice < resultado.grado; indice += 1) {
      partes.push(`${formatearExacto(resultado.coeficientes[indice])} + (${formatearDecimal(validacion.x)} - ${formatearDecimal(resultado.X[indice])})[`);
    }
    partes.push(formatearExacto(resultado.coeficientes.at(-1)));
    partes.push("]".repeat(resultado.grado));
    const item = document.createElement("li");
    item.textContent = `${nombrePolinomio(resultado.grado)}(${formatearDecimal(validacion.x)}) = ${partes.join("")} = ${formatearExactoConDecimal(validacion.calculado)}; valor original = ${formatearExactoConDecimal(validacion.esperado)}.`;
    sustituciones.append(item);
  });

  const cuerpo = document.getElementById("validation-body");
  cuerpo.replaceChildren();
  resultado.validaciones.forEach((validacion) => {
    const fila = document.createElement("tr");
    crearCelda(fila, formatearDecimal(validacion.x));
    crearCelda(fila, formatearDecimal(validacion.esperado));
    crearCelda(fila, formatearDecimal(validacion.calculado, 9));
    crearCelda(fila, validacion.diferencia === 0 ? "0" : validacion.diferencia.toExponential(3));
    crearCelda(fila, validacion.valido ? "Coincide" : "No coincide", validacion.valido ? "validation-ok" : "validation-fail");
    cuerpo.append(fila);
  });
  const todasValidas = resultado.validaciones.every(({ valido }) => valido);
  const estado = document.getElementById("validation-status");
  estado.className = `status-message ${todasValidas ? "status-success" : "status-error"}`;
  estado.textContent = todasValidas
    ? `Validación correcta: ${resultado.validaciones.length} de ${resultado.validaciones.length} nodos reproducidos dentro de la tolerancia.`
    : "La validación detectó diferencias superiores a la tolerancia numérica.";
}

function mostrarComparacion(resultados, gradoSeleccionado, xEvaluar) {
  const cuerpo = document.getElementById("comparison-body");
  cuerpo.replaceChildren();
  resultados.forEach((resultado) => {
    const fila = document.createElement("tr");
    if (resultado.grado === gradoSeleccionado) {
      fila.className = "is-selected";
    }
    crearCelda(fila, String(resultado.grado));
    if (resultado.error) {
      const celda = crearCelda(fila, resultado.error, "validation-fail");
      celda.colSpan = 3;
      cuerpo.append(fila);
      return;
    }
    crearCelda(fila, resultado.X.map((x) => `(${formatearDecimal(x)}, ${formatearDecimal(resultado.Y[resultado.X.indexOf(x)])})`).join(", "));
    crearCelda(fila, formatearPolinomio(resultado.coeficientesEstandar));
    crearCelda(fila, `${nombrePolinomio(resultado.grado)}(${formatearDecimal(xEvaluar)}) = ${formatearDecimal(resultado.valor, 6)}${unidad}`);
    cuerpo.append(fila);
  });
}

function dibujarGrafica(resultadoSeleccionado, resultados, nodosEntrada, xEvaluar, superponer) {
  const svg = document.getElementById("newton-chart");
  const [xMin, xMax] = calcularRangoGrafico([...nodosEntrada.map(({ x }) => x), xEvaluar]);
  const curvas = superponer ? resultados.filter((resultado) => !resultado.error) : [resultadoSeleccionado];
  const muestrasPorCurva = curvas.map((resultado) => ({
    resultado,
    muestras: muestrearNewton(resultado.coeficientes, resultado.X, xMin, xMax)
  }));
  const valoresY = [
    ...nodosEntrada.map(({ y }) => y),
    resultadoSeleccionado.valor,
    ...muestrasPorCurva.flatMap(({ muestras }) => muestras.map(({ y }) => y))
  ];
  if (valoresY.some((valor) => !Number.isFinite(valor))) {
    throw new ValidationError("La gráfica encontró valores no finitos en el intervalo seleccionado.");
  }
  const [yMin, yMax] = calcularRangoGrafico(valoresY);

  const movil = window.matchMedia("(max-width: 720px)").matches;
  const ejeYCientifico = [yMin, yMax].some((y) => Math.abs(y) > 0 && (Math.abs(y) < 0.001 || Math.abs(y) >= 1e7));
  const ancho = movil ? 380 : 960;
  const alto = movil ? 420 : 540;
  const margen = movil
    ? { izquierda: ejeYCientifico ? 100 : 64, derecha: 18, superior: 28, inferior: 64 }
    : { izquierda: ejeYCientifico ? 132 : 92, derecha: 34, superior: 32, inferior: 76 };
  svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
  svg.style.aspectRatio = `${ancho} / ${alto}`;
  const anchoUtil = ancho - margen.izquierda - margen.derecha;
  const altoUtil = alto - margen.superior - margen.inferior;
  const mapearX = (x) => margen.izquierda + ((x - xMin) / (xMax - xMin)) * anchoUtil;
  const mapearY = (y) => margen.superior + ((yMax - y) / (yMax - yMin)) * altoUtil;

  svg.replaceChildren();
  const descripcion = crearElementoSvg("desc", { id: "chart-description" });
  descripcion.textContent = `Polinomio de Newton de grado ${resultadoSeleccionado.grado}, nodos experimentales y punto evaluado.`;
  svg.append(descripcion);
  svg.append(crearElementoSvg("rect", { x: margen.izquierda, y: margen.superior, width: anchoUtil, height: altoUtil, fill: "#ffffff" }));

  for (let indice = 0; indice <= 5; indice += 1) {
    const y = yMin + ((yMax - yMin) * indice) / 5;
    const posicionY = mapearY(y);
    svg.append(crearElementoSvg("line", { x1: margen.izquierda, y1: posicionY, x2: ancho - margen.derecha, y2: posicionY, stroke: "#dfe5e9", "stroke-width": 1 }));
    const etiqueta = crearElementoSvg("text", { x: margen.izquierda - 8, y: posicionY + 5, fill: "#5c6874", "font-size": movil ? 12 : 14, "text-anchor": "end" });
    etiqueta.textContent = formatearEje(y, yMax - yMin);
    svg.append(etiqueta);
  }
  const divisionesX = movil ? 3 : 6;
  for (let indice = 0; indice <= divisionesX; indice += 1) {
    const x = xMin + ((xMax - xMin) * indice) / divisionesX;
    const posicionX = mapearX(x);
    svg.append(crearElementoSvg("line", { x1: posicionX, y1: margen.superior, x2: posicionX, y2: alto - margen.inferior, stroke: "#edf0f2", "stroke-width": 1 }));
    const etiqueta = crearElementoSvg("text", { x: posicionX, y: alto - margen.inferior + 25, fill: "#5c6874", "font-size": movil ? 12 : 14, "text-anchor": "middle" });
    etiqueta.textContent = formatearEje(x, xMax - xMin);
    svg.append(etiqueta);
  }

  svg.append(crearElementoSvg("line", { x1: margen.izquierda, y1: alto - margen.inferior, x2: ancho - margen.derecha, y2: alto - margen.inferior, stroke: "#0a2236", "stroke-width": 2 }));
  svg.append(crearElementoSvg("line", { x1: margen.izquierda, y1: margen.superior, x2: margen.izquierda, y2: alto - margen.inferior, stroke: "#0a2236", "stroke-width": 2 }));

  muestrasPorCurva.forEach(({ resultado, muestras }) => {
    const ruta = muestras.map(({ x, y }, indice) => `${indice === 0 ? "M" : "L"} ${mapearX(x).toFixed(2)} ${mapearY(y).toFixed(2)}`).join(" ");
    svg.append(crearElementoSvg("path", {
      class: `newton-curve degree-${resultado.grado}`,
      "data-degree": resultado.grado,
      d: ruta,
      fill: "none",
      stroke: COLORES_GRADOS[resultado.grado % COLORES_GRADOS.length],
      "stroke-width": resultado.grado === resultadoSeleccionado.grado ? 4 : 2.2,
      "stroke-dasharray": resultado.grado === resultadoSeleccionado.grado ? "" : "8 5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    }));
  });

  const xsUsados = new Set(resultadoSeleccionado.X.map(String));
  nodosEntrada.forEach(({ x, y }) => {
    const usado = xsUsados.has(String(x));
    svg.append(crearElementoSvg("circle", {
      class: usado ? "experimental-node used-node" : "experimental-node unused-node",
      "data-x": x,
      "data-y": y,
      cx: mapearX(x),
      cy: mapearY(y),
      r: usado ? 7 : 6,
      fill: usado ? "#a44236" : "#ffffff",
      stroke: usado ? "#ffffff" : "#87939d",
      "stroke-width": usado ? 3 : 2.5
    }));
  });

  const puntoX = mapearX(xEvaluar);
  const puntoY = mapearY(resultadoSeleccionado.valor);
  svg.append(crearElementoSvg("line", { x1: puntoX, y1: puntoY, x2: puntoX, y2: alto - margen.inferior, stroke: "#e0ad2f", "stroke-width": 2, "stroke-dasharray": "7 6" }));
  svg.append(crearElementoSvg("circle", { class: "interpolated-point", "data-x": xEvaluar, "data-y": resultadoSeleccionado.valor, cx: puntoX, cy: puntoY, r: 10, fill: "#e0ad2f", stroke: "#0a2236", "stroke-width": 4 }));
  const etiquetaPunto = crearElementoSvg("text", { x: Math.min(puntoX + 14, ancho - 180), y: Math.max(puntoY - 15, margen.superior + 18), fill: "#0a2236", "font-size": 15, "font-weight": 700 });
  etiquetaPunto.textContent = `(${formatearDecimal(xEvaluar, 3)}, ${formatearDecimal(resultadoSeleccionado.valor, 3)})`;
  svg.append(etiquetaPunto);

  const etiquetaX = crearElementoSvg("text", { x: margen.izquierda + anchoUtil / 2, y: alto - 18, fill: "#17212b", "font-size": movil ? 13 : 16, "font-weight": 700, "text-anchor": "middle" });
  etiquetaX.textContent = esOriginal ? "Carga de peticiones (100 req/s)" : "Coordenada x";
  svg.append(etiquetaX);
  const etiquetaY = crearElementoSvg("text", { x: movil ? 17 : 23, y: margen.superior + altoUtil / 2, fill: "#17212b", "font-size": movil ? 13 : 16, "font-weight": 700, "text-anchor": "middle", transform: `rotate(-90 ${movil ? 17 : 23} ${margen.superior + altoUtil / 2})` });
  etiquetaY.textContent = esOriginal ? "Latencia de respuesta (ms)" : "P(x)";
  svg.append(etiquetaY);

  const leyenda = document.getElementById("chart-legend");
  leyenda.replaceChildren();
  curvas.forEach((resultado) => {
    const item = document.createElement("span");
    const muestra = document.createElement("i");
    muestra.className = "legend-line";
    muestra.style.setProperty("--legend-color", COLORES_GRADOS[resultado.grado % COLORES_GRADOS.length]);
    item.append(muestra, document.createTextNode(`${nombrePolinomio(resultado.grado)}(x)`));
    leyenda.append(item);
  });
  [["legend-node", "Nodos utilizados"], ["legend-unused", "Nodos no utilizados"], ["legend-evaluation", "Punto evaluado"]].forEach(([clase, texto]) => {
    const item = document.createElement("span");
    const muestra = document.createElement("i");
    muestra.className = clase;
    item.append(muestra, document.createTextNode(texto));
    leyenda.append(item);
  });

  document.getElementById("chart-description-text").textContent =
    `${nombrePolinomio(resultadoSeleccionado.grado)}(x), rango automático y coordenadas numéricas reales.`;
  document.getElementById("chart-note").textContent =
    `${resultadoSeleccionado.clasificacion === "interpolación" ? "Interpolación" : "Extrapolación"}: (${formatearDecimal(xEvaluar, 3)}, ${formatearDecimal(resultadoSeleccionado.valor, 3)}${unidad}).`;
}

function ejecutarInterpolacion(evento) {
  evento?.preventDefault();
  try {
    const { X, Y, xEvaluar, grado } = leerFormulario();
    const resultado = resolverNewton(X, Y, xEvaluar, grado);
    const resultados = Array.from({ length: X.length }, (_, indice) => {
      if (indice === grado) return resultado;
      try {
        return resolverNewton(X, Y, xEvaluar, indice);
      } catch (error) {
        if (!(error instanceof ValidationError)) throw error;
        return { grado: indice, error: error.message };
      }
    });
    if (resultados.some((parcial) => parcial.error)) {
      resultado.advertencias.push("Algunos grados no pudieron calcularse con precisión finita; consulta la comparación de grados.");
    }
    const nodosEntrada = X.map((x, indice) => ({ x, y: Y[indice] }));

    mostrarResumen(resultado, xEvaluar);
    mostrarDiferencias(resultado);
    mostrarPolinomio(resultado);
    mostrarEvaluacion(resultado, xEvaluar);
    mostrarValidacion(resultado);
    mostrarComparacion(resultados, grado, xEvaluar);
    dibujarGrafica(resultado, resultados, nodosEntrada, xEvaluar, document.getElementById("overlay-degrees").checked);
    document.getElementById("calculation-output").hidden = false;
    actualizarEstado(`Cálculo completado: ${nombrePolinomio(grado)}(${formatearDecimal(xEvaluar)}) = ${formatearDecimal(resultado.valor, 6)}${unidad}.`, "success");
  } catch (error) {
    ocultarResultados();
    if (!(error instanceof ValidationError)) {
      console.error(error);
    }
    actualizarEstado(error.message, "error");
  }
}

function marcarDatosPendientes(evento) {
  if (!evento.target.matches(document.selector(".node-x, .node-y, #x-eval"))) {
    return;
  }
  if (!document.getElementById("calculation-output").hidden) {
    ocultarResultados();
    actualizarEstado("Datos modificados. Recalcula para obtener resultados y gráfica actualizados.", "info");
  }
}

function cargarDatosIniciales() {
  document.getElementById("nodes-body").replaceChildren();
  NODOS_INICIALES.forEach(({ x, y }, indice) => agregarFilaNodo(x, y, indice === NODOS_INICIALES.length - 1));
  document.getElementById("x-eval").value = String(PUNTO_EVALUACION_INICIAL);
  document.getElementById("degree-select").value = String(NODOS_INICIALES.length - 1);
  document.getElementById("overlay-degrees").checked = false;
}

function iniciarAplicacion() {
  cargarDatosIniciales();
  ocultarResultados();
  const formulario = document.getElementById("newton-form");
  formulario.addEventListener("submit", ejecutarInterpolacion);
  formulario.addEventListener("input", marcarDatosPendientes);

  document.getElementById("add-node-button").addEventListener("click", () => {
    if (esOriginal) return;
    const entrada = agregarFilaNodo();
    ocultarResultados();
    actualizarEstado("Nuevo punto agregado. Completa X e Y antes de calcular.", "info");
    entrada.focus();
  });

  document.getElementById("nodes-body").addEventListener("click", (evento) => {
    const boton = evento.target.closest(".remove-node-button");
    if (esOriginal || !boton || boton.disabled) {
      return;
    }
    boton.closest("tr").remove();
    reindexarFilas();
    actualizarSelectorGrado(false);
    ocultarResultados();
    actualizarEstado("Punto eliminado. Recalcula con el conjunto actualizado.", "info");
  });

  document.getElementById("restore-button").addEventListener("click", () => {
    cargarDatosIniciales();
    ocultarResultados();
    actualizarEstado("Datos originales restaurados. Listo para calcular.", "info");
  });
  document.getElementById("clear-button").addEventListener("click", () => {
    if (!esOriginal) formulario.querySelectorAll('input[type="number"]').forEach((campo) => { campo.value = ""; });
    ocultarResultados();
    actualizarEstado(esOriginal ? "Resultados borrados. Los nodos originales se conservan." : "Campos vacíos. Introduce los nodos y el punto a evaluar.", "info");
  });

  document.getElementById("degree-select").addEventListener("change", () => {
    if (!document.getElementById("calculation-output").hidden) {
      ejecutarInterpolacion();
    }
  });
  document.getElementById("overlay-degrees").addEventListener("change", () => {
    if (!document.getElementById("calculation-output").hidden) {
      ejecutarInterpolacion();
    }
  });
  window.matchMedia("(max-width: 720px)").addEventListener("change", () => {
    if (!document.getElementById("calculation-output").hidden) {
      ejecutarInterpolacion();
    }
  });
}

iniciarAplicacion();
if (!esOriginal) document.getElementById("clear-button").click();
return { activar() { if (esOriginal) { cargarDatosIniciales(); ocultarResultados(); actualizarEstado("Datos originales listos para calcular.", "info"); } } };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => window.ExercisePanels.montar(crearAplicacion), { once: true });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = motorNewton;
}
