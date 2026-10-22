"use strict";

const assert = require("node:assert/strict");
const entrada = require("../shared/linear-input.js");
const lu = require("../factorizacion-lu/js/app.js");
const jacobi = require("../jacobi/js/app.js");
const lagrange = require("../interpolacion-lagrange/js/lagrange.js");
const newton = require("../interpolacion-newton/js/newton.js");

function cerca(actual, esperado, tolerancia = 1e-8) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - esperado) <= tolerancia * Math.max(1, Math.abs(esperado)), `${actual} != ${esperado}`);
}

module.exports = function probarSolucionadoresGenerales() {
  assert.deepEqual(entrada.matriz("2 .5\n-1 3e1"), [[2, 0.5], [-1, 30]]);
  assert.deepEqual(entrada.vector("−2  .25\n1e-3"), [-2, 0.25, 0.001]);
  assert.deepEqual(entrada.matriz(entrada.textoMatriz(lu.A)), lu.A);
  ["", "1 2\n3", "1 2\n\n3 4", "1 foo\n3 4"].forEach((texto) => assert.throws(() => entrada.matriz(texto), TypeError));
  ["", "NaN", "Infinity", "2,5", "0x10", "1e309"].forEach((texto) => assert.throws(() => entrada.numero(texto, "Dato"), TypeError));
  assert.deepEqual(entrada.ecuaciones([[2, -1], [0, 1]], [3, 4]), ["2x1 - x2 = 3", "x2 = 4"]);
  assert.equal(lu.formatearNumero(1e9 + 0.25), "1000000000.25");
  assert.equal(Number(lu.formatearNumero(1e-20)), 1e-20);

  for (const n of [1, 2, 4, 5]) {
    const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 2 * n + 1 : (i + j) % 2 ? -0.5 : 0.25));
    const x = Array.from({ length: n }, (_, i) => i % 2 ? -(i + 0.5) : i + 1);
    const b = lu.multiplicarMatrizVector(A, x);
    const copia = JSON.stringify([A, b]);
    const { L, U } = lu.factorizarDoolittle(A);
    assert.ok(lu.matricesAproximadamenteIguales(lu.multiplicarMatrices(L, U), A));
    const resultado = lu.resolverConFactores(A, L, U, b);
    resultado.x.forEach((valor, i) => cerca(valor, x[i]));
    assert.equal(resultado.verificado, true);
    assert.equal(lu.describirSustitucionAdelante(L, b, resultado.y).length, n);
    assert.equal(lu.describirSustitucionAtras(U, resultado.y, resultado.x).length, n);
    assert.equal(lu.describirDoolittle(A, L, U).length, n * n + n);

    const inicial = Array(n).fill(0.5);
    const iterativo = jacobi.resolverJacobi(A, b, inicial, 1e-10, 200);
    assert.equal(iterativo.convergio, true);
    iterativo.solucion.forEach((valor, i) => cerca(valor, x[i]));
    assert.ok(jacobi.normaInfinito(iterativo.residuo) < 1e-7);
    assert.deepEqual(iterativo.inicial, inicial);
    assert.equal(iterativo.tolerancia, 1e-10);
    assert.equal(jacobi.describirIteracion(A, b, inicial, jacobi.iterarJacobi(A, b, inicial)).length, n);
    assert.equal(JSON.stringify([A, b]), copia);
  }

  const pequeno = [[1e-20, 0], [0, 2e-20]];
  const factores = lu.factorizarDoolittle(pequeno);
  assert.deepEqual(lu.resolverConFactores(pequeno, factores.L, factores.U, [1e-20, -4e-20]).x, [1, -2]);
  assert.throws(() => lu.factorizarDoolittle([[0, 1], [1, 1]]), /pivote/i);
  assert.throws(() => lu.factorizarDoolittle([[1, 2], [2, 4]]), /pivote/i);
  assert.throws(() => lu.factorizarDoolittle([[Infinity]]), /finitos/);
  assert.throws(() => lu.factorizarDoolittle([[1, 2], Array(2)]), /finitos/);
  assert.throws(() => lu.factorizarDoolittle(Array(2)), /fila/i);
  assert.throws(() => lu.factorizarDoolittle([[1e-308, 1], [1e308, 2]]), /infinito/i);
  assert.throws(() => lu.resolverConFactores([[1]], [[1]], [[1]], [1, 2]), /exactamente/);

  assert.equal(jacobi.calcularErrorRelativo([1e-15], [0]), 1);
  assert.equal(jacobi.calcularErrorRelativo([0], [0]), 0);
  assert.equal(jacobi.calcularErrorRelativo([0], [1]), Infinity);
  const minusculo = jacobi.resolverJacobi([[1]], [1e-15], [0], 1e-4, 10);
  assert.equal(minusculo.iteraciones, 2);
  assert.equal(minusculo.solucion[0], 1e-15);
  const sinDominancia = jacobi.resolverJacobi([[1, 2], [0.1, 1]], [-1, -0.9], [0, 0], 1e-10, 200);
  assert.equal(sinDominancia.dominancia.esEstrictamenteDominante, false);
  assert.equal(sinDominancia.convergio, true);
  sinDominancia.solucion.forEach((valor, i) => cerca(valor, [1, -1][i]));
  const divergente = jacobi.resolverJacobi([[1, 2], [2, 1]], [1, 1], [0, 0], 1e-8, 8);
  assert.equal(divergente.convergio, false);
  assert.equal(divergente.historial.length, 8);
  assert.equal(divergente.dominancia.esEstrictamenteDominante, false);
  [0, -1, NaN, Infinity].forEach((tol) => assert.throws(() => jacobi.resolverJacobi([[1]], [1], [0], tol), /tolerancia/));
  [0, -1, 2.5, Infinity].forEach((max) => assert.throws(() => jacobi.resolverJacobi([[1]], [1], [0], 0.01, max), /máximo/));
  assert.throws(() => jacobi.resolverJacobi([[0]], [1], [0], 0.01), /diagonal/);
  assert.throws(() => jacobi.resolverJacobi([[1, 2], [2, 1]], [1], [0, 0], 0.01), /exactamente/);
  assert.throws(() => jacobi.resolverJacobi([[1]], [1], [NaN], 0.01), /finitos/);
  assert.throws(() => jacobi.resolverJacobi(Array(2), [1, 2], [0, 0], 0.01), /fila/);
  assert.throws(() => jacobi.iterarJacobi([[1e-308, 1e308], [1, 1]], [1, 1], [1, 1e308]), /no finito/);

  assert.deepEqual(lagrange.intervaloGrafico(lagrange.NODOS_INICIALES, 6), [2, 12]);
  const extendido = lagrange.intervaloGrafico(lagrange.NODOS_INICIALES, 20);
  assert.ok(extendido[0] < 2 && extendido[1] > 20);
  for (const xs of [[-5, -1], [-2.25, 0.125, 3.75], [-3, -1, 0.5, 4], [-3, -1, 0.5, 2, 4]]) {
    const grado = xs.length - 1;
    const f = (x) => x ** grado - 2 * x + 3;
    const nodos = xs.map((x) => ({ x, y: f(x) }));
    const xEval = 1.25;
    const r = lagrange.interpolarLagrange(nodos, xEval);
    cerca(r.valor, f(xEval));
    nodos.forEach(({ x, y }) => cerca(lagrange.interpolarLagrange(nodos, x).valor, y));
    cerca(newton.resolverNewton(xs, nodos.map(({ y }) => y), xEval).valor, r.valor);
    const intervalo = lagrange.intervaloGrafico(nodos, xEval);
    assert.ok(intervalo[0] < Math.min(...xs, xEval) && intervalo[1] > Math.max(...xs, xEval));
    lagrange.muestrearPolinomio(nodos, ...intervalo, 31).forEach(({ x, y }) => cerca(y, f(x)));
  }
  assert.throws(() => lagrange.interpolarLagrange(Array(3), 1), /válido/);
  assert.throws(() => lagrange.interpolarLagrange([{ x: 0, y: 1 }, { x: 1e308, y: 2 }, { x: -1e308, y: 3 }], 1), /precisión/);
  assert.throws(() => lagrange.rangoGrafico([-1e308, 1e308]), /rango/);
  console.log("PASS - solucionadores generales: dimensiones, entradas, estabilidad y rangos gráficos");
};
