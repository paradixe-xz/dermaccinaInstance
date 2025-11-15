module.exports = {
  development: {
    username: 'postgres',
    password: 'postgres',
    database: 'dermaccina',
    host: 'localhost',
    port: 5433,
    dialect: 'postgres',
    logging: console.log,
  },
  test: {
    username: 'postgres',
    password: 'postgres',
    database: 'dermaccina_test',
    host: 'localhost',
    port: 5433,
    dialect: 'postgres',
  },
  production: {
    username: 'postgres',
    password: 'postgres',
    database: 'dermaccina_prod',
    host: 'localhost',
    port: 5433,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};
