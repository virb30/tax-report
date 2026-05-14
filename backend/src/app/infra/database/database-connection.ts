import knexModule, { type Knex } from 'knex';

export interface DatabaseConfig {
  sqlitePath: string;
}

type SqliteConnection = {
  pragma: (command: string) => void;
};

type AfterCreateDone = (error: Error | null, connection: unknown) => void;

function applySqlitePragmas(connection: unknown): void {
  const sqliteConnection = connection as SqliteConnection;
  sqliteConnection.pragma('foreign_keys = ON');
}

export function getDatabasePath(config: DatabaseConfig): string {
  return config.sqlitePath;
}

export function createDatabaseConnection(databasePath: string): Knex {
  return knexModule({
    client: 'better-sqlite3',
    useNullAsDefault: true,
    connection: {
      filename: databasePath,
    },
    pool: {
      min: 1,
      max: 1,
      afterCreate(connection: unknown, done: AfterCreateDone) {
        applySqlitePragmas(connection);
        done(null, connection);
      },
    },
  });
}
