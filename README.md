# Métodos Numéricos - Unidad 2

Programa web acumulativo para los ejercicios de sistemas de ecuaciones lineales e interpolación de la unidad.

## Programa publicado

[Abrir el programa en GitHub Pages](https://jadesanchez16.github.io/MN---Unidad-2/)

## Sesiones implementadas

- Sesión 6: factorización LU mediante Doolittle.
- Sesión 7: método iterativo de Jacobi, comprobación de dominancia diagonal e historial de convergencia.
- Sesión 8: interpolación de Lagrange con nodos editables, procedimiento y gráfica.
- Sesión 9: interpolación de Newton mediante diferencias divididas, expansión algebraica, evaluación Newton-Horner, validación y comparación gráfica de grados.

## Verificación local

El sitio es estático y puede abrirse desde `index.html`. Las pruebas numéricas se ejecutan con:

```bash
npm test
```

El comando incluye las cuatro sesiones. Para Newton comprueba la tabla triangular,
los coeficientes, la expansión y evaluación del polinomio, el caso de la tarea
(`P3(5) = 139 ms`), otros conjuntos de datos, grados inferiores y superiores,
entradas inválidas y situaciones de pérdida de precisión. Las advertencias
numéricas no son cotas del error de interpolación de una función desconocida.

[Registro de validación de la Sesión 09](docs/VALIDACION_SESION_09.md).
