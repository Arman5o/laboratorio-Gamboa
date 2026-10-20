const { Client } = require('ssh2');
const path = require('path');

const conn = new Client();

console.log('🔌 Conectando al servidor de producción 169.58.82.35...');

conn.on('ready', () => {
  console.log('✅ SSH listo. Abriendo SFTP...');

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('❌ Error SFTP:', err);
      conn.end();
      return;
    }

    const localMotor = path.join(__dirname, 'backend-api/src/agente-ia/motor-reglas.ts');
    const remoteMotor = '/var/www/proyectos/gamboa/backend-api/src/agente-ia/motor-reglas.ts';

    const localService = path.join(__dirname, 'backend-api/src/agente-ia/agente-ia.service.ts');
    const remoteService = '/var/www/proyectos/gamboa/backend-api/src/agente-ia/agente-ia.service.ts';

    const localAgente = path.join(__dirname, 'frontend-pwa/app/components/AgenteIA.tsx');
    const remoteAgente = '/var/www/proyectos/gamboa/frontend-pwa/app/components/AgenteIA.tsx';

    console.log('Subiendo motor-reglas.ts...');
    sftp.fastPut(localMotor, remoteMotor, (err1) => {
      if (err1) {
        console.error('❌ Error subiendo motor-reglas.ts:', err1);
        conn.end();
        return;
      }
      console.log('✅ motor-reglas.ts subido.');

      console.log('Subiendo agente-ia.service.ts...');
      sftp.fastPut(localService, remoteService, (err2) => {
        if (err2) {
          console.error('❌ Error subiendo agente-ia.service.ts:', err2);
          conn.end();
          return;
        }
        console.log('✅ agente-ia.service.ts subido.');

        console.log('Subiendo AgenteIA.tsx...');
        sftp.fastPut(localAgente, remoteAgente, (err3) => {
          if (err3) {
            console.error('❌ Error subiendo AgenteIA.tsx:', err3);
            conn.end();
            return;
          }
          console.log('✅ AgenteIA.tsx subido.');

          console.log('🔨 Compilando Backend y Frontend en el servidor...');
          const remoteCmd = `
            export PATH=$PATH:/home/gamboa/.nvm/versions/node/v20.18.0/bin
            cd /var/www/proyectos/gamboa/backend-api && npm run build && pm2 restart gamboa-backend
            cd /var/www/proyectos/gamboa/frontend-pwa && npm run build && pm2 restart gamboa-frontend
            pm2 list
          `;

          conn.exec(remoteCmd, (err4, stream) => {
            if (err4) {
              console.error('❌ Error exec:', err4);
              conn.end();
              return;
            }

            stream.on('close', (code, signal) => {
              console.log(`\n🔒 Proceso remoto finalizado con código: ${code}`);
              conn.end();
            }).on('data', (data) => {
              process.stdout.write(data.toString());
            }).stderr.on('data', (data) => {
              process.stderr.write(data.toString());
            });
          });
        });
      });
    });
  });
}).on('error', (err) => {
  console.error('❌ Error de conexión:', err);
}).connect({
  host: '169.58.82.35',
  port: 22,
  username: 'gamboa',
  password: 'gamboa2026'
});
