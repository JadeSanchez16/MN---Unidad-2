"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const lu = require("../factorizacion-lu/js/app.js");
const jacobi = require("../jacobi/js/app.js");
const lagrange = require("../interpolacion-lagrange/js/lagrange.js");
const lagrangeDesdeInterfaz = require("../interpolacion-lagrange/js/app.js");

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
  assert.equal(lagrangeDesdeInterfaz, lagrange);
  assert.deepEqual(lagrange.INTERVALO_GRAFICA, [2, 12]);
  assert.equal(lagrange.PUNTO_EVALUACION_INICIAL, 6);
  assert.deepEqual(lagrange.NODOS_INICIALES, [
    { x: 2, y: 150 },
    { x: 4, y: 85 },
    { x: 8, y: 50 },
    { x: 12, y: 70 }
  ]);

  const resultado = lagrange.interpolarLagrange(lagrange.NODOS_INICIALES, 6);
  assert.ok(Math.abs(resultado.valor - 55.25) < 1e-12);

  const basesEsperadas = [-0.2, 0.75, 0.5, -0.05];
  resultado.bases.forEach((base, indice) => {
    assert.ok(Math.abs(base - basesEsperadas[indice]) < 1e-12);
  });
  assert.ok(Math.abs(resultado.bases.reduce((suma, base) => suma + base, 0) - 1) < 1e-12);

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

  const polinomioCubico = (x) => 2 * x ** 3 - 3 * x ** 2 + 4 * x - 5;
  const nodosCubicosDesordenados = [-2, 5, 0, 3].map((x) => ({
    x,
    y: polinomioCubico(x)
  }));
  const evaluacionCubica = lagrange.interpolarLagrange(nodosCubicosDesordenados, 1.25);
  assert.ok(Math.abs(evaluacionCubica.valor - polinomioCubico(1.25)) < 1e-12);

  assert.throws(
    () => lagrange.interpolarLagrange([
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 4, y: 3 },
      { x: 6, y: 4 }
    ], 3),
    /valores de x deben ser distintos/
  );
  assert.throws(
    () => lagrange.interpolarLagrange([{ x: 0, y: 0 }], 1),
    /exactamente cuatro nodos/
  );
  assert.throws(
    () => lagrange.interpolarLagrange([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: Number.NaN },
      { x: 3, y: 9 }
    ], 1.5),
    /y2 debe ser un número finito/
  );
  assert.throws(
    () => lagrange.interpolarLagrange(lagrange.NODOS_INICIALES, Number.POSITIVE_INFINITY),
    /punto a evaluar debe ser un número finito/
  );

  const muestras = lagrange.muestrearPolinomio(lagrange.NODOS_INICIALES);
  assert.equal(muestras.length, 241);
  assert.equal(muestras[0].x, 2);
  assert.equal(muestras.at(-1).x, 12);
  assert.equal(muestras.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)), true);
  assert.throws(
    () => lagrange.muestrearPolinomio(lagrange.NODOS_INICIALES, 12, 2),
    /fin del intervalo debe ser mayor/
  );
  assert.throws(
    () => lagrange.muestrearPolinomio(lagrange.NODOS_INICIALES, 2, 12, 1),
    /cantidad de muestras/
  );

  const raizProyecto = path.join(__dirname, "..");
  const rutaHtml = path.join(raizProyecto, "interpolacion-lagrange", "html", "index.html");
  const rutaMotor = path.join(raizProyecto, "interpolacion-lagrange", "js", "lagrange.js");
  const html = fs.readFileSync(rutaHtml, "utf8");
  const codigoMotor = fs.readFileSync(rutaMotor, "utf8");
  const cuerpoInterpolador = codigoMotor.slice(
    codigoMotor.indexOf("function interpolarLagrange"),
    codigoMotor.indexOf("function muestrearPolinomio")
  );

  assert.match(cuerpoInterpolador, /for \(let k = 0;[\s\S]*for \(let i = 0;/);
  assert.equal((html.match(/id="x-[0-3]"/g) || []).length, 4);
  assert.equal((html.match(/id="y-[0-3]"/g) || []).length, 4);
  assert.equal((html.match(/id="x-eval"/g) || []).length, 1);
  assert.match(html, /<script src="\.\.\/js\/lagrange\.js" defer><\/script>[\s\S]*<script src="\.\.\/js\/app\.js" defer><\/script>/);
  assert.doesNotMatch(html, /55\.250000|55\.25 ms/);
}

probarLU();
probarJacobi();
probarLagrange();
console.log("PASS - regresión de factorización LU");
console.log("PASS - convergencia y resultados del método de Jacobi");
console.log("PASS - interpolación de Lagrange y datos dinámicos");
