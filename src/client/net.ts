// Typed fetch wrappers over /api/* — the single place client code talks to the server.

import type { InitResponse } from '../shared/types';

export const fetchInit = async (): Promise<InitResponse> => {
  const response = await fetch('/api/init');
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return (await response.json()) as InitResponse;
};
