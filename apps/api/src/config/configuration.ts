export default () => ({
  port: parseInt(process.env.API_PORT ?? '3000', 10),
  webBaseUrl: process.env.WEB_BASE_URL ?? 'http://localhost:5173',
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '6432', 10),
    user: process.env.POSTGRES_USER ?? 'soulmovie_app',
    password: process.env.POSTGRES_PASSWORD ?? 'devpassword',
    database: process.env.POSTGRES_DB ?? 'soulmovie',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  settings: {
    encryptionKey: process.env.SETTINGS_ENCRYPTION_KEY!,
  },
  mail: {
    devHost: process.env.MAIL_DEV_HOST ?? 'localhost',
    devPort: parseInt(process.env.MAIL_DEV_PORT ?? '1025', 10),
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ROOT_USER ?? 'minioadmin',
    secretKey: process.env.MINIO_ROOT_PASSWORD ?? 'minioadmin',
    bucket: process.env.MINIO_BUCKET ?? 'soulmovie',
    publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT ?? 'http://localhost:9000',
  },
  bootstrap: {
    adminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@soulmovie.local',
    adminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'AdminPass123!',
  },
});
