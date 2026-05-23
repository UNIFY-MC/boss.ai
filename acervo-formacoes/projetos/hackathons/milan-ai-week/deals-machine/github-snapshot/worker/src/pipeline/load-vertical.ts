import { supabase } from '../lib/supabase';
import type { VerticalRow } from './types';

export async function loadVertical(vertical_id: string): Promise<VerticalRow> {
  const { data, error } = await supabase()
    .from('verticals')
    .select('id, slug, display_name, config')
    .eq('id', vertical_id)
    .single();
  if (error || !data) {
    throw new Error(`Vertical ${vertical_id} not found: ${error?.message ?? 'no row'}`);
  }
  return data as VerticalRow;
}
