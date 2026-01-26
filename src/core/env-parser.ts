import { EnvironmentVariable } from './types';

/**
 * Parses a .env file content and returns an array of environment variables
 * Supports:
 * - KEY=value format
 * - Quoted values (single and double quotes)
 * - Comments (lines starting with #)
 * - Empty lines (ignored)
 * - Whitespace trimming
 * 
 * @param content The content of the .env file
 * @returns Array of EnvironmentVariable objects
 */
export function parseEnvFile(content: string): EnvironmentVariable[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const variables: EnvironmentVariable[] = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      continue;
    }

    // Skip comment lines
    if (line.startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE format
    const equalIndex = line.indexOf('=');
    if (equalIndex === -1) {
      // No equals sign found, skip this line
      continue;
    }

    const key = line.substring(0, equalIndex).trim();
    let value = line.substring(equalIndex + 1).trim();

    // Skip if key is empty
    if (!key) {
      continue;
    }

    // Handle quoted values
    if (value.length >= 2) {
      const firstChar = value[0];
      const lastChar = value[value.length - 1];

      // Double quotes
      if (firstChar === '"' && lastChar === '"') {
        value = value.slice(1, -1);
        // Unescape escaped quotes and newlines
        value = value.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r');
      }
      // Single quotes
      else if (firstChar === "'" && lastChar === "'") {
        value = value.slice(1, -1);
        // Unescape escaped quotes and newlines
        value = value.replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\r/g, '\r');
      }
    }

    variables.push({ key, value });
  }

  return variables;
}
