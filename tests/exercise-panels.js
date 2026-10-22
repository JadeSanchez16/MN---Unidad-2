"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const panels = require("../shared/exercise-panels.js");

module.exports = function probarApartados() {
  assert.equal(panels.prefijarSelector(".node-x, #x-eval, #nodes-body .node-row", "new-"),
    ".node-x, #new-x-eval, #new-nodes-body .node-row");
  assert.equal(panels.prefijarSelector("#x-eval", ""), "#x-eval");

  const original = { value: "6" };
  const nuevo = { value: "" };
  const documento = {
    createElement(nombre) { assert.equal(this, documento); return { nombre }; },
    createElementNS(ns, nombre) { assert.equal(this, documento); return { ns, nombre }; },
    createTextNode(texto) { assert.equal(this, documento); return { texto }; }
  };
  const consultas = [];
  const raiz = (id, campo) => ({
    querySelector(selector) { consultas.push(selector); return selector === `#${id}` ? campo : null; },
    querySelectorAll(selector) { consultas.push(selector); return [campo]; }
  });
  const vistaOriginal = panels.crearVista(raiz("x-eval", original), "", documento);
  const vistaNueva = panels.crearVista(raiz("new-x-eval", nuevo), "new-", documento);
  vistaNueva.getElementById("x-eval").value = "1.25";
  assert.equal(vistaOriginal.getElementById("x-eval").value, "6");
  assert.equal(vistaNueva.querySelector("#x-eval").value, "1.25");
  vistaNueva.querySelectorAll("#nodes-body .node-row");
  assert.ok(consultas.includes("#new-nodes-body .node-row"));
  assert.equal(vistaNueva.id("x-4"), "new-x-4");
  assert.equal(vistaNueva.selector("#x-eval"), "#new-x-eval");
  assert.deepEqual(vistaNueva.createElement("input"), { nombre: "input" });
  assert.deepEqual(vistaNueva.createElementNS("svg", "path"), { ns: "svg", nombre: "path" });
  assert.deepEqual(vistaNueva.createTextNode("procedimiento"), { texto: "procedimiento" });
  assert.ok(Object.isFrozen(vistaNueva));

  function elemento(id, atributos = {}) {
    return {
      id, atributos: { ...atributos },
      hasAttribute(clave) { return clave in this.atributos; },
      getAttribute(clave) { return this.atributos[clave]; },
      setAttribute(clave, valor) { this.atributos[clave] = valor; }
    };
  }
  const elementos = [
    elemento("form"), elemento("x-eval"), elemento("chart-description"),
    elemento("", { for: "x-eval" }), elemento("", { form: "form" }),
    elemento("chart", { "aria-labelledby": "external-title chart-description", "aria-controls": "x-eval", "aria-describedby": "chart-description" })
  ];
  panels.renombrarReferencias({ querySelectorAll: (selector) => selector === "[id]" ? elementos.filter((e) => e.id) : elementos }, "new-");
  assert.equal(elementos[1].id, "new-x-eval");
  assert.equal(elementos[3].getAttribute("for"), "new-x-eval");
  assert.equal(elementos[4].getAttribute("form"), "new-form");
  assert.equal(elementos[5].getAttribute("aria-labelledby"), "external-title new-chart-description");
  assert.equal(elementos[5].getAttribute("aria-controls"), "new-x-eval");
  assert.equal(elementos[5].getAttribute("aria-describedby"), "new-chart-description");

  for (const sesion of ["factorizacion-lu", "jacobi", "interpolacion-lagrange", "interpolacion-newton"]) {
    const base = path.join(__dirname, "..", sesion);
    const html = fs.readFileSync(path.join(base, "html/index.html"), "utf8");
    const app = fs.readFileSync(path.join(base, "js/app.js"), "utf8");
    assert.equal((html.match(/shared\/exercise-panels\.js/g) || []).length, 1);
    assert.ok(html.indexOf("shared/exercise-panels.js") < html.indexOf("../js/app.js"));
    assert.match(app, /function crearAplicacion\(document, modo\)/);
    assert.match(app, /ExercisePanels\.montar\(crearAplicacion\)/);
    assert.match(app, /if \(!esOriginal\) document\.getElementById\("clear-button"\)\.click\(\)/);
    assert.match(app, /activar\(\) \{ if \(esOriginal\)/);
    if (sesion === "jacobi") {
      assert.match(html, /id="convergence-section"[^>]*hidden/);
      assert.match(html, /id="iteration-section"[^>]*hidden/);
      assert.ok(html.indexOf('id="solve-button"') < html.indexOf('id="convergence-section"'));
    }
    const activacion = app.match(/^return \{ activar\(\).*\};$/m);
    assert.ok(activacion, `Controlador de ${sesion}`);
    for (const esOriginal of [true, false]) {
      let calculos = 0;
      let restauraciones = 0;
      const contexto = {
        esOriginal,
        restaurarEjemplo() { restauraciones++; },
        cargarDatosIniciales() { restauraciones++; },
        limpiarSalidas() {}, ocultarResultados() {}, actualizarEstado() {},
        ejecutarInterpolacion() { calculos++; },
        resolverSistema() { calculos++; }, ejecutarJacobi() { calculos++; }
      };
      const controlador = vm.runInNewContext(`(${activacion[0].slice(7, -1)})`, contexto);
      controlador.activar();
      assert.equal(calculos, 0, `${sesion}: no debe calcular al activar la pestaña`);
      assert.equal(restauraciones, esOriginal ? 1 : 0, `${sesion}: no debe borrar el ejercicio nuevo`);
    }
  }
  console.log("PASS - apartados independientes: consultas, campos, referencias y montaje compartido");
};
