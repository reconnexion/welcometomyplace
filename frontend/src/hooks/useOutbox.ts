import { useOutbox as useApodsOutbox } from '@activitypods/refine-hooks';

import { JSON_CONTEXT } from '../providers';

// The backend context types the `apods` and `interop` properties of the activities as IRI references
const useOutbox = () => useApodsOutbox({ jsonContext: JSON_CONTEXT });

export default useOutbox;
