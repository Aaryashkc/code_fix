const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'FRONTEND_URL'
];

const optionalEnvVars = [
  'PORT',
  'NODE_ENV',
  'JWT_EXPIRE',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX',
  'EMAIL_PORT',
  'EMAIL_FROM',
  'EMAIL_HOST',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'ESEWA_PAYMENT_URL',
  'ESEWA_STATUS_URL',
  'ESEWA_SECRET_KEY',
  'ESEWA_PRODUCT_CODE',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'AI_PROVIDER',
  'OPENROUTER_API_KEY',
  'OPENROUTER_MODEL',
  'OPENROUTER_BASE_URL',
  'OPENROUTER_HTTP_REFERER',
  'OPENROUTER_APP_NAME',
  'OLLAMA_BASE_URL',
  'OLLAMA_MODEL',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'OPENAI_BASE_URL'
];

function validateEnv() {
  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease check your .env file or environment configuration.');
    console.error('See .env.example for required variables.');
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must be at least 32 characters long for security.');
    process.exit(1);
  }

  if (!process.env.MONGODB_URI.startsWith('mongodb')) {
    console.error('MONGODB_URI must be a valid MongoDB connection string.');
    process.exit(1);
  }

  const defaults = {
    PORT: '5000',
    NODE_ENV: 'development',
    JWT_EXPIRE: '7d',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX: '100',
    EMAIL_PORT: '587',
    EMAIL_FROM: 'noreply@yatra.com',
    ESEWA_PAYMENT_URL: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
    ESEWA_STATUS_URL: 'https://uat.esewa.com.np/api/epay/transaction/status/',
    AI_PROVIDER: 'auto',
    OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
    OPENROUTER_APP_NAME: 'Yatra',
    OLLAMA_BASE_URL: 'http://localhost:11434/v1',
    OLLAMA_MODEL: 'llama3.1:8b'
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  const missingOptionalWithoutDefaults = optionalEnvVars.filter(
    (envVar) => !process.env[envVar] && !Object.prototype.hasOwnProperty.call(defaults, envVar)
  );

  if (missingOptionalWithoutDefaults.length > 0) {
    console.warn(`Optional integrations not configured: ${missingOptionalWithoutDefaults.join(', ')}`);
  }

  console.log('Environment variables validated successfully');
}

module.exports = { validateEnv };
