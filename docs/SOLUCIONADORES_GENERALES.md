# Solucionadores generales de las sesiones 06 a 09

Ampliacion del 22 de octubre de 2026 sobre la implementacion existente.

## Conservacion de los ejemplos originales

Las pruebas de las cuatro sesiones se ejecutaron antes de modificar el codigo.
Despues de la ampliacion se repitieron con los siguientes resultados:

| Sesion | Resultado conservado |
| --- | --- |
| LU | L*U=A, x de b1 = [3,-6,14], segundo escenario verificado reutilizando L y U. |
| Jacobi | 10 iteraciones; [2.5136015454,3.3995211470,3.3375808494,3.3415617035]. |
| Lagrange | P3(6)=55.25 ms; cuatro puntos y curva original en [2,12]. |
| Newton | P3(5)=139 ms; tabla, coeficientes, expansion, validaciones y comparacion. |

## Cambios

- LU y Jacobi ahora reciben matrices y vectores de dimension variable mediante
  campos editables. La dimension se deduce del numero de filas y columnas.
  El lector compartido solo interpreta entradas; los algoritmos siguen en sus
  modulos originales.
- LU conserva Doolittle sin pivoteo, sus sustituciones y los dos escenarios.
  El segundo vector es opcional. Se muestran las ecuaciones, pasos, productos
  y residuos de los datos ingresados. Las pruebas internas especificas del
  ejemplo original solo se aplican a ese ejemplo.
- Jacobi recibe tambien vector inicial, tolerancia y maximo de iteraciones.
  Las formulas, la tabla de dominancia, la fila inicial y las columnas del
  historial se adaptan a la dimension. El desarrollo numerico por iteracion
  se encuentra en un desplegable bajo el historial.
- Se corrigio la evaluacion del error relativo para aproximaciones pequenas:
  un denominador no nulo ya no se confunde con cero. La secuencia del ejemplo
  original conserva sus 10 iteraciones.
- Se mantienen los bucles de Doolittle y Jacobi. Se validan elementos vacios,
  dimensiones incompatibles, valores no finitos, parametros invalidos y
  desbordamientos. Los pivotes pequenos no se rechazan por su sola magnitud
  absoluta: se comprueba si son cero y se advierte de sensibilidad en LU.
- Lagrange conserva sus productos y bases. La grafica incluye todos los nodos
  y el punto evaluado con ejes automaticos. El ejemplo original mantiene [2,12].
  Se agregaron eliminar nodos, limpiar y restaurar.
- Newton conserva su motor y todas sus funciones; se agrego Limpiar.
- Una edicion invalida las salidas anteriores hasta volver a calcular.

## Pruebas automatizadas

`npm test` ejecuta las regresiones anteriores y `tests/general-solvers.js`:

- LU y Jacobi: dimensiones 1, 2, 4 y 5; soluciones conocidas con negativos y
  decimales, verificacion de residuos y entradas no modificadas.
- LU: matriz pequena bien escalada, pivotes cero, matriz singular, datos
  no finitos, arreglos dispersos y desbordamiento aritmetico.
- Jacobi: inicial no nulo, tolerancias distintas, cero exacto, solucion de
  magnitud 1e-15, convergencia sin dominancia estricta, divergencia y limite
  de iteraciones; parametros y dimensiones invalidos.
- Lagrange y Newton: polinomios de grados 1 a 4 con datos negativos, decimales
  y no equiespaciados; contraste entre metodos y evaluaciones conocidas.
- Rangos graficos: caso original, extrapolacion, datos fuera de [2,12]
  y rechazo de rangos no representables.
- Lectura de entradas: punto decimal, notacion cientifica, vector multilinea,
  valores faltantes o invalidos y matrices no cuadradas.

## Comprobaciones en navegador

Se probaron los ejemplos originales y otros ejercicios mediante sus controles:
LU 2x2 y 4x4; Jacobi 2x2 con inicial [0.5,0.5], tolerancia 1e-8, maximo 100,
solucion [1,-2]; Jacobi divergente limitado a 8 iteraciones; Lagrange con nodos
[-3,-0.5,1.5,4] de x^2+1, evaluado en 6 con resultado 37; y Newton para
2x^3-3x+1, evaluado en 1.25 con resultado 1.15625.

Se comprobaron calcular, editar, limpiar, restaurar, agregar y eliminar nodos,
segundo escenario opcional, operaciones de Jacobi, cambio de grado, superposicion,
avisos de datos invalidos, navegacion y retorno al inicio. En movil 390x844 las
cuatro sesiones no desbordan horizontalmente la pagina. Las tablas anchas se
desplazan dentro de sus contenedores. No se detectaron errores de JavaScript.

## Alcance

Doolittle no incorpora pivoteo, para conservar el metodo existente. Una matriz
que lo necesita debe resolverse con una reordenacion apropiada o con otro metodo.
La dominancia diagonal estricta es suficiente, pero no necesaria, para la
convergencia de Jacobi. La parada se basa en el error relativo entre iteraciones;
el residuo se muestra por separado y no representa una cota del error verdadero.
El error relativo es infinito cuando la nueva aproximacion es cero y el cambio
es no nulo; ese caso no satisface una tolerancia finita.
Todos los metodos usan punto flotante, sin redondear calculos intermedios.
