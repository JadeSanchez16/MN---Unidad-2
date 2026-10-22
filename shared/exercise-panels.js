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

  const api = Object.freeze({ montar, crearVista, prefijarSelector, renombrarReferencias });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global) global.ExercisePanels = api;
})(typeof window !== "undefined" ? window : null);
