/**
 * Application Configuration
 *
 * Centralizes all environment variables and configuration settings.
 * Uses NestJS ConfigModule to load and validate environment variables.
 *
 * @returns Configuration object with all app settings
 */
export default () => ({
  // Server configuration
  port: parseInt(process.env.PORT, 10) || 3001, // Port the server listens on
  nodeEnv: process.env.NODE_ENV || 'development', // Current environment (development/production)

  // Database connection settings
  database: {
    url: process.env.DATABASE_URL, // PostgreSQL connection string
  },

  // JWT authentication settings
  jwt: {
    secret: process.env.JWT_SECRET, // Secret key for signing tokens
    expiresIn: process.env.JWT_EXPIRATION || '24h', // Token expiration time
  },

  // Cloudinary image storage settings
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME, // Cloudinary account name
    apiKey: process.env.CLOUDINARY_API_KEY, // API key for authentication
    apiSecret: process.env.CLOUDINARY_API_SECRET, // API secret for authentication
  },

  // Redis cache settings
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379', // Redis connection URL
  },

  // CORS (Cross-Origin Resource Sharing) settings
  cors: {
    // Support multiple frontend origins (user frontend + admin frontend)
    // In production: https://app.swapbuds.com,https://admin.swapbuds.com
    // In development: localhost:5173 (SvelteKit), localhost:4200 (Angular), localhost:3000 (Next.js legacy)
    origin:
      process.env.CORS_ORIGINS ||
      'http://localhost:3000,http://localhost:5173,http://localhost:4200',
    credentials: true, // Allow cookies and authorization headers (required for HTTP-only cookies)
  },

  // Rate limiting settings (prevents API abuse)
  throttle: {
    ttl: 60000, // Time window in milliseconds (1 minute)
    limit: 100, // Maximum requests per time window (100 requests/minute)
  },

  // reCAPTCHA v3 bot protection settings
  recaptcha: {
    secretKey: process.env.RECAPTCHA_SECRET_KEY, // Secret key from Google reCAPTCHA
    verifyUrl:
      process.env.RECAPTCHA_VERIFY_URL ||
      'https://www.google.com/recaptcha/api/siteverify', // Google verification endpoint
    minScore: parseFloat(process.env.RECAPTCHA_MIN_SCORE) || 0.5, // Minimum acceptable score (0.0-1.0)
  },

  // OAuth provider settings
  oauth: {
    // Google OAuth
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3001/api/auth/google/callback',
    },
    // Facebook OAuth
    facebook: {
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET,
      callbackUrl:
        process.env.FACEBOOK_CALLBACK_URL ||
        'http://localhost:3001/api/auth/facebook/callback',
    },
    // Apple OAuth
    apple: {
      clientId: process.env.APPLE_CLIENT_ID, // Service ID from Apple
      teamId: process.env.APPLE_TEAM_ID, // 10-character Team ID
      keyId: process.env.APPLE_KEY_ID, // 10-character Key ID
      privateKey: process.env.APPLE_PRIVATE_KEY, // Private key content or path
      callbackUrl:
        process.env.APPLE_CALLBACK_URL ||
        'http://localhost:3001/api/auth/apple/callback',
    },
  },
});
