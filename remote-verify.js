const http = require('http');

function postChat(mensaje, extra = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      mensaje,
      rol: 'paciente',
      sessionId: 'test_verify_' + Date.now(),
      ...extra
    });

    const req = http.request({
      hostname: '169.58.82.35',
      port: 3001,
      path: '/api/agente-ia/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 VERIFICACIÓN REMOTA EN PRODUCCIÓN (169.58.82.35)...\n');

  // Test 1: Solicitud de análisis múltiples
  console.log('=== TEST 1: "analisis de sangre y orina" ===');
  const r1 = await postChat('analisis de sangre y orina');
  console.log('Intencion:', r1.intencion);
  console.log('Accion:', r1.accion);
  console.log('Examen detectado:', r1.citaSlots?.examen);
  console.log('Respuesta:\n' + r1.respuesta);

  // Test 2: Cita con fecha y hora para ver el resumen completo con recomendaciones
  console.log('\n=== TEST 2: Flujo completo con fecha y hora ===');
  const sid = 'multi_' + Date.now();
  await postChat('analisis de sangre y orina', { sessionId: sid });
  await postChat('mañana', { sessionId: sid });
  const r2 = await postChat('08:30', { sessionId: sid });
  console.log('Accion:', r2.accion);
  console.log('Examen final:', r2.citaSlots?.examen);
  console.log('Recomendaciones recibidas en slots:', r2.citaSlots?.recomendaciones?.length);
  console.log('Resumen con recomendaciones:\n' + r2.respuesta);

  // Test 3: Pregunta sobre recomendaciones directamente
  console.log('\n=== TEST 3: "cuales son las recomendaciones para analisis de orina" ===');
  const r3 = await postChat('cuales son las recomendaciones para analisis de orina');
  console.log('Respuesta:\n' + r3.respuesta);

  // Test 4: Conocimiento del área (para qué sirve)
  console.log('\n=== TEST 4: "para que sirve el hemograma" ===');
  const r4 = await postChat('para que sirve el hemograma');
  console.log('Respuesta:\n' + r4.respuesta);

  // Test 5: Precios en Bolivianos y Contacto 71772118
  console.log('\n=== TEST 5: Precios y Contacto ===');
  const r5 = await postChat('cuanto cuesta un examen de sangre');
  console.log('Precios:\n' + r5.respuesta);
  const r6 = await postChat('cual es el contacto del encargado');
  console.log('Contacto:\n' + r6.respuesta);
}

runTests().catch(console.error);
