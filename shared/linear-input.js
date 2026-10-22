(function (global) {
  "use strict";

  function numero(texto, nombre) {
    const valor = String(texto).trim().replace(/−/g, "-");
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(valor) || !Number.isFinite(Number(valor))) {
      throw new TypeError(`${nombre} debe contener un número finito; usa punto decimal.`);
    }
    return Number(valor);
  }

  function vector(texto, nombre = "El vector") {
    if (!texto.trim()) throw new TypeError(`${nombre} no puede estar vacío.`);
    return texto.trim().split(/\s+/).map((valor, i) => numero(valor, `${nombre}, elemento ${i + 1}`));
  }

  function matriz(texto) {
    if (!texto.trim()) throw new TypeError("La matriz A no puede estar vacía.");
    const filas = texto.trim().split(/\r?\n/).map((fila, i) => vector(fila, `La fila ${i + 1}`));
    if (filas.some((fila) => fila.length !== filas.length)) {
      throw new TypeError(`A debe ser cuadrada: ${filas.length} filas y ${filas.length} columnas.`);
    }
    return filas;
  }

  function textoMatriz(datos) {
    return datos.map((fila) => fila.join(" ")).join("\n");
  }

  function ecuaciones(A, b, formato = String) {
    return A.map((fila, i) => {
      const terminos = [];
      fila.forEach((coeficiente, j) => {
        if (coeficiente === 0) return;
        const termino = `${Math.abs(coeficiente) === 1 ? "" : formato(Math.abs(coeficiente))}x${j + 1}`;
        terminos.push(`${terminos.length ? (coeficiente < 0 ? " - " : " + ") : (coeficiente < 0 ? "-" : "")}${termino}`);
      });
      return `${terminos.join("") || "0"} = ${formato(b[i])}`;
    });
  }

  const api = Object.freeze({ numero, vector, matriz, textoMatriz, ecuaciones });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global) global.LinearInput = api;
})(typeof window !== "undefined" ? window : null);
