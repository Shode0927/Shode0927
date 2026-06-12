// FABLE — 千夜の寓話
// 頁をひらくたび、端末の中だけで、世界にひとつの寓話とその挿絵が生まれる。

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  useFonts,
  ShipporiMincho_400Regular,
  ShipporiMincho_500Medium,
  ShipporiMincho_700Bold,
} from '@expo-google-fonts/shippori-mincho';
import { Fable, weaveFable } from './src/engine/fable';
import { freshSeed } from './src/engine/prng';
import { loadLibrary, saveFable, deleteFable } from './src/storage';
import HomeScreen from './src/screens/HomeScreen';
import FableScreen from './src/screens/FableScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import { INK } from './src/theme';

type Screen = 'home' | 'fable' | 'library';

export default function App() {
  const [fontsLoaded] = useFonts({
    ShipporiMincho_400Regular,
    ShipporiMincho_500Medium,
    ShipporiMincho_700Bold,
  });

  const [screen, setScreen] = useState<Screen>('home');
  const [cameFrom, setCameFrom] = useState<Screen>('home');
  const [current, setCurrent] = useState<Fable | null>(null);
  const [fresh, setFresh] = useState(true);
  const [library, setLibrary] = useState<Fable[]>([]);

  useEffect(() => {
    loadLibrary().then(setLibrary);
  }, []);

  const weave = useCallback(() => {
    const fable = weaveFable(freshSeed());
    setCurrent(fable);
    setFresh(true);
    setCameFrom('home');
    setScreen('fable');
    setLibrary((prev) => [fable, ...prev]);
    saveFable(fable).catch(() => {});
  }, []);

  const openFromLibrary = useCallback((fable: Fable) => {
    setCurrent(fable);
    setFresh(false);
    setCameFrom('library');
    setScreen('fable');
  }, []);

  const removeFable = useCallback((fable: Fable) => {
    deleteFable(fable.id).then(setLibrary);
  }, []);

  if (!fontsLoaded) {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {screen === 'home' && (
        <Animated.View key="home" entering={FadeIn.duration(500)} style={styles.fill}>
          <HomeScreen
            libraryCount={library.length}
            onWeave={weave}
            onLibrary={() => setScreen('library')}
          />
        </Animated.View>
      )}
      {screen === 'fable' && current && (
        <Animated.View key={current.id} entering={FadeIn.duration(650)} style={styles.fill}>
          <FableScreen
            fable={current}
            fresh={fresh}
            onWeaveAgain={weave}
            onClose={() => setScreen(cameFrom)}
          />
        </Animated.View>
      )}
      {screen === 'library' && (
        <Animated.View key="library" entering={FadeIn.duration(500)} style={styles.fill}>
          <LibraryScreen
            fables={library}
            onOpen={openFromLibrary}
            onDelete={removeFable}
            onClose={() => setScreen('home')}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: INK.bg,
  },
  fill: {
    flex: 1,
  },
});
