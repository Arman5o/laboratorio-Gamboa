process.env.TZ = 'America/La_Paz';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// Importamos el body-parser para manipular los límites
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitamos CORS para que el frontend pueda conectarse desde cualquier origen
  app.enableCors({ origin: '*' });

  // Aumentamos el límite a 50 Megabytes para poder recibir los PDFs en Base64
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  const PORT = process.env.PORT || 3001;
  await app.listen(PORT, '0.0.0.0');
  console.log(`Backend corriendo en puerto ${PORT}`);
}
bootstrap();