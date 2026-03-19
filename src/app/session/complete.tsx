import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/screen';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { palette } from '@/constants/theme';

export default function SessionCompleteScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();

  return (
    <AppScreen
      eyebrow="Session finished"
      title="Complete"
      subtitle="The session record was closed locally and is ready for richer summaries later.">
      <Card>
        <Text style={styles.body}>Completed session: {sessionId ?? 'unknown'}</Text>
      </Card>
      <PrimaryButton
        label="Back to today"
        onPress={() => {
          router.replace('/(tabs)/today');
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 24,
  },
});
