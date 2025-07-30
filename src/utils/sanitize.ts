export function removeSensitiveFields(
  obj: any,
  fields: string[] = ["password"]
): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => removeSensitiveFields(item, fields));
  } else if (obj && typeof obj === "object") {
    if (obj instanceof Date) {
      return obj;
    }
    const sanitized: any = {};
    for (const key in obj) {
      if (!fields.includes(key)) {
        sanitized[key] = removeSensitiveFields(obj[key], fields);
      }
    }
    return sanitized;
  }
  return obj;
}
