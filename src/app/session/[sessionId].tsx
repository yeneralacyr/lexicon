import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/screen';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { palette, spacing } from '@/constants/theme';
import { completeSession, getSessionDetail } from '@/modules/sessions/sessions.service';
import type { SessionDetail } from '@/types/session';

export default function SessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!sessionId) {
        return;
      }

      const nextSession = await getSessionDetail(sessionId);
      if (active) {
        setSession(nextSession);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [sessionId]);

  async function handleComplete() {
    if (!sessionId) {
      return;
    }

    await completeSession(sessionId);
    router.push(`/session/complete?sessionId=${sessionId}`);
  }

  return (
    <AppScreen
      eyebrow="Generated queue"
      title="Session"
      subtitle="A lightweight V1 session shell generated from due and new words.">
      <Card>
        <Text style={styles.statLabel}>session id</Text>
        <Text style={styles.statValue}>{session?.id ?? sessionId ?? 'missing'}</Text>
        <Text style={styles.body}>
          {session?.totalItems ?? 0} items are queued. The next iteration can replace this screen
          with card-by-card review.
        </Text>
      </Card>

      {session?.items.map((item) => (
        <Card key={item.id}>
          <Text style={styles.word}>{item.english}</Text>
          <Text style={styles.body}>{item.turkish}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.statLabel}>{item.promptType}</Text>
            <Text style={styles.statLabel}>#{item.orderIndex + 1}</Text>
          </View>
        </Card>
      ))}

      <PrimaryButton
        label="Complete session"
        onPress={() => {
          void handleComplete();
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statLabel: {
    color: palette.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  body: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  word: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
});
