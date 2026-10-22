# Tareas originales y solucionadores independientes

## Integración

Las sesiones 06, 07, 08 y 09 abren el apartado **Ejercicio original de la
tarea**. Sus datos se leen de las constantes originales y se calculan con el
algoritmo existente al pulsar resolver, ejecutar o calcular; no se almacenan
respuestas prefabricadas. Los campos
académicos están protegidos y no pueden ser sustituidos por el ejercicio nuevo.

**Resolver un nuevo ejercicio** comienza con campos vacíos y mantiene sus
propios datos y resultados mientras se cambia entre los dos apartados de la
misma página. No se guarda información entre recargas ni entre sesiones.
Restaurar copia los datos académicos solamente al apartado activo. Limpiar
la tarea oculta sus resultados sin borrar sus datos. Restaurar o regresar a
su pestaña recupera los datos originales y mantiene la resolución oculta.
Solamente el botón principal despliega el procedimiento y los resultados.
En Jacobi esto incluye la demostración de convergencia y el esquema iterativo.

El formulario nuevo organiza los datos y parámetros en dos grupos semánticos
con comandos separados al final. En móvil estos grupos se apilan sin cambiar
los controles, las asociaciones de sus etiquetas ni los eventos de cálculo.

`shared/exercise-panels.js` crea los apartados a partir de la plantilla existente,
con identificadores, etiquetas, formularios y referencias accesibles separados.
Cada controlador recibe consultas limitadas a su panel y conserva su estado
local. Los algoritmos no se duplican. Los motores de Lagrange y Newton no se
modificaron; LU y Jacobi reutilizan sus funciones numéricas existentes.

## Verificación realizada

`npm test` pasó antes y después de la integración. Incluye los cuatro casos
originales, ejercicios de distintas dimensiones y grados, entradas inválidas,
casos límite, pruebas de precisión y nuevas pruebas del aislamiento de consultas
y de las referencias de formularios y gráficos.

Pruebas funcionales en navegador local:

| Sesión | Caso original | Caso nuevo comprobado |
| --- | --- | --- |
| 06 | A = LU, solución b1 = (3, -6, 14), ambos escenarios verificados | A = [[2,1],[4,3]], b = (1,1), solución = (1,-1) |
| 07 | 10 iteraciones, tolerancia 1e-4 y residuo verificado | A = [[4,1],[2,3]], b = (2,-4), x0 = (0.5,0.5), tolerancia 1e-8: 22 iteraciones hacia (1,-2) |
| 08 | P3(6) = 55.25 ms y curva en [2,12] | y = x² + 1, nodos -3, -0.5, 1.5, 4: P(6) = 37; agregar nodo (5,26) conserva 37 |
| 09 | P3(5) = 139 ms, diferencias, expansión y comparación de grados | y = 2x³ - 3x + 1, nodos -2, 0.5, 2, 4: P3(1.25) = 1.15625; agregar (5,236) conserva el valor |

También se verificaron:

- Estado independiente y persistente al cambiar de pestaña en las cuatro sesiones.
- Datos originales idénticos después de resolver ejercicios nuevos.
- Calcular, limpiar, restaurar y volver a calcular cada tarea original.
- Campos vacíos, nodos repetidos y advertencia de convergencia no garantizada.
- Agregar y eliminar nodos intermedios con etiquetas e identificadores correctos.
- Cambio de grado y superposición gráfica en Newton.
- Gráficas separadas sin identificadores duplicados, con nodos, curva y evaluación.
- Navegación entre las cuatro sesiones y retorno al inicio.
- Diseño a 390 × 844: pestañas legibles y tablas con desplazamiento propio.
- Resoluciones originales ocultas al entrar, restaurar y cambiar de apartado;
  resultados correctos después de pulsar cada botón principal.
- Formularios reorganizados: matrices, vectores, parámetros, nodos dinámicos,
  selección de grado y botones conservan sus eventos y su formulario asociado.
- Nuevo diseño móvil sin desbordamiento horizontal de página en las cuatro sesiones.

La validación numérica se realiza con tolerancias de punto flotante; no constituye
una garantía para cualquier problema mal condicionado ni elimina las limitaciones
matemáticas documentadas de Doolittle sin pivoteo y de Jacobi.
