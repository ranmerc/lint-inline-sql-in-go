import { ExprParameter, Statement } from "pgsql-ast-parser";
import { SQLError, SQLErrorType } from "../types/SQLError";

type SemanticErrorChecker = (statement: Statement) => SQLError | undefined;

export function checkSemanticErrors(
  statement: Statement
): SQLError | undefined {
  let error: SQLError | undefined;

  if ((error = checkInsertValuesMismatch(statement))) {
    return error;
  }

  if ((error = checkMissingParameter(statement))) {
    return error;
  }
}

const checkInsertValuesMismatch: SemanticErrorChecker = (statement) => {
  if (
    statement.type === "insert" &&
    statement.insert.type === "values" &&
    statement.insert.values[0] &&
    statement.columns &&
    statement.insert.values[0].length !== statement.columns.length
  ) {
    return {
      message: `Number of parameters given to INSERT query does not match, got ${statement.insert.values[0].length}, want ${statement.columns.length}.`,
      type: SQLErrorType.InsertValuesMismatch,
    };
  }
};

const checkMissingParameter: SemanticErrorChecker = (statement) => {
  const parameters = Array.from(
    new Set(
      extractParameters(statement).map((parameter) =>
        Number(parameter.name.slice(1))
      )
    )
  ).sort((a, b) => a - b);

  for (let i = 0; i < parameters.length; i++) {
    // If any of the parameters is outside the range
    if (parameters[i] !== i + 1) {
      return {
        message: `Missing \$${i + 1} in the parameter order.`,
        type: SQLErrorType.MissingParameter,
      };
    }
  }
};

/**
 *
 * @param obj An object, preferably {@link Statement}
 * @param result For iteration purpose mostly, but can be passed, will be appended to
 * @returns An array of parameter expressions in the given Statement
 */
export function extractParameters(obj: any, result: Array<ExprParameter> = []) {
  if (obj && typeof obj === "object") {
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        const value = obj[key];

        if (value && typeof value === "object") {
          // Check if the object has type 'parameter'
          if (value.type === "parameter") {
            result.push(value);
          }
          // Recursively search within the object
          extractParameters(value, result);
        }
      }
    }
  }

  return result;
}
