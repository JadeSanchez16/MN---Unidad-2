"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const lu = require("../factorizacion-lu/js/app.js");
const jacobi = require("../jacobi/js/app.js");
const lagrange = require("../interpolacion-lagrange/js/lagrange.js");
const lagrangeDesdeInterfaz = require("../interpolacion-lagrange/js/app.js");
const newton = require("../interpolacion-newton/js/newton.js");
const newtonDesdeInterfaz = require("../interpolacion-newton/js/app.js");

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
  assert.equal(resultado.terminos.length, 4);
  assert.deepEqual(
    resultado.terminos.map(({ numerador, denominador, contribucion }) => [
      numerador,
      denominador,
      contribucion
    ]),
    [
      [24, -120, -30],
      [48, 64, 63.75],
      [-48, -96, 25],
      [-16, 320, -3.5]
    ]
  );
  resultado.terminos.forEach((termino) => {
    assert.equal(termino.factores.length, 3);
    assert.ok(Math.abs(termino.y * termino.base - termino.contribucion) < 1e-12);
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

  const polinomioCubico = (x) => 2 * x ** 3 - 3 * x ** 2 + 4 * x - 5;
  const nodosCubicosDesordenados = [-2, 5, 0, 3].map((x) => ({
    x,
    y: polinomioCubico(x)
  }));
  const evaluacionCubica = lagrange.interpolarLagrange(nodosCubicosDesordenados, 1.25);
  assert.ok(Math.abs(evaluacionCubica.valor - polinomioCubico(1.25)) < 1e-12);

  const polinomioCuartico = (x) => x ** 4 - 2 * x ** 2 + 3 * x + 1;
  const nodosCuarticos = [-2, -1, 0, 1, 2].map((x) => ({
    x,
    y: polinomioCuartico(x)
  }));
  const evaluacionCuartica = lagrange.interpolarLagrange(nodosCuarticos, 0.5);
  assert.ok(Math.abs(evaluacionCuartica.valor - polinomioCuartico(0.5)) < 1e-12);
  assert.equal(evaluacionCuartica.terminos.length, 5);
  assert.ok(Math.abs(evaluacionCuartica.bases.reduce((suma, base) => suma + base, 0) - 1) < 1e-12);

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
    /al menos dos nodos/
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
  const rutaAplicacion = path.join(raizProyecto, "interpolacion-lagrange", "js", "app.js");
  const rutaMotor = path.join(raizProyecto, "interpolacion-lagrange", "js", "lagrange.js");
  const html = fs.readFileSync(rutaHtml, "utf8");
  const codigoAplicacion = fs.readFileSync(rutaAplicacion, "utf8");
  const codigoMotor = fs.readFileSync(rutaMotor, "utf8");
  const cuerpoInterpolador = codigoMotor.slice(
    codigoMotor.indexOf("function interpolarLagrange"),
    codigoMotor.indexOf("function muestrearPolinomio")
  );

  assert.match(cuerpoInterpolador, /for \(let k = 0;[\s\S]*for \(let i = 0;/);
  assert.equal((html.match(/id="nodes-body"/g) || []).length, 1);
  assert.equal((html.match(/id="add-node-button"/g) || []).length, 1);
  assert.equal((html.match(/id="x-eval"/g) || []).length, 1);
  assert.equal((html.match(/id="procedure-body"/g) || []).length, 1);
  assert.equal((html.match(/id="basis-check"/g) || []).length, 1);
  assert.equal((html.match(/id="final-sum"/g) || []).length, 1);
  assert.equal((html.match(/class="calculation-output"[^>]*hidden/g) || []).length, 3);
  assert.match(html, /class="return-home-button" href="\.\.\/\.\.\/index\.html">Retornar al inicio<\/a>/);
  assert.match(html, /<script src="\.\.\/js\/lagrange\.js" defer><\/script>[\s\S]*<script src="\.\.\/js\/app\.js" defer><\/script>/);
  assert.doesNotMatch(html, /55\.250000|55\.25 ms/);
  assert.doesNotMatch(codigoAplicacion, /iniciarAplicacion\(\)[\s\S]*ejecutarInterpolacion\(\);/);
  assert.match(codigoAplicacion, /formulario\.addEventListener\("submit", ejecutarInterpolacion\)/);
  assert.match(codigoAplicacion, /mostrarProcedimiento\(resultado, xEvaluar\)[\s\S]*mostrarSalidas\(\)/);

  ["factorizacion-lu", "jacobi", "interpolacion-lagrange", "interpolacion-newton"].forEach((modulo) => {
    const htmlModulo = fs.readFileSync(path.join(raizProyecto, modulo, "html", "index.html"), "utf8");
    assert.match(htmlModulo, /class="return-home-button" href="\.\.\/\.\.\/index\.html">Retornar al inicio<\/a>/);
    assert.match(htmlModulo, /(?:href="\.\.\/\.\.\/factorizacion-lu\/html\/index\.html\?v=nav3"|aria-current="page">Sesión 6: LU<\/span>)/);
    assert.match(htmlModulo, /(?:href="\.\.\/\.\.\/jacobi\/html\/index\.html\?v=nav3"|aria-current="page">Sesión 7: Jacobi<\/span>)/);
    assert.match(htmlModulo, /(?:href="\.\.\/\.\.\/interpolacion-lagrange\/html\/index\.html\?v=nav3"|aria-current="page">Sesión 8: Lagrange<\/span>)/);
    assert.match(htmlModulo, /(?:href="\.\.\/\.\.\/interpolacion-newton\/html\/index\.html\?v=nav3"|aria-current="page">Sesión 9: Newton<\/span>)/);
  });

  const htmlInicio = fs.readFileSync(path.join(raizProyecto, "index.html"), "utf8");
  assert.equal((htmlInicio.match(/index\.html\?v=nav3/g) || []).length, 4);
}

function aproximadamenteIgual(actual, esperado, tolerancia = 1e-10) {
  assert.ok(
    Math.abs(actual - esperado) <= tolerancia * Math.max(1, Math.abs(esperado)),
    `${actual} no coincide con ${esperado}`
  );
}

function probarNewton() {
  assert.equal(newtonDesdeInterfaz, newton);
  assert.equal(newton.PUNTO_EVALUACION_INICIAL, 5);
  assert.deepEqual(newton.NODOS_INICIALES, [
    { x: 1, y: 45 },
    { x: 2, y: 65 },
    { x: 4, y: 110 },
    { x: 7, y: 220 }
  ]);

  const X = [1, 2, 4, 7];
  const Y = [45, 65, 110, 220];
  const diferencias = newton.diferencias_divididas(X, Y);
  const tablaEsperada = [
    [45, 20, 5 / 6, 1 / 3],
    [65, 45 / 2, 17 / 6, null],
    [110, 110 / 3, null, null],
    [220, null, null, null]
  ];
  tablaEsperada.forEach((fila, i) => fila.forEach((esperado, j) => {
    if (esperado === null) {
      assert.equal(diferencias.tabla[i][j], null);
    } else {
      aproximadamenteIgual(diferencias.tabla[i][j], esperado);
    }
  }));
  assert.equal(diferencias.pasos.length, 6);
  diferencias.pasos.forEach((paso) => {
    aproximadamenteIgual(paso.numerador, paso.superior - paso.inferior);
    aproximadamenteIgual(paso.valor, paso.numerador / paso.denominador);
  });

  const resultado = newton.resolverNewton(X, Y, 5, 3);
  [45, 20, 5 / 6, 1 / 3].forEach((esperado, indice) => {
    aproximadamenteIgual(resultado.coeficientes[indice], esperado);
  });
  [24, 133 / 6, -3 / 2, 1 / 3].forEach((esperado, indice) => {
    aproximadamenteIgual(resultado.coeficientesEstandar[indice], esperado);
  });
  aproximadamenteIgual(resultado.valor, 139);
  assert.equal(resultado.clasificacion, "interpolación");
  assert.equal(resultado.validaciones.every(({ valido }) => valido), true);
  assert.deepEqual(resultado.validaciones.map(({ calculado }) => calculado), Y);
  [-3, 0, 1, 2.5, 5, 7, 10].forEach((x) => {
    const esperado = x ** 3 / 3 - 1.5 * x ** 2 + (133 / 6) * x + 24;
    aproximadamenteIgual(newton.evaluarNewton(resultado.coeficientes, X, x).valor, esperado);
    aproximadamenteIgual(newton.evaluarEstandar(resultado.coeficientesEstandar, x), esperado);
  });
  assert.deepEqual(resultado.pasosEvaluacion.map(({ indice }) => indice), [3, 2, 1, 0]);

  const valoresPorGrado = [45, 125, 135, 139];
  valoresPorGrado.forEach((esperado, grado) => {
    const parcial = newton.resolverNewton(X, Y, 5, grado);
    aproximadamenteIgual(parcial.valor, esperado);
    assert.equal(parcial.X.length, grado + 1);
    assert.equal(parcial.validaciones.length, grado + 1);
    assert.equal(parcial.validaciones.every(({ valido }) => valido), true);
  });

  const desordenado = newton.resolverNewton([7, 1, 4, 2], [220, 45, 110, 65], 5, 3);
  aproximadamenteIgual(desordenado.valor, 139);
  assert.deepEqual(desordenado.X, X);

  const cubico = (x) => 2 * x ** 3 - 3 * x ** 2 + 4 * x - 5;
  const XGeneral = [-2, 0.5, 3, 5];
  const YGeneral = XGeneral.map(cubico);
  const general = newton.resolverNewton(XGeneral, YGeneral, 1.25, 3);
  aproximadamenteIgual(general.valor, cubico(1.25));
  [ -5, 4, -3, 2 ].forEach((esperado, indice) => {
    aproximadamenteIgual(general.coeficientesEstandar[indice], esperado);
  });

  const extrapolacion = newton.resolverNewton(X, Y, 9, 3);
  assert.equal(extrapolacion.clasificacion, "extrapolación");

  const muestras = newton.muestrearNewton(resultado.coeficientes, resultado.X, 0, 8, 101);
  assert.equal(muestras.length, 101);
  assert.equal(muestras[0].x, 0);
  assert.equal(muestras.at(-1).x, 8);
  assert.equal(muestras.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)), true);

  const ejemploTeorico = newton.resolverNewton([1, 2, 4, 5], [2, 5, 17, 26], 3);
  assert.equal(ejemploTeorico.valor, 10);
  assert.deepEqual(ejemploTeorico.coeficientes, [2, 3, 1, 0]);
  assert.deepEqual(ejemploTeorico.coeficientesEstandar, [1, 0, 1, 0]);
  const constante = newton.resolverNewton([0.5], [-2.75], 0.5);
  assert.equal(constante.valor, -2.75);
  assert.equal(constante.clasificacion, "interpolación");
  assert.equal(newton.evaluarNewton([0], [0], 10).valor, 0);
  const cuartico = (x) => x ** 4 - 2 * x + 7;
  const xsCuartico = [-3, -0.25, 1, 2, 4.5];
  const resultadoCuartico = newton.resolverNewton(xsCuartico, xsCuartico.map(cuartico), 0.75);
  aproximadamenteIgual(resultadoCuartico.valor, cuartico(0.75));
  assert.ok(resultadoCuartico.validaciones.every(({ valido }) => valido));
  const diminuto = newton.resolverNewton([0, 1], [0, 1e-13], 0.5);
  assert.equal(diminuto.valor, 5e-14);
  const proximos = newton.resolverNewton([0, 1e-13], [0, 1e-13], 5e-14);
  assert.equal(proximos.valor, 5e-14);
  assert.ok(proximos.advertencias.some((mensaje) => /próximos/.test(mensaje)));
  const desplazados = [1e8, 1e8 + 1, 1e8 + 2, 1e8 + 3];
  const cancelacion = newton.resolverNewton(desplazados, [0, 1, 8, 27], 1e8 + 1.5);
  assert.equal(cancelacion.valor, 3.375);
  assert.ok(cancelacion.advertencias.some((mensaje) => /estándar pierde precisión/.test(mensaje)));

  assert.throws(() => newton.diferencias_divididas([1, 2], [1]), /misma longitud/);
  assert.throws(() => newton.diferencias_divididas([1, 1], [2, 3]), /distintos/);
  assert.throws(() => newton.diferencias_divididas([1, 2], [2, Number.NaN]), /número finito/);
  assert.throws(() => newton.resolverNewton(X, Y, 5, 4), /grado debe ser/);
  assert.throws(() => newton.resolverNewton(X, Y, Number.POSITIVE_INFINITY, 3), /punto a evaluar/);
  assert.throws(() => newton.resolverNewton(null, null, 0), newton.ValidationError);
  assert.throws(() => newton.resolverNewton([], [], 0), /al menos un nodo/);
  assert.throws(() => newton.resolverNewton([1], ["2"], 0), /número finito/);
  assert.throws(() => newton.diferencias_divididas(Array(2), [1, 2]), /número finito/);
  [-1, 1.5, NaN, Infinity].forEach((grado) => {
    assert.throws(() => newton.resolverNewton(X, Y, 5, grado), /grado debe ser/);
  });
  assert.throws(() => newton.diferencias_divididas([-1e308, 1e308], [0, 1]), /rango numérico/);
  assert.throws(() => newton.diferencias_divididas([0, 1], [-1e308, 1e308]), /rango numérico/);
  assert.throws(() => newton.diferencias_divididas([0, 1e308], [0, 1e-308]), /subdesbordamiento/);
  assert.throws(() => newton.evaluarNewton([Infinity], [0], 0), /número finito/);
  assert.throws(() => newton.evaluarNewton([1], [NaN], 0), /número finito/);
  assert.throws(() => newton.evaluarNewton([], [], 0), /al menos un coeficiente/);
  assert.throws(() => newton.evaluarNewton([1, 2], [0], 0), /misma longitud/);
  assert.throws(() => newton.expandirPolinomioNewton([], []), /al menos un coeficiente/);
  assert.throws(() => newton.evaluarEstandar([0, 1e308], 10), /rango numérico/);
  assert.throws(() => newton.muestrearNewton([1], [0], 1, 0), /amplitud positiva/);
  assert.throws(() => newton.muestrearNewton([1], [0], 0, 1, 1), /cantidad de muestras/);

  const raizProyecto = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(raizProyecto, "interpolacion-newton", "html", "index.html"), "utf8");
  const codigoMotor = fs.readFileSync(path.join(raizProyecto, "interpolacion-newton", "js", "newton.js"), "utf8");
  assert.match(codigoMotor, /function diferencias_divididas\(X, Y\)/);
  assert.match(codigoMotor, /for \(let orden = 1;[\s\S]*for \(let fila = 0;/);
  assert.match(codigoMotor, /function evaluarNewton/);
  assert.match(codigoMotor, /function expandirPolinomioNewton/);
  ["nodes-body", "add-node-button", "restore-button", "degree-select", "x-eval", "differences-table", "validation-steps", "newton-chart", "comparison-body"].forEach((id) => {
    assert.equal((html.match(new RegExp(`id="${id}"`, "g")) || []).length, 1);
  });
  assert.doesNotMatch(html, /139\s*ms|133\/6|P₃\(5\)/);

  const contexto = vm.createContext({ module: { exports: {} }, require: () => newton });
  vm.runInContext(fs.readFileSync(path.join(raizProyecto, "interpolacion-newton/js/app.js"), "utf8"), contexto);
  const vista = vm.runInContext("({ formatearDecimal, formatearPolinomio, formatearFormaNewton, nombreDiferencia, calcularRangoGrafico, formatearEje })", contexto);
  assert.equal(vista.nombreDiferencia([-2.25, 0.125, 3.75], 0, 2), "f[-2.25, 0.125, 3.75]");
  assert.equal(Number(vista.formatearDecimal(1e-13)), 1e-13);
  assert.equal(Number(vista.formatearDecimal(-5e-14)), -5e-14);
  assert.notEqual(vista.formatearPolinomio([0, 1e-13]), "0");
  assert.match(vista.formatearFormaNewton(resultado), /45 \+ 20\(x - 1\) \+ 5\/6\(x - 1\)\(x - 2\)/);
  const rangoDiminuto = vista.calcularRangoGrafico([0, 1e-13]);
  assert.ok(rangoDiminuto[0] < 0 && rangoDiminuto[1] > 1e-13 && rangoDiminuto[1] < 1e-12);
  assert.notEqual(vista.formatearEje(100.01, 0.1), vista.formatearEje(100.02, 0.1));
  assert.equal(vista.formatearEje(230.4, 300), "230");
  assert.equal(vista.formatearDecimal(10.4, 0), "10");
  assert.match(vista.formatearEje(1.25e-13, 1e-13), /^1\.25e-13$/);
  assert.equal(vista.formatearPolinomio([0, 1e-13]), "(1e-13)x");
  assert.throws(() => vista.calcularRangoGrafico([-1e308, 1e308]), /rango de la gráfica/);
}

probarLU();
probarJacobi();
probarLagrange();
probarNewton();
console.log("PASS - regresión de factorización LU");
console.log("PASS - convergencia y resultados del método de Jacobi");
console.log("PASS - interpolación de Lagrange y datos dinámicos");
console.log("PASS - interpolación de Newton, grados y validaciones");
