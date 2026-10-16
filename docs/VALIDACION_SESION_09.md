# Validacion de la Sesion 09

Revision del 16 de octubre de 2026 sobre la implementacion existente.
Se contrastaron las paginas 4 y 5 de la Guia de Aprendizaje Autonomo 09
y la recurrencia, tabla y ejemplos de Newton de la Guia Teorica 09.

## Requisitos de la guia

| Requisito | Verificacion |
| --- | --- |
| Entrada de X e Y | Campos editables; agregar, eliminar y restaurar nodos. |
| Matriz triangular completa | Diferencias divididas por orden; seis operaciones para cuatro nodos. |
| Coeficientes de la primera fila | 45, 20, 5/6, 1/3, calculados por el algoritmo. |
| Polinomio y simplificacion | Forma de Newton, terminos expandidos y agrupacion por potencias. |
| Forma estandar de la tarea | (1/3)x^3 - (3/2)x^2 + (133/6)x + 24. |
| Evaluacion eficiente | Newton-Horner; P3(5) = 139 ms con pasos numericos. |
| Validacion de los datos | Reproduce 45, 65, 110 y 220 en X = 1, 2, 4 y 7. |
| Exploracion y comparacion | Grados 0 a 3; resultados en 5: 45, 125, 135 y 139 ms. |
| Grafica | Coordenadas numericas, curva, cuatro nodos, marcador (5,139), ejes y leyenda. |

## Problemas corregidos

- El uso directo de `map(formatearDecimal)` pasaba el indice como cantidad de
  decimales. Por ejemplo, -2.25 aparecia como -2 en algunas formulas.
- El formateo eliminaba ceros significativos al redondear sin decimales.
- Los valores pequenos se presentaban como cero y podian desaparecer del
  polinomio mostrado. Se conserva su magnitud con notacion cientifica.
- Se rechazaban nodos distintos muy proximos como si fueran repetidos.
  Ahora se aceptan y se advierte de su sensibilidad numerica.
- Las funciones publicas de evaluacion no validaban todos sus coeficientes
  y nodos. Se completaron las comprobaciones, incluidos arreglos dispersos.
- Algunas restas desbordadas podian producir una diferencia dividida cero.
  Se detectan desbordamientos y subdesbordamientos de la tabla.
- Se advierte si la expansion estandar pierde precision frente a Newton-Horner
  o si falla la validacion de los nodos.
- Un grado que no puede calcularse ya no impide obtener otro grado valido
  en la comparacion. La tabla identifica el grado y su error.
- La grafica valida rangos finitos, conserva escalas pequenas y adapta su
  encuadre y rotulos para movil.

## Pruebas ejecutadas

`npm test` incluye LU, Jacobi, Lagrange y Newton. Se ejecuta tambien en el
workflow de GitHub Pages antes de publicar. Las pruebas de Newton incluyen
tabla, operaciones, coeficientes, ambas representaciones, evaluaciones,
grados 0 a 4, ejemplo teorico f(3)=10, nodos desordenados, negativos y decimales,
datos pequenos, nodos proximos, cancelacion e entradas invalidas.

En navegador se comprobaron el caso original, comparacion y superposicion,
otro cubico con nodos [-2.25, 0.125, 1.5, 3.75], extrapolacion, cinco nodos,
agregar y eliminar, datos incompletos y repetidos, restauracion, valores
pequenos y advertencias de cancelacion. Se contrastaron las 321 muestras
de la curva del caso original con el polinomio esperado: la diferencia
maxima fue inferior a 0.01 unidades de coordenada SVG, debida al redondeo
de las coordenadas de dibujo a dos decimales.

Se probaron las cuatro sesiones, sus resultados, los enlaces entre ellas y
el retorno al inicio. En escritorio y movil de 390 x 844 no se detectaron
errores JavaScript ni desbordamiento horizontal de pagina. Las tablas
anchas conservan desplazamiento horizontal dentro de su contenedor.
LU verifica ambos sistemas y L*U=A; Jacobi converge en 10 iteraciones;
Lagrange obtiene 55.25 ms y reproduce 85 ms al evaluar en x=4.

Los algoritmos y archivos de las sesiones 06, 07 y 08 no fueron modificados.
El inicio y las pruebas de Newton ya estaban integrados al comenzar esta
revision; se comprobo su existencia en el sitio publicado.

## Alcance numerico

Se utiliza aritmetica de punto flotante de JavaScript sin redondeo intermedio.
Las fracciones presentadas son reconstrucciones para mostrar resultados
sencillos; no constituyen un motor de aritmetica racional exacta.
Las advertencias de condicionamiento y cancelacion no son cotas del error
de aproximacion a una funcion desconocida. Para datos extremos, la aplicacion
puede rechazar el calculo o la grafica con un mensaje de rango numerico.
