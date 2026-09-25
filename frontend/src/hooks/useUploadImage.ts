import { useCallback } from 'react';
import { fetchJson, resolveContainerUri } from '@activitypods/refine-providers/utils';

import { authProvider } from '../providers';

/** Upload a raw file to the user's Pod, returning its URL.
 *
 * The `File` shape tree (granted via the `apods:ReadWrite` File access need in
 * `app.service.js`) is intentionally non-RDF (`st:expectsType st:NonRDFResource`, no SHACL
 * shape) — so it has no `sh:targetClass` to resolve a type from, and the usual
 * `shapeTreeUri`-based container lookup doesn't apply. The Pod's type index instead registers
 * this container's `solid:forClass` from the container service's plain `acceptedTypes` setting,
 * which for `files.ts` is the conventional `semapps:File` class — so that's what we look up by,
 * matching how `@semapps/semantic-data-provider`'s own `uploadFile` resolves it. */
const useUploadImage = () => {
  return useCallback(async (file: File): Promise<string> => {
    const session = authProvider.getSession();
    if (!session) throw new Error('Not authenticated');

    const containerUri = await resolveContainerUri(
      'file',
      { types: ['http://semapps.org/ns/core#File'] },
      session.webId,
      session.token,
      ['https://www.w3.org/ns/activitystreams']
    );

    const { headers } = await fetchJson(
      containerUri,
      { method: 'POST', body: file, headers: { 'Content-Type': file.type } },
      session.token
    );

    const location = headers.get('Location');
    if (!location) throw new Error('The Pod did not return a Location header when uploading the file');
    return location;
  }, []);
};

export default useUploadImage;
