import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Toma el correo del archivo .env
        pass: process.env.EMAIL_PASS, // Toma la clave del archivo .env
      },
    });
  }

  async enviarNotificacion(destino: string, asunto: string, mensajeHtml: string) {
    return await this.transporter.sendMail({
      from: `"Laboratorio Gamboa" <${process.env.EMAIL_USER}>`,
      to: destino, // <-- ESTO ES DINÁMICO: siempre usa el correo que viene de la BD
      subject: asunto,
      html: mensajeHtml,
    });
  }
}