// 墨書きの演出 — 物語が一文字ずつ、紙に滲むように現れる。
// 句読点で指先にかすかな手応えを返す。待ちきれなければ、触れれば全て現れる。

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FONTS, INK } from '../theme';

interface Props {
  paragraphs: string[];
  instant?: boolean;
  charInterval?: number;
  onDone?: () => void;
}

export default function InkText({ paragraphs, instant = false, charInterval = 42, onDone }: Props) {
  const total = useMemo(() => paragraphs.reduce((n, p) => n + p.length, 0), [paragraphs]);
  const [count, setCount] = useState(instant ? total : 0);
  const doneRef = useRef(false);

  useEffect(() => {
    setCount(instant ? total : 0);
    doneRef.current = false;
  }, [paragraphs, instant, total]);

  useEffect(() => {
    if (count >= total) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
      return;
    }
    const id = setInterval(() => {
      setCount((c) => Math.min(total, c + 1));
    }, charInterval);
    return () => clearInterval(id);
  }, [count >= total, paragraphs]); // eslint-disable-line react-hooks/exhaustive-deps

  // 句読点で微かな手応え
  const flat = useMemo(() => paragraphs.join(''), [paragraphs]);
  useEffect(() => {
    if (count === 0 || count > flat.length) return;
    const ch = flat[count - 1];
    if (ch === '。' || ch === '」') {
      Haptics.selectionAsync().catch(() => {});
    }
  }, [count, flat]);

  const skip = () => {
    if (count < total) setCount(total);
  };

  let remaining = count;
  return (
    <Pressable onPress={skip}>
      {paragraphs.map((p, i) => {
        const visible = Math.max(0, Math.min(p.length, remaining));
        remaining -= p.length;
        if (visible === 0) return null;
        return (
          <Text key={i} style={styles.paragraph}>
            {p.slice(0, visible)}
            {visible < p.length ? <Text style={styles.ghost}>{p[visible]}</Text> : null}
          </Text>
        );
      })}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  paragraph: {
    fontFamily: FONTS.regular,
    fontSize: 16.5,
    lineHeight: 32,
    color: INK.paper,
    marginBottom: 18,
    letterSpacing: 0.6,
  } as TextStyle,
  ghost: {
    color: INK.paperFaint,
  } as TextStyle,
});
