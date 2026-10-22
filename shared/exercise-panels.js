(function (global) {
  "use strict";

  function prefijarSelector(selector, prefijo) {
    return selector.replace(/#([A-Za-z][\w-]*)/g, (_, id) => `#${prefijo}${id}`);
  }

  // Cada controlador consulta exclusivamente su panel, incluso con campos dinámicos.
  function crearVista(raiz, prefijo, documento) {
    return Object.freeze({
      id: (id) => `${prefijo}${id}`,
      selector: (selector) => prefijarSelector(selector, prefijo),
      getElementById: (id) => raiz.querySelector(`#${prefijo}${id}`),
      querySelector: (selector) => raiz.querySelector(prefijarSelector(selector, prefijo)),
      querySelectorAll: (selector) => raiz.querySelectorAll(prefijarSelector(selector, prefijo)),
      createElement: documento.createElement.bind(documento),
      createTextNode: documento.createTextNode.bind(documento),
      createElementNS: documento.createElementNS.bind(documento)
    });
  }

  function renombrarReferencias(raiz, prefijo) {
    const ids = new Set(Array.from(raiz.querySelectorAll("[id]"), (elemento) => elemento.id));
    raiz.querySelectorAll("*").forEach((elemento) => {
      if (elemento.id) elemento.id = `${prefijo}${elemento.id}`;
      ["for", "form", "aria-labelledby", "aria-describedby", "aria-controls"].forEach((atributo) => {
        if (!elemento.hasAttribute(atributo)) return;
        const referencias = elemento.getAttribute(atributo).split(/\s+/)
          .map((id) => ids.has(id) ? `${prefijo}${id}` : id);
        elemento.setAttribute(atributo, referencias.join(" "));
      });
    });
  }

  function organizarSolucionador(panel, documento) {
    const formulario = panel.querySelector("form");
    const seccion = formulario.closest("section");
    seccion.classList.add("solver-workspace");
    formulario.classList.add("solver-workbench");
    const interpolacion = Boolean(formulario.querySelector(".input-table"));
    const distribucion = documento.createElement("div");
    distribucion.className = "solver-entry-layout";
    function grupo(nombre, clase) {
      const campo = documento.createElement("fieldset");
      campo.className = clase;
      const leyenda = documento.createElement("legend");
      leyenda.textContent = nombre;
      campo.append(leyenda);
      distribucion.append(campo);
      return campo;
    }
    const datos = grupo(interpolacion ? "Nodos de interpolación" : "Sistema de ecuaciones", "solver-data");
    const parametros = grupo("Parámetros del método", "solver-settings");
    if (interpolacion) {
      datos.append(formulario.querySelector(".table-scroll"));
      const barra = formulario.querySelector(".calculation-bar");
      Array.from(barra.querySelectorAll(":scope > label")).forEach((etiqueta) => parametros.append(etiqueta));
    } else {
      datos.append(formulario.querySelector(".solver-fields"));
      const formato = formulario.querySelector(".entry-format");
      if (formato) datos.append(formato);
      formulario.querySelectorAll(".solver-parameters, .solver-toggle").forEach((campo) => parametros.append(campo));
    }
    const comandos = documento.createElement("div");
    comandos.className = "solver-commandbar";
    const calcular = formulario.querySelector('button[type="submit"]') || panel.querySelector("#new-solve-button");
    comandos.append(calcular);
    const utilidades = documento.createElement("div");
    utilidades.className = "solver-utilities";
    ["clear-button", "restore-button"].forEach((id) => utilidades.append(panel.querySelector(`#new-${id}`)));
    comandos.append(utilidades);
    const accionesNodos = formulario.querySelector(".input-actions");
    if (accionesNodos) datos.append(accionesNodos);
    formulario.prepend(distribucion);
    formulario.append(comandos);

    const barraAccion = panel.querySelector(".action-bar");
    if (barraAccion) {
      barraAccion.className = "solver-run-summary";
      formulario.append(barraAccion);
    }
    const estado = panel.querySelector("#new-global-status, #new-calculation-status");
    formulario.append(estado);
    formulario.querySelectorAll(".solver-actions, .calculation-bar").forEach((vacio) => vacio.remove());
  }

  function montar(inicializar) {
    const documento = global.document;
    const principal = documento.querySelector("main");
    const retorno = principal.querySelector(".return-home-bar");
    const original = documento.createElement("div");
    original.id = "exercise-original";
    original.className = "exercise-panel original-exercise";
    Array.from(principal.children).filter((elemento) => elemento !== retorno)
      .forEach((elemento) => original.append(elemento));
    const nuevo = original.cloneNode(true);
    nuevo.id = "exercise-new";
    nuevo.className = "exercise-panel new-exercise";
    nuevo.hidden = true;
    renombrarReferencias(nuevo, "new-");

    const apartados = [
      { clave: "original", titulo: "Ejercicio original de la tarea", panel: original, prefijo: "" },
      { clave: "nuevo", titulo: "Resolver un nuevo ejercicio", panel: nuevo, prefijo: "new-" }
    ];
    const navegacion = documento.createElement("div");
    navegacion.className = "exercise-tabs";
    navegacion.setAttribute("role", "tablist");
    navegacion.setAttribute("aria-label", "Apartados de la sesión");
    apartados.forEach((apartado) => {
      const boton = documento.createElement("button");
      boton.type = "button";
      boton.id = `exercise-tab-${apartado.clave}`;
      boton.className = "exercise-tab";
      boton.setAttribute("role", "tab");
      boton.setAttribute("aria-controls", apartado.panel.id);
      boton.textContent = apartado.titulo;
      apartado.panel.setAttribute("role", "tabpanel");
      apartado.panel.setAttribute("aria-labelledby", boton.id);
      const cabecera = documento.createElement("div");
      cabecera.className = "exercise-heading";
      const titulo = documento.createElement("h2");
      titulo.textContent = apartado.titulo;
      cabecera.append(titulo);
      apartado.panel.prepend(cabecera);
      apartado.boton = boton;
      navegacion.append(boton);
    });
    principal.prepend(navegacion, original, nuevo);

    apartados.forEach((apartado) => {
      const vista = crearVista(apartado.panel, apartado.prefijo, documento);
      apartado.controlador = inicializar(vista, apartado.clave);
      if (apartado.clave === "nuevo") organizarSolucionador(apartado.panel, documento);
      const restaurar = vista.getElementById("restore-button");
      restaurar.textContent = apartado.clave === "original" ? "Restaurar tarea" : "Restaurar datos originales";
      if (apartado.clave === "original") {
        vista.querySelectorAll("textarea, input[type=number]").forEach((campo) => { campo.readOnly = true; });
        vista.querySelectorAll("select, #second-scenario").forEach((campo) => { campo.disabled = true; });
        const agregar = vista.getElementById("add-node-button");
        if (agregar) agregar.hidden = true;
        vista.getElementById("clear-button").textContent = "Limpiar resultados";
      }
    });

    const subtitulo = documento.querySelector(".site-header .subtitle");
    const textoOriginal = subtitulo?.textContent;
    let seleccionado = null;
    function seleccionar(clave) {
      if (seleccionado === clave) return;
      seleccionado = clave;
      apartados.forEach((apartado) => {
        const activo = apartado.clave === clave;
        apartado.panel.hidden = !activo;
        apartado.boton.setAttribute("aria-selected", String(activo));
        apartado.boton.tabIndex = activo ? 0 : -1;
        if (activo) apartado.controlador?.activar?.();
      });
      if (subtitulo) subtitulo.textContent = clave === "original" ? textoOriginal : "Solucionador general · Ejercicios nuevos";
    }
    apartados.forEach((apartado, indice) => {
      apartado.boton.addEventListener("click", () => seleccionar(apartado.clave));
      apartado.boton.addEventListener("keydown", (evento) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(evento.key)) return;
        evento.preventDefault();
        const siguiente = evento.key === "Home" ? 0 : evento.key === "End" ? 1 : 1 - indice;
        seleccionar(apartados[siguiente].clave);
        apartados[siguiente].boton.focus();
      });
    });
    seleccionar("original");
  }

  const api = Object.freeze({ montar, crearVista, prefijarSelector, renombrarReferencias, organizarSolucionador });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global) global.ExercisePanels = api;
})(typeof window !== "undefined" ? window : null);
