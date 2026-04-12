"""SQL AST validation via sqlglot and MongoDB operator whitelist."""

import logging

import sqlglot
from sqlglot import exp

logger = logging.getLogger(__name__)

# Allowed SQL statement types
_ALLOWED_SQL_TYPES = (
    exp.Select,
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Union,
)

# Blocked SQL expression types (DDL and dangerous operations)
_BLOCKED_SQL_TYPES = (
    exp.Drop,
    exp.Create,
    exp.Alter,
    exp.AlterColumn,
    exp.Command,
    exp.Transaction,
    exp.Commit,
    exp.Rollback,
    exp.TruncateTable,
)

# Blocked SQL keywords (checked in raw text as fallback)
_BLOCKED_SQL_KEYWORDS = {
    "TRUNCATE",
    "EXEC",
    "EXECUTE",
    "XP_CMDSHELL",
    "COPY",
    "GRANT",
    "REVOKE",
    "SET ROLE",
}

# Blocked MongoDB operators
_BLOCKED_MONGO_OPERATORS = {
    "$where",
    "$function",
    "$accumulator",
    "$eval",
    "$expr.$function",
}


class QueryValidationError(Exception):
    """Raised when a query fails validation."""

    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


def validate_sql(query: str) -> None:
    """Validate a SQL query using sqlglot AST parsing.

    Raises QueryValidationError if the query contains disallowed operations.
    """
    # Check raw text for blocked keywords that might not parse into AST nodes
    upper = query.upper()
    for keyword in _BLOCKED_SQL_KEYWORDS:
        if keyword in upper:
            raise QueryValidationError(f"Blocked SQL keyword: {keyword}")

    try:
        parsed = sqlglot.parse(query, dialect="postgres")
    except sqlglot.errors.ParseError as e:
        raise QueryValidationError(f"SQL parse error: {e}")

    if not parsed:
        raise QueryValidationError("Empty query")

    for statement in parsed:
        if statement is None:
            continue

        # Check top-level statement type
        if not isinstance(statement, _ALLOWED_SQL_TYPES):
            raise QueryValidationError(
                f"Statement type not allowed: {type(statement).__name__}"
            )

        # Walk the AST and check for blocked node types
        for node in statement.walk():
            if isinstance(node, _BLOCKED_SQL_TYPES):
                raise QueryValidationError(
                    f"Blocked operation: {type(node).__name__}"
                )

    logger.debug("SQL query validated: %s", query[:80])


def validate_mongo(operation: dict) -> None:
    """Validate a MongoDB operation dict for blocked operators.

    Raises QueryValidationError if blocked operators are found.
    """
    allowed_ops = {
        "find", "aggregate", "insertOne", "insertMany",
        "deleteOne", "deleteMany", "updateOne", "updateMany",
    }

    op_type = operation.get("operation", "")
    if op_type not in allowed_ops:
        raise QueryValidationError(f"MongoDB operation not allowed: {op_type}")

    # Recursively check all keys in the operation for blocked operators
    _check_mongo_keys(operation)

    logger.debug("MongoDB query validated: %s", op_type)


def _check_mongo_keys(obj: object) -> None:
    """Recursively check dict/list for blocked MongoDB operators."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key in _BLOCKED_MONGO_OPERATORS:
                raise QueryValidationError(f"Blocked MongoDB operator: {key}")
            _check_mongo_keys(value)
    elif isinstance(obj, list):
        for item in obj:
            _check_mongo_keys(item)
