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

    const filesToUpload = [
      { local: path.join(__dirname, 'backend-api/src/agente-ia/motor-reglas.ts'), remote: '/var/www/proyectos/gamboa/backend-api/src/agente-ia/motor-reglas.ts' },
      { local: path.join(__dirname, 'backend-api/src/agente-ia/agente-ia.service.ts'), remote: '/var/www/proyectos/gamboa/backend-api/src/agente-ia/agente-ia.service.ts' },
      { local: path.join(__dirname, 'backend-api/src/citas/citas.service.ts'), remote: '/var/www/proyectos/gamboa/backend-api/src/citas/citas.service.ts' },
      { local: path.join(__dirname, 'frontend-pwa/app/components/AgenteIA.tsx'), remote: '/var/www/proyectos/gamboa/frontend-pwa/app/components/AgenteIA.tsx' },
      { local: path.join(__dirname, 'frontend-pwa/app/dashboard-paciente/resultados/page.tsx'), remote: '/var/www/proyectos/gamboa/frontend-pwa/app/dashboard-paciente/resultados/page.tsx' },
    ];

    let uploadIndex = 0;
    const uploadNext = () => {
      if (uploadIndex >= filesToUpload.length) {
        console.log('✅ Todos los archivos subidos exitosamente.');
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
        return;
      }

      const item = filesToUpload[uploadIndex++];
      console.log(`Subiendo ${path.basename(item.local)}...`);
      sftp.fastPut(item.local, item.remote, (err) => {
        if (err) {
          console.error(`❌ Error subiendo ${item.local}:`, err);
          conn.end();
          return;
        }
        console.log(`✅ ${path.basename(item.local)} subido.`);
        uploadNext();
      });
    };

    uploadNext();
  });
}).on('error', (err) => {
  console.error('❌ Error de conexión:', err);
}).connect({
  host: '169.58.82.35',
  port: 22,
  username: 'gamboa',
  password: 'gamboa2026'
});
