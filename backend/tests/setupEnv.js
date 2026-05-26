// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.JWT_SECRET = 'test-super-secret-jwt-key-min-32-characters-long';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.EMAIL_HOST = 'smtp.test.com';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASSWORD = 'test-password';
process.env.EMAIL_FROM = 'noreply@yatra.test';
process.env.ESEWA_SECRET_KEY = 'test-esewa-secret-key';
process.env.ESEWA_PRODUCT_CODE = 'test-esewa-product-code';
process.env.ESEWA_PAYMENT_URL = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
process.env.ESEWA_STATUS_URL = 'https://rc.esewa.com.np/api/epay/transaction/status/';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-api-key';
process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
