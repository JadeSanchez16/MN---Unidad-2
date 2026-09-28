"use strict";

const assert = require("node:assert/strict");

const lu = require("../factorizacion-lu/js/app.js");
const jacobi = require("../jacobi/js/app.js");

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

probarLU();
probarJacobi();
console.log("PASS - regresión de factorización LU");
console.log("PASS - convergencia y resultados del método de Jacobi");
