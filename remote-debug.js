const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const remoteTest = `
    node -e "
      require('/var/www/proyectos/gamboa/backend-api/node_modules/dotenv').config({ path: '/var/www/proyectos/gamboa/backend-api/.env' });
      const http = require('http');
      const jwt = require('/var/www/proyectos/gamboa/backend-api/node_modules/jsonwebtoken');
      const secret = process.env.JWT_SECRET;
      const token = jwt.sign({ sub: '67b000000000000000000000', correo: 'paciente@gamboa.com', rol: 'paciente' }, secret);

      function post(msg, sid) {
        return new Promise((resolve, reject) => {
          const body = JSON.stringify({ mensaje: msg, rol: 'paciente', sessionId: sid });
          const req = http.request('http://localhost:3001/agente-ia/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token,
              'Content-Length': Buffer.byteLength(body)
            }
          }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
          });
          req.on('error', reject);
          req.write(body);
          req.end();
        });
      }

      async function test() {
        const sid1 = 'rec_' + Date.now();
        const r1 = await post('cuales son las recomendaciones para orina', sid1);
        console.log('RECOMENDACIONES ORINA:\\n' + r1.respuesta);

        const sid2 = 'hemo_' + Date.now();
        const r2 = await post('para que sirve el hemograma', sid2);
        console.log('\\nHEMOGRAMA:\\n' + r2.respuesta);

        const sid3 = 'prep_general_' + Date.now();
        const r3 = await post('como me preparo', sid3);
        console.log('\\nPREPARACION GENERAL:\\n' + r3.respuesta);
      }
      test().catch(console.error);
    "
  `;

  conn.exec(remoteTest, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', d => process.stdout.write(d.toString()))
          .stderr.on('data', d => process.stderr.write(d.toString()));
  });
}).connect({
  host: '169.58.82.35',
  port: 22,
  username: 'gamboa',
  password: 'gamboa2026'
});
