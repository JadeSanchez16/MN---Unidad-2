"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const lu = require("../factorizacion-lu/js/app.js");
const jacobi = require("../jacobi/js/app.js");
const lagrange = require("../interpolacion-lagrange/js/app.js");

function probarLU() {
  const { L, U } = lu.factorizarDoolittle(lu.A);
  const producto = lu.multiplicarMatrices(L, U);
  assert.equal(lu.matricesAproximadamenteIguales(producto, lu.A), true);

  const escenario1 = lu.resolverConFactores(lu.A, L, U, lu.B1);
  const escenario2 = lu.resolverConFactores(lu.A, L, U, lu.B2);
  assert.equal(escenario1.verificado, true);
  assert.equal(escenario2.verificado, true);
  assert.equal(lu.vectoresAproximadamenteIguales(escenario1.x, [3, -6, 14]), true);
}

function probarJacobi() {
  const dominancia = jacobi.analizarDominanciaDiagonal(jacobi.A_JACOBI);
  assert.equal(dominancia.esEstrictamenteDominante, true);
  assert.deepEqual(
    dominancia.filas.map(({ diagonal, sumaNoDiagonal }) => [diagonal, sumaNoDiagonal]),
    [[10, 3], [8, 3], [12, 5], [9, 3]]
  );
  assert.deepEqual(
    dominancia.filas.map(({ terminosNoDiagonales }) => terminosNoDiagonales),
    [[2, 1, 0], [1, 0, 2], [2, 0, 3], [0, 1, 2]]
  );

  const primera = jacobi.iterarJacobi(
    jacobi.A_JACOBI,
    jacobi.B_JACOBI,
    jacobi.X_INICIAL
  );
  const primeraEsperada = [1.5, 2.25, 25 / 12, 20 / 9];
  primera.forEach((valor, indice) => {
    assert.ok(Math.abs(valor - primeraEsperada[indice]) < 1e-12);
  });

  // La segunda iteración detecta si se reutilizaran valores nuevos como en Gauss-Seidel.
  const segunda = jacobi.iterarJacobi(jacobi.A_JACOBI, jacobi.B_JACOBI, primera);
  const segundaEsperada = [2.158333333333333, 2.9930555555555554, 2.888888888888889, 2.935185185185185];
  segunda.forEach((valor, indice) => {
    assert.ok(Math.abs(valor - segundaEsperada[indice]) < 1e-12);
  });

  const resultado = jacobi.resolverJacobi(
    jacobi.A_JACOBI,
    jacobi.B_JACOBI,
    jacobi.X_INICIAL,
    jacobi.TOLERANCIA_JACOBI
  );

  assert.equal(resultado.convergio, true);
  assert.equal(resultado.iteraciones, 10);
  assert.ok(resultado.historial[8].error > jacobi.TOLERANCIA_JACOBI);
  assert.ok(resultado.errorFinal <= jacobi.TOLERANCIA_JACOBI);

  const solucionEsperada = [
    2.5136015454,
    3.3995211470,
    3.3375808494,
    3.3415617035
  ];
  resultado.solucion.forEach((valor, indice) => {
    assert.ok(Math.abs(valor - solucionEsperada[indice]) < 1e-10);
  });

  const residuo = jacobi.calcularResiduo(
    jacobi.A_JACOBI,
    resultado.solucion,
    jacobi.B_JACOBI
  );
  assert.ok(jacobi.normaInfinito(residuo) < 1e-3);
}

function probarLagrange() {
  const resultado = lagrange.interpolarLagrange(lagrange.NODOS_INICIALES, 6);
  assert.ok(Math.abs(resultado.valor - 55.25) < 1e-12);

  const basesEsperadas = [-0.2, 0.75, 0.5, -0.05];
  resultado.bases.forEach((base, indice) => {
    assert.ok(Math.abs(base - basesEsperadas[indice]) < 1e-12);
  });

  lagrange.NODOS_INICIALES.forEach((nodo) => {
    const evaluacion = lagrange.interpolarLagrange(lagrange.NODOS_INICIALES, nodo.x);
    assert.ok(Math.abs(evaluacion.valor - nodo.y) < 1e-12);
  });

  const nodosCuadraticos = [
    { x: 0, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 5 },
    { x: 3, y: 10 }
  ];
  const dinamico = lagrange.interpolarLagrange(nodosCuadraticos, 1.5);
  assert.ok(Math.abs(dinamico.valor - 3.25) < 1e-12);

  assert.throws(
    () => lagrange.interpolarLagrange([
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 4, y: 3 },
      { x: 6, y: 4 }
    ], 3),
    /valores de x deben ser distintos/
  );

  const muestras = lagrange.muestrearPolinomio(lagrange.NODOS_INICIALES);
  assert.equal(muestras.length, 241);
  assert.equal(muestras[0].x, 2);
  assert.equal(muestras.at(-1).x, 12);

  const coeficientes = [261, -1651 / 24, 227 / 32, -43 / 192];
  const evaluarFormaEstandar = (x) => coeficientes.reduceRight(
    (acumulado, coeficiente) => acumulado * x + coeficiente,
    0
  );
  lagrange.NODOS_INICIALES.forEach((nodo) => {
    assert.ok(Math.abs(evaluarFormaEstandar(nodo.x) - nodo.y) < 1e-10);
  });
  assert.ok(Math.abs(evaluarFormaEstandar(6) - 55.25) < 1e-10);

  const rutaHtml = path.join(__dirname, "..", "interpolacion-lagrange", "html", "index.html");
  const html = fs.readFileSync(rutaHtml, "utf8");
  [
    "Polinomios base de Lagrange",
    "L<sub>0</sub>(x)",
    "L<sub>1</sub>(x)",
    "L<sub>2</sub>(x)",
    "L<sub>3</sub>(x)",
    "-43x<sup>3</sup>/192 + 227x<sup>2</sup>/32 - 1651x/24 + 261",
    "P<sub>3</sub>(6) = 55.25 ms",
    "Aplicativo de software"
  ].forEach((contenidoRequerido) => assert.ok(html.includes(contenidoRequerido)));
}

probarLU();
probarJacobi();
probarLagrange();
console.log("PASS - regresión de factorización LU");
console.log("PASS - convergencia y resultados del método de Jacobi");
console.log("PASS - interpolación de Lagrange y datos dinámicos");
