import { router } from 'expo-router';
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { darkPalette, fontFamilies, spacing } from '@/constants/theme';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage: string | null;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  private handleRecover = () => {
    this.setState({ hasError: false, errorMessage: null });

    try {
      router.replace('/today');
    } catch {
      // Router may not be ready — state reset is enough to re-render children.
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.eyebrow}>BEKLENMEYEN HATA</Text>
          <Text style={styles.title}>Bir şeyler ters gitti.</Text>
          <Text style={styles.message}>
            {this.state.errorMessage ?? 'Bilinmeyen bir hata oluştu.'}
          </Text>
          <Pressable
            onPress={this.handleRecover}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>Ana Sayfaya Dön</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const colors = darkPalette;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    gap: spacing.md,
  },
  eyebrow: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.2,
    color: colors.error,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 28,
    lineHeight: 32,
    color: colors.ink,
  },
  message: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
    maxWidth: 400,
  },
  button: {
    marginTop: spacing.lg,
    minHeight: 52,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 2.2,
    color: colors.background,
    textTransform: 'uppercase',
  },
});
