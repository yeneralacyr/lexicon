import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/screen';
import { Card } from '@/components/ui/card';
import { palette, spacing } from '@/constants/theme';
import { getWordDetail } from '@/modules/words/words.service';
import type { WordDetail } from '@/types/word';

export default function WordDetailScreen() {
  const { wordId } = useLocalSearchParams<{ wordId: string }>();
  const [word, setWord] = useState<WordDetail | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!wordId) {
        return;
      }

      const nextWord = await getWordDetail(Number(wordId));
      if (active) {
        setWord(nextWord);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [wordId]);

  return (
    <AppScreen
      eyebrow="Word detail"
      title={word?.english ?? 'Word'}
      subtitle={word?.turkish ?? 'Loading local word detail...'}>
      {(word?.sentences ?? []).map((sentence, index) => (
        <Card key={`${word?.id ?? 'word'}-${index}`}>
          <Text style={styles.sentenceLabel}>example {index + 1}</Text>
          <Text style={styles.sentence}>{sentence}</Text>
        </Card>
      ))}

      <Card>
        <Text style={styles.sentenceLabel}>progress</Text>
        <Text style={styles.stat}>status: {word?.status ?? 'new'}</Text>
        <Text style={styles.stat}>seen: {word?.seenCount ?? 0}</Text>
        <Text style={styles.stat}>correct: {word?.correctCount ?? 0}</Text>
        <Text style={styles.stat}>wrong: {word?.wrongCount ?? 0}</Text>
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sentenceLabel: {
    color: palette.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  sentence: {
    color: palette.ink,
    fontSize: 18,
    lineHeight: 28,
  },
  stat: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 24,
  },
});
