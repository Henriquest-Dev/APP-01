import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { EMBED_ORIGIN, embedHtml } from '@/lib/lives';

/**
 * Plays the host's stream inside the app (YouTube / Twitch / Kick embeds).
 * Navigation is locked to the embed so a stream can't send the viewer elsewhere.
 */
export function LivePlayer({ src }: { src: string }) {
  const host = new URL(src).hostname;
  return (
    <View style={styles.box}>
      <WebView
        originWhitelist={['*']}
        source={{ html: embedHtml(src), baseUrl: EMBED_ORIGIN }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(req) => {
          if (req.url === 'about:blank' || req.url.startsWith(EMBED_ORIGIN)) return true;
          try {
            const h = new URL(req.url).hostname;
            // Same provider only (player + its own assets).
            return h === host || h.endsWith(`.${host.split('.').slice(-2).join('.')}`);
          } catch {
            return false;
          }
        }}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 16, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: '#000' },
});
