const { Client } = require('ssh2');

const conn = new Client();

console.log('🔌 Conectando al servidor...');

conn.on('ready', () => {
  console.log('✅ Conectado exitosamente. Ejecutando actualización...');
  
  // Vamos a usar git stash para evitar errores si el admin modificó algo, luego git pull, luego build y reiniciar
  const commands = `
    cd ~/pwa-laboratorio-gamboa || cd /var/www/pwa-laboratorio-gamboa
    echo "⬇️  Descargando cambios (git pull)..."
    git stash
    git pull
    
    echo "📦 Instalando dependencias y compilando Frontend..."
    cd frontend-pwa
    npm install
    npm run build
    
    echo "⚙️ Instalando dependencias y compilando Backend..."
    cd ../backend-api
    npm install
    npm run build
    
    echo "🔄 Reiniciando servidor web..."
    pm2 restart all
    echo "🎉 PROCESO COMPLETADO EXITOSAMENTE"
  `;

  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log('🔒 Conexión cerrada.');
      conn.end();
    }).on('data', (data) => {
      console.log('' + data);
    }).stderr.on('data', (data) => {
      console.error('⚠️ ' + data);
    });
  });
}).connect({
  host: '169.58.82.35',
  port: 22,
  username: 'gamboa',
  password: 'gamboa2026'
});

conn.on('error', (err) => {
  console.error('❌ Error de conexión:', err.message);
});
