export function publicPath(path) {
  if (!path || /^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith('data:')) {
    return path;
  }

  const baseUrl = import.meta.env.BASE_URL ?? '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

  return `${normalizedBase}${normalizedPath}`;
}
