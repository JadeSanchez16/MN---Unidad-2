# Métodos Numéricos - Unidad 2

Programa web acumulativo para los ejercicios de sistemas de ecuaciones lineales e interpolación de la unidad.

## Programa publicado

[Abrir el programa en GitHub Pages](https://jadesanchez16.github.io/MN---Unidad-2/)

## Sesiones implementadas

- Sesión 6: factorización LU mediante Doolittle con matriz y vectores editables de dimensión variable; uno o dos escenarios y sustituciones paso a paso.
- Sesión 7: Jacobi con matriz, vector independiente, vector inicial, tolerancia y máximo de iteraciones editables; dominancia diagonal, historial, operaciones y residuo.
- Sesión 8: Lagrange con nodos editables, procedimiento y ejes gráficos automáticos para los datos y el punto evaluado.
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

## Ejercicios nuevos

Cada sesión abre **Ejercicio original de la tarea**, con sus datos protegidos,
contexto, procedimiento y resultados calculados por el mismo algoritmo.
**Resolver un nuevo ejercicio** tiene campos y resultados independientes.
Cambiar entre ambos apartados conserva el ejercicio nuevo durante la visita
y recupera la tarea original, sin mezclar datos ni resultados.

En el apartado nuevo se puede editar, calcular, limpiar y restaurar una copia
de los datos originales. En la tarea, limpiar borra únicamente los resultados;
calcular o restaurar vuelve a obtenerlos sin cambiar los datos académicos.
Los resultados nuevos aparecen después de calcular y se invalidan al editar.
En LU y Jacobi la dimensión se deduce de la matriz: cada fila ocupa una línea
y los coeficientes se separan por espacios. Los vectores admiten espacios o
saltos de línea. Se usa punto decimal y se acepta notación científica.
LU permite desactivar el segundo vector para resolver un único sistema.

Doolittle conserva la versión sin pivoteo: una matriz que requiere intercambio
de filas se rechaza con un mensaje explícito. Jacobi mantiene el criterio de
error relativo en norma infinito; la falta de dominancia diagonal estricta
produce una advertencia, no una afirmación de divergencia. Se muestra también
el residuo para verificar la aproximación. El programa usa punto flotante y
rechaza operaciones no finitas; datos mal condicionados requieren cautela.

[Validación de los solucionadores generales](docs/SOLUCIONADORES_GENERALES.md).
