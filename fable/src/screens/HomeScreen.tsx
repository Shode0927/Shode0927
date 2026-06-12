// 表紙 — 傾けると揺れる星空と、今宵の一冊への入口。

import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Starfield from '../art/Starfield';
import { FONTS, INK } from '../theme';

interface Props {
  libraryCount: number;
  onWeave: () => void;
  onLibrary: () => void;
}

export default function HomeScreen({ libraryCount, onWeave, onLibrary }: Props) {
  const { width, height } = useWindowDimensions();

  const weave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onWeave();
  };

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill}>
        <Starfield width={width} height={height} />
      </View>

      <View style={styles.content}>
        <Animated.View entering={FadeInDown.duration(900).delay(150)} style={styles.titleBlock}>
          <Text style={styles.kicker}>千 夜 の 寓 話</Text>
          <Text style={styles.title}>FABLE</Text>
          <View style={styles.rule} />
          <Text style={styles.lede}>
            頁をひらくたび、世界にひとつの寓話が紡がれる。{'\n'}
            物語も、挿絵も、この端末の中で生まれて消えない。
          </Text>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(900).delay(700)} style={styles.actions}>
          <Pressable
            onPress={weave}
            style={({ pressed }) => [styles.weaveButton, pressed && styles.pressed]}
          >
            <Text style={styles.weaveLabel}>今宵の寓話を紡ぐ</Text>
          </Pressable>

          <Pressable
            onPress={onLibrary}
            style={({ pressed }) => [styles.libraryButton, pressed && styles.pressed]}
          >
            <Text style={styles.libraryLabel}>
              夜の書庫{libraryCount > 0 ? `　${libraryCount}夜` : ''}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: INK.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 140,
    paddingBottom: 84,
    paddingHorizontal: 36,
  },
  titleBlock: {
    alignItems: 'center',
  },
  kicker: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    letterSpacing: 6,
    color: INK.goldDim,
    marginBottom: 14,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 56,
    letterSpacing: 14,
    color: INK.paper,
    marginLeft: 14, // letterSpacing の右端ぶんを補正
  },
  rule: {
    width: 56,
    height: 1,
    backgroundColor: INK.goldDim,
    marginTop: 22,
    marginBottom: 22,
  },
  lede: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 24,
    color: INK.paperDim,
    textAlign: 'center',
    letterSpacing: 1,
  },
  actions: {
    alignItems: 'center',
    gap: 18,
  },
  weaveButton: {
    borderWidth: 1,
    borderColor: INK.gold,
    paddingVertical: 16,
    paddingHorizontal: 44,
    borderRadius: 2,
    backgroundColor: 'rgba(201, 168, 106, 0.08)',
  },
  weaveLabel: {
    fontFamily: FONTS.medium,
    fontSize: 17,
    letterSpacing: 4,
    color: INK.gold,
  },
  libraryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  libraryLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    letterSpacing: 2,
    color: INK.paperDim,
  },
  pressed: {
    opacity: 0.55,
  },
});
