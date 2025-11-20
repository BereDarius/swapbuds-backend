"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const compression = require("compression");
const helmet_1 = require("helmet");
const nest_winston_1 = require("nest-winston");
const winston = require("winston");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = nest_winston_1.WinstonModule.createLogger({
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(winston.format.timestamp(), winston.format.ms(), winston.format.colorize(), winston.format.printf(({ timestamp, level, message, context, ms }) => {
                    return `${timestamp} [${context}] ${level}: ${message} ${ms}`;
                })),
            }),
            new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            }),
            new winston.transports.File({
                filename: 'logs/combined.log',
                format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            }),
        ],
    });
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger,
    });
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('port');
    const nodeEnv = configService.get('nodeEnv');
    app.setGlobalPrefix('api');
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: nodeEnv === 'production',
        crossOriginEmbedderPolicy: nodeEnv === 'production',
    }));
    app.use(compression());
    const corsOrigin = configService.get('cors.origin');
    app.enableCors({
        origin: corsOrigin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    if (nodeEnv !== 'production') {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('SWAPBUDS API')
            .setDescription('Trading platform API documentation')
            .setVersion('1.0')
            .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'Authorization',
            description: 'Enter JWT token',
            in: 'header',
        }, 'access-token')
            .addTag('auth', 'Authentication endpoints')
            .addTag('users', 'User management')
            .addTag('items', 'Item management')
            .addTag('trades', 'Trade operations')
            .addTag('messages', 'Messaging')
            .addTag('reviews', 'Review system')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true,
            },
        });
    }
    app.enableShutdownHooks();
    await app.listen(port);
    logger.log(`🚀 Application is running on: http://localhost:${port}/api`, 'Bootstrap');
    if (nodeEnv !== 'production') {
        logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`, 'Bootstrap');
    }
}
bootstrap();
//# sourceMappingURL=main.js.map