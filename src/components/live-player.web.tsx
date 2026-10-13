import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

/** Web preview: a plain iframe. */
export function LivePlayer({ src }: { src: string }) {
  return (
    <View style={styles.box}>
      {createElement('iframe', {
        src,
        allow: 'autoplay; fullscreen; picture-in-picture; encrypted-media',
        allowFullScreen: true,
        style: { border: 0, width: '100%', height: '100%' },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 16, overflow: 'hidden' },
});
