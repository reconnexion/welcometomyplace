/** Join a base URL and a path segment, avoiding duplicated or missing slashes. */
const urlJoin = (base: string, path: string): string => `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

export default urlJoin;
