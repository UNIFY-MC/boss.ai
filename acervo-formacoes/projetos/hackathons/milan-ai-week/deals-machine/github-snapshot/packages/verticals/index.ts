export * from './schema';
export { flyfx } from './flyfx';
export { aiSaas } from './ai-saas';

import { flyfx } from './flyfx';
import { aiSaas } from './ai-saas';
import type { SeededVertical } from './schema';

export const seededVerticals: SeededVertical[] = [flyfx, aiSaas];

export function findSeededVertical(slug: string): SeededVertical | undefined {
  return seededVerticals.find((v) => v.slug === slug);
}
