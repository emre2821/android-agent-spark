/**
 * Database utility functions for dynamic SQL generation
 */

/**
 * Build dynamic UPDATE statement components
 * @param {Object} data - Object with fields to update
 * @param {Object} fieldMappings - Map of field names to SQL column names (optional)
 * @returns {Object} Object with fields array and values array
 */
export function buildUpdateFields(data, fieldMappings = {}) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const columnName = fieldMappings[key] || key;
      fields.push(`${columnName} = ?`);
      values.push(value);
    }
  }

  return { fields, values };
}

/**
 * Transform database row from snake_case to camelCase
 * @param {Object} row - Database row object
 * @param {Object} fieldMappings - Map of snake_case to camelCase field names
 * @returns {Object} Transformed object with camelCase fields
 */
export function mapRow(row, fieldMappings) {
  if (!row) return null;
  
  const result = {};
  for (const [snakeCase, camelCase] of Object.entries(fieldMappings)) {
    if (snakeCase in row) {
      result[camelCase] = row[snakeCase];
    }
  }
  
  return result;
}
