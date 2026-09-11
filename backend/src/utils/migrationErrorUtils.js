function shouldSkipMigrationError(err) {
  if (!err) {
    return false;
  }

  const message = [err.sqlMessage, err.message].filter(Boolean).join(" ").toLowerCase();
  const code = [err.code, err.errno, err.sqlState].filter(Boolean).map(String);

  const isDuplicateColumnError =
    code.some((value) => value === "1060" || value.toLowerCase() === "er_dup_fieldname") ||
    /duplicate column/i.test(message);

  return isDuplicateColumnError;
}

module.exports = {
  shouldSkipMigrationError,
};
