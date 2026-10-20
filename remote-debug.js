const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const code = `
    const mr = require('/var/www/proyectos/gamboa/backend-api/dist/agente-ia/motor-reglas');
    console.log('Keys in motor-reglas:', Object.keys(mr));
    console.log('procesarConMotorDeReglas source:');
    console.log(mr.procesarConMotorDeReglas.toString().slice(0, 300));
  `;

  conn.exec(`node -e "${code.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err, stream) => {
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '169.58.82.35', port: 22, username: 'gamboa', password: 'gamboa2026' });
