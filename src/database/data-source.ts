import { DataSource } from 'typeorm';

export const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USER || 'app',
  password: process.env.DB_PASSWORD || 'app',
  database: process.env.DB_DATABASE || 'perfil_litigioso',
  migrations: [__dirname + '/migrations/1738767600000-InitialSchema.js'],
  migrationsTableName: 'migrations',
});
