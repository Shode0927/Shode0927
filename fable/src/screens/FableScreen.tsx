// 寓話の頁 — 生成された挿絵の下で、物語が一文字ずつ立ち上がる。

import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Fable } from '../engine/fable';
import FableScene from '../art/FableScene';
import InkText from '../components/InkText';
import { FONTS, INK, PALETTES } from '../theme';

interface Props {
  fable: Fable;
  /** 紡ぎたての夜か(演出あり)、書庫からの再訪か(即表示) */
  fresh: boolean;
  onWeaveAgain: () => void;
  onClose: () => void;
}

export default function FableScreen({ fable, fresh, onWeaveAgain, onClose }: Props) {
  const { width } = useWindowDimensions();
  const [bodyDone, setBodyDone] = useState(!fresh);
  const pal = PALETTES[fable.themeId];

  useEffect(() => {
    setBodyDone(!fresh);
  }, [fable.id, fresh]);

  const share = async () => {
    Haptics.selectionAsync().catch(() => {});
    const text = [
      `『${fable.title}』 — 第${fable.night}夜`,
      '',
      ...fable.body,
      '',
      `むすび ——「${fable.moral}」`,
      '',
      '(FABLE 千夜の寓話)',
    ].join('\n');
    try {
      await Share.share({ message: text });
    } catch {
      // 共有を閉じただけ
    }
  };

  const again = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onWeaveAgain();
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View>
          <FableScene
            width={width}
            height={Math.round(width * 0.92)}
            seed={fable.seed}
            themeId={fable.themeId}
          />
          <View style={styles.sceneFooter}>
            <Text style={styles.night}>第{fable.night}夜</Text>
            <View style={[styles.seal, { borderColor: pal.spirit }]}>
              <Text style={[styles.sealKanji, { color: pal.spirit }]}>{fable.themeKanji}</Text>
            </View>
          </View>
        </View>

        <View style={styles.page}>
          <Animated.Text entering={fresh ? FadeInDown.duration(800) : FadeIn.duration(1)} style={styles.title}>
            {fable.title}
          </Animated.Text>
          <View style={styles.rule} />

          <InkText paragraphs={fable.body} instant={!fresh} onDone={() => setBodyDone(true)} />

          {bodyDone && (
            <Animated.View entering={FadeIn.duration(1200).delay(fresh ? 350 : 0)} style={styles.moralBlock}>
              <Text style={styles.moralMark}>むすび</Text>
              <Text style={styles.moral}>{fable.moral}</Text>
            </Animated.View>
          )}

          {bodyDone && (
            <Animated.View entering={FadeIn.duration(900).delay(fresh ? 1100 : 0)} style={styles.actions}>
              <Pressable onPress={again} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
                <Text style={styles.primaryLabel}>もう一夜</Text>
              </Pressable>
              <Pressable onPress={share} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <Text style={styles.secondaryLabel}>分かち合う</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      <Pressable onPress={onClose} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <Text style={styles.backLabel}>⟨ 戻る</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: INK.bg,
  },
  scroll: {
    paddingBottom: 72,
  },
  sceneFooter: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  night: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    letterSpacing: 3,
    color: 'rgba(255, 255, 255, 0.82)',
  },
  seal: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealKanji: {
    fontFamily: FONTS.bold,
    fontSize: 17,
  },
  page: {
    paddingHorizontal: 28,
    paddingTop: 30,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 23,
    lineHeight: 36,
    letterSpacing: 1.5,
    color: INK.paper,
  },
  rule: {
    width: 44,
    height: 1,
    backgroundColor: INK.goldDim,
    marginTop: 16,
    marginBottom: 26,
  },
  moralBlock: {
    marginTop: 14,
    marginBottom: 8,
    paddingVertical: 20,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: INK.hairline,
    borderRadius: 2,
    alignItems: 'center',
  },
  moralMark: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    letterSpacing: 5,
    color: INK.goldDim,
    marginBottom: 12,
  },
  moral: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: 1,
    color: INK.gold,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 30,
  },
  primary: {
    borderWidth: 1,
    borderColor: INK.gold,
    paddingVertical: 13,
    paddingHorizontal: 30,
    borderRadius: 2,
    backgroundColor: 'rgba(201, 168, 106, 0.08)',
  },
  primaryLabel: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    letterSpacing: 3,
    color: INK.gold,
  },
  secondary: {
    borderWidth: 1,
    borderColor: INK.hairline,
    paddingVertical: 13,
    paddingHorizontal: 30,
    borderRadius: 2,
  },
  secondaryLabel: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    letterSpacing: 3,
    color: INK.paperDim,
  },
  back: {
    position: 'absolute',
    top: 58,
    left: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 2,
    backgroundColor: 'rgba(10, 12, 22, 0.45)',
  },
  backLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    letterSpacing: 1,
    color: INK.paper,
  },
  pressed: {
    opacity: 0.55,
  },
});
