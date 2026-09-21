'use client';

import { useLocale } from '@/components/shared/locale-provider';
import { getStaffDictionary } from '@/lib/i18n/staff';

export function useStaffDictionary() {
  return getStaffDictionary(useLocale().locale);
}
