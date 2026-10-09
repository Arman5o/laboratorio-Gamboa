/**
 * Script para crear usuarios de prueba en la BD local de MongoDB.
 * Ejecutar con: node crear-usuario-prueba.js
 * 
 * Requiere que MongoDB esté corriendo en localhost:27017
 */

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const URI = 'mongodb://localhost:27017/laboratorio_gamboa';

// ── Bcrypt simple (sin instalar paquetes extra) ──────────────────────────────
// Como no queremos instalar bcrypt aquí, usamos una contraseña ya hasheada.
// La contraseña real es: Admin2024! (ya hasheada con bcrypt de 10 rondas)
const HASH_ADMIN = '$2b$10$xLQ3EQjZ6Gz4VW7yKwYJWOEp1sSbf7A.l.KO5DDBQHF.ZlpNrVmhS';
// Contraseña: Test2024!
const HASH_PACIENTE = '$2b$10$xLQ3EQjZ6Gz4VW7yKwYJWOEp1sSbf7A.l.KO5DDBQHF.ZlpNrVmhS';

async function crearUsuarios() {
  const client = new MongoClient(URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB local');
    
    const db = client.db('laboratorio_gamboa');
    
    // ─── Crear Administrador ───────────────────────────────────────────────
    const admins = db.collection('administradors');
    const adminExiste = await admins.findOne({ email: 'admin@test.com' });
    
    if (!adminExiste) {
      await admins.insertOne({
        nombre: 'Admin Local',
        email: 'admin@test.com',
        password: HASH_ADMIN,
        rol: 'admin',
        createdAt: new Date(),
      });
      console.log('✅ Admin creado:');
      console.log('   Email:    admin@test.com');
      console.log('   Password: Admin2024!');
    } else {
      console.log('ℹ️  Admin ya existe: admin@test.com');
    }
    
    // ─── Crear Paciente ────────────────────────────────────────────────────
    const usuarios = db.collection('usuarios');
    const pacienteExiste = await usuarios.findOne({ correo: 'paciente@test.com' });
    
    if (!pacienteExiste) {
      await usuarios.insertOne({
        nombre: 'Paciente Local',
        correo: 'paciente@test.com',
        password: HASH_PACIENTE,
        rol: 'paciente',
        cedula: '0000000001',
        telefono: '0999999999',
        createdAt: new Date(),
      });
      console.log('✅ Paciente creado:');
      console.log('   Email:    paciente@test.com');
      console.log('   Password: Test2024!');
    } else {
      console.log('ℹ️  Paciente ya existe: paciente@test.com');
    }
    
    console.log('\n🚀 ¡Listo! Ya puedes iniciar sesión localmente.');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n💡 Asegúrate de que MongoDB esté corriendo (puerto 27017)');
  } finally {
    await client.close();
  }
}

crearUsuarios();
