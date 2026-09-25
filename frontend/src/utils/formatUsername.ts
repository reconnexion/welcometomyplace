/** Mastodon-style `@user@host` handle for a WebID URI, e.g. `https://alice.pod.org/alice#i` -> `@alice@pod.org`. */
export const formatUsername = (uri: string): string => {
  const url = new URL(uri);
  const username = url.pathname.split('/')[1];
  return `@${username}@${url.host}`;
};
