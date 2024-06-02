export enum SQLErrorType {
  /**
   * When there's a error with SQL syntax.
   */
  Syntax = 0,
  /**
   * When number of columns and insert into parameters mismatch.
   *
   * Example -
   * ```sql
   * INSERT INTO "User" ("ID", "Name") VALUES ($1);
   * ```
   */
  InsertValuesMismatch = 1,
  /**
   * When parameters are missing in order (overshoot).
   *
   * Example -
   * ```sql
   * INSERT INTO "User" ("ID", "USERS") VALUES ($1, $3)
   * ```
   */
  MissingParameter = 2,
}

export type SQLError = {
  type: SQLErrorType;
  message: string;
};
