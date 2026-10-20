const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const code = `
    const { procesarConMotorDeReglas } = require('/var/www/proyectos/gamboa/backend-api/dist/agente-ia/motor-reglas');
    
    console.log('--- TEST 1: PRECIO ---');
    let r1 = procesarConMotorDeReglas('cuanto cuesta un analisis', { turno: 0 }, new Date());
    console.log('Respuesta Precio:', r1.respuesta);

    console.log('\\n--- TEST 2: HORA \"La cinco de la tarde\" ---');
    let ctx = { turno: 1, citaSlots: { examen: 'Análisis de Sangre (Rutina)', fecha: '2026-10-25' }, temaActual: 'cita' };
    let r2 = procesarConMotorDeReglas('La cinco de la tarde', ctx);
    console.log('Accion:', r2.accion, '| Hora:', r2.citaSlots ? r2.citaSlots.hora : 'none');
    console.log('Respuesta:', r2.respuesta);

    console.log('\\n--- TEST 3: HORA \"Que sea a las 4\" ---');
    let ctx3 = { turno: 1, citaSlots: { examen: 'Análisis de Sangre (Rutina)', fecha: '2026-10-25' }, temaActual: 'cita' };
    let r3 = procesarConMotorDeReglas('Que sea a las 4', ctx3);
    console.log('Accion:', r3.accion, '| Hora:', r3.citaSlots ? r3.citaSlots.hora : 'none');
    console.log('Respuesta:', r3.respuesta);
  `;

  conn.exec(`node -e "${code.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err, stream) => {
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '169.58.82.35', port: 22, username: 'gamboa', password: 'gamboa2026' });
