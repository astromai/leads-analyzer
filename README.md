# Analizador de leads

Esta aplicación analiza conversaciones de WhatsApp de una inmobiliaria y devuelve una ficha que ayuda a decidir qué leads conviene atender primero.

La idea es que el ejecutivo pueda entender rápidamente qué busca la persona, si tiene alguna urgencia, qué información financiera o de vivienda mencionó y si hace falta que intervenga alguien del equipo.

## Cómo ejecutarlo

Se necesita Node.js 22 o superior. Primero hay que instalar las dependencias y configurar la variable `GEMINI_API_KEY` en un archivo `.env`.

```bash
npm install
npm run dev
```

La API queda disponible en el puerto 3000. Por ejemplo:

```bash
curl -s http://localhost:3000/analizar \
  -H "Content-Type: application/json" \
  -d '{"id":"conv-001","mensajes":[{"de":"lead","texto":"¿Tienen departamentos de 2 dormitorios? Tengo un pie de UF 900."}]}'
```

También se puede consultar `GET /health` para comprobar que el servicio está funcionando.

## Decisiones principales

Usé Gemini para leer la conversación y extraer la información relevante. La respuesta se valida con esquemas de TypeScript y Zod antes de entregarla.

Elegí separar la extracción del cálculo de prioridad. Gemini interpreta el texto, mientras que el código decide el score y el nivel de prioridad. De esta forma, las reglas comerciales quedan más fáciles de revisar y cambiar.

Los campos de salida representan lo que necesita el equipo comercial: intención de contacto, urgencia, capacidad financiera, requisitos del departamento, resumen y necesidad de derivación humana.

La regla más importante es no completar información que el lead nunca entregó, por lo que los datos extraídos incluyen una cita del mensaje original y el código comprueba que esa cita exista. Si no puede comprobarla, descarta el dato. También se instruye al modelo para que no use las respuestas del asistente como evidencia.

Consideré hacer toda la extracción con reglas y expresiones regulares, pero habría sido frágil para conversaciones más variadas. También consideré dejar que el modelo calculara directamente la prioridad, pero preferí mantener esa parte determinista para que el resultado sea más predecible.

## Casos especiales

Las consultas por arriendo, los números equivocados, los productos fuera del alcance del proyecto y los intentos de manipular las instrucciones se pueden descartar. Los reclamos se marcan para atención humana. Las consultas de subsidio también requieren revisión, porque normalmente necesitan una validación comercial.

El prompt contiene reglas para que el modelo responda solamente con el JSON esperado y no siga instrucciones que aparezcan dentro de la conversación. Además, la aplicación valida la estructura y la evidencia recibida antes de calcular la prioridad.

## Pruebas y resultados

Hay pruebas unitarias para la API, la extracción, la validación de evidencia y el cálculo de prioridad:

```bash
npm run test:unit
```

La evaluación de las diez conversaciones entregadas está en `results/conversaciones.json`. La comparación entre modelos está en `results/compareModels.json`.

El procesamiento de las diez conversaciones costó aproximadamente USD 0,075 con Gemini Flash y USD 0,009 con Flash Lite. Elegí Flash para la configuración principal porque entrega un poco más de margen en casos ambiguos y el volumen de esta prueba es pequeño.

## Deploy

El proyecto incluye `Dockerfile` y `render.yaml` para desplegarlo en Render. El servicio configurado está disponible en:

pendiente...

Para usarlo después del deploy hay que configurar `GEMINI_API_KEY` como variable secreta en Render. El plan gratuito puede suspender el servicio cuando no recibe tráfico, por lo que la primera llamada después de un tiempo puede demorar más de lo normal.

## Qué fue lo más difícil

Lo más difícil fue decidir qué casos debían considerarse oportunidades comerciales y cuáles debían descartarse. Las conversaciones mezclan consultas simples, personas que todavía están explorando, reclamos y mensajes que intentan cambiar el comportamiento del asistente.

También fue importante evitar que una respuesta aparentemente razonable terminara agregando un presupuesto o una urgencia que nunca se mencionó. Por eso preferí combinar instrucciones claras para el modelo con validaciones en el código.

## Qué mejoraría con más tiempo

Ampliaría el conjunto de conversaciones de prueba y agregaría una evaluación más sistemática de la calidad de las clasificaciones. También haría más estricta la validación numérica, para comprobar no solo que la cita exista, sino que el monto extraído coincida exactamente con el monto escrito por el lead.

Por último, revisaría los pesos de prioridad con datos reales de los ejecutivos, porque los valores actuales son razonables para los casos entregados, pero todavía no representan necesariamente el comportamiento comercial de todas las inmobiliarias.
