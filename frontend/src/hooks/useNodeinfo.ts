import { useQuery } from '@tanstack/react-query';

type NodeInfoLinks = { links: { rel: string; href: string }[] };
type NodeInfo = { metadata?: { frontend_url?: string; [key: string]: any } };

const NODEINFO_REL = 'http://nodeinfo.diaspora.software/ns/schema/2.1';

/** Discover a Pod provider's own metadata (notably its `frontend_url`) via the standard
 *  nodeinfo protocol: `/.well-known/nodeinfo` links to the actual versioned document. */
const useNodeinfo = (host?: string) => {
  return useQuery({
    queryKey: ['nodeinfo', host],
    queryFn: async () => {
      // A host with a port is almost certainly a local dev instance, not a real HTTPS deployment.
      const protocol = host!.includes(':') ? 'http' : 'https';
      const linksResponse = await fetch(`${protocol}://${host}/.well-known/nodeinfo`);
      const links: NodeInfoLinks = await linksResponse.json();

      const link = links.links?.find(l => l.rel === NODEINFO_REL);
      if (!link) return undefined;

      const nodeinfoResponse = await fetch(link.href);
      return (await nodeinfoResponse.json()) as NodeInfo;
    },
    enabled: !!host,
    staleTime: 60 * 60 * 1000,
    retry: false
  });
};

export default useNodeinfo;
