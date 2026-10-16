import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function PageA() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.content}>
        <ThemedText type="title">页面 A</ThemedText>
        <ThemedText>欢迎来到 DemoA</ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
