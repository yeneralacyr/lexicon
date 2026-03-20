import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, spacing } from '@/constants/theme';

export function useFloatingTabInset(extraPadding = spacing.xl) {
  const insets = useSafeAreaInsets();

  return useMemo(
    () => layout.floatingTabBarHeight + insets.bottom + extraPadding,
    [extraPadding, insets.bottom]
  );
}
