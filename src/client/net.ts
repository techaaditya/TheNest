// Typed fetch wrappers over /api/* — the single place client code talks to the server.

import type {
  ActivityResponse,
  CareActionErrorResponse,
  CareActionRequest,
  CareActionResponse,
  CareActionType,
  InitResponse,
  WhyResponse,
} from '../shared/types';

export const fetchInit = async (): Promise<InitResponse> => {
  const response = await fetch('/api/init');
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return (await response.json()) as InitResponse;
};

export const fetchActivity = async (): Promise<ActivityResponse> => {
  const response = await fetch('/api/activity');
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return (await response.json()) as ActivityResponse;
};

export const fetchWhy = async (): Promise<WhyResponse> => {
  const response = await fetch('/api/why');
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return (await response.json()) as WhyResponse;
};

export const postCareAction = async (
  actionType: CareActionType
): Promise<CareActionResponse | CareActionErrorResponse> => {
  const response = await fetch('/api/care-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionType } satisfies CareActionRequest),
  });
  const data = (await response.json()) as
    | CareActionResponse
    | CareActionErrorResponse;
  return data;
};
