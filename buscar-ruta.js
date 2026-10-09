const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const commands = `
    echo "Buscando la carpeta del proyecto..."
    find / -name "frontend-pwa" -type d 2>/dev/null
  `;

  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log('ENCONTRADO EN: ' + data);
    }).stderr.on('data', (data) => {});
  });
}).connect({
  host: '169.58.82.35',
  port: 22,
  username: 'gamboa',
  password: 'gamboa2026'
});
