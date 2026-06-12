// 夜の書庫 — これまでに紡いだ寓話の棚。
// 触れれば再訪、長く押せば手放す。

import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Fable } from '../engine/fable';
import { FONTS, INK, PALETTES } from '../theme';

interface Props {
  fables: Fable[];
  onOpen: (fable: Fable) => void;
  onDelete: (fable: Fable) => void;
  onClose: () => void;
}

export default function LibraryScreen({ fables, onOpen, onDelete, onClose }: Props) {
  const confirmDelete = (fable: Fable) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    Alert.alert('この夜を手放しますか', `『${fable.title}』は書庫から消え、二度と同じ夜は紡がれません。`, [
      { text: 'とどめる', style: 'cancel' },
      { text: '手放す', style: 'destructive', onPress: () => onDelete(fable) },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>夜の書庫</Text>
        <Text style={styles.subheading}>
          {fables.length > 0 ? `${fables.length}つの夜が眠っている` : 'まだ何も眠っていない'}
        </Text>
      </View>

      {fables.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            表紙へ戻り、最初の一夜を紡いでください。{'\n'}紡がれた寓話は、ここに静かに積まれます。
          </Text>
        </View>
      ) : (
        <FlatList
          data={fables}
          keyExtractor={(f) => f.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const pal = PALETTES[item.themeId];
            return (
              <Animated.View entering={FadeInDown.duration(450).delay(Math.min(index, 8) * 60)}>
                <Pressable
                  onPress={() => onOpen(item)}
                  onLongPress={() => confirmDelete(item)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={[styles.seal, { borderColor: pal.spirit }]}>
                    <Text style={[styles.sealKanji, { color: pal.spirit }]}>{item.themeKanji}</Text>
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.rowMeta}>
                      第{item.night}夜　·
                      {new Date(item.createdAt).toLocaleDateString('ja-JP', {
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          }}
        />
      )}

      <Pressable onPress={onClose} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <Text style={styles.backLabel}>⟨ 表紙へ</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: INK.bg,
    paddingTop: 108,
  },
  header: {
    paddingHorizontal: 28,
    marginBottom: 26,
  },
  heading: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    letterSpacing: 4,
    color: INK.paper,
  },
  subheading: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    letterSpacing: 1,
    color: INK.paperDim,
    marginTop: 10,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: INK.hairline,
    gap: 16,
  },
  seal: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealKanji: {
    fontFamily: FONTS.bold,
    fontSize: 18,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    letterSpacing: 0.5,
    color: INK.paper,
  },
  rowMeta: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    letterSpacing: 1,
    color: INK.paperFaint,
    marginTop: 6,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 28,
    color: INK.paperDim,
    textAlign: 'center',
  },
  back: {
    position: 'absolute',
    top: 58,
    left: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
