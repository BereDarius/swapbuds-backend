import { AppModule } from '@/app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import compression = require('compression');

async function bootstrap() {
  // Winston Logger Configuration
  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          winston.format.colorize(),
          winston.format.printf(
            ({ timestamp, level, message, context, ms }) => {
              return `${timestamp} [${context}] ${level}: ${message} ${ms}`;
            },
          ),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, {
    logger,
    bodyParser: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get('port');
  const nodeEnv = configService.get('nodeEnv');

  // Increase body size limit for file uploads (base64 encoded images)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const express = require('express');
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Global prefix
  app.setGlobalPrefix('api');

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production',
      crossOriginEmbedderPolicy: nodeEnv === 'production',
    }),
  );

  // Compression
  app.use(compression());

  // CORS
  const corsOrigin = configService.get('cors.origin');
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SWAPBUDS API')
      .setDescription('Trading platform API documentation')
      .setVersion('1.1.3')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'access-token',
      )
      .addTag('Auth', 'Authentication and authorization endpoints')
      .addTag('Users', 'User profile and account management')
      .addTag('Items', 'Item listing and management')
      .addTag('Likes', 'Like and favorite items')
      .addTag('Comments', 'Comments on items')
      .addTag('Trades', 'Trade creation and management')
      .addTag('Messages', 'Direct messaging between users')
      .addTag('Reviews', 'User reviews and ratings')
      .addTag('Notifications', 'Notification management')
      .addTag('Disputes', 'Trade dispute resolution')
      .addTag('Verification', 'ID and age verification')
      .addTag('Admin', 'Admin platform management')
      .addTag('Moderation', 'Content moderation and flags')
      .addTag('Support', 'Live support chat system')
      .addTag('Upload', 'File upload operations')
      .addTag('Cache', 'Cache monitoring and metrics')
      .addTag('Health', 'System health checks')
      .addTag('Monitoring', 'Platform monitoring and metrics')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);

  logger.log(
    `🚀 Application is running on: http://localhost:${port}/api`,
    'Bootstrap',
  );

  if (nodeEnv !== 'production') {
    logger.log(
      `📚 Swagger documentation: http://localhost:${port}/api/docs`,
      'Bootstrap',
    );
  }
}

bootstrap();
