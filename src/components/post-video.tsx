import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Play, Volume2, VolumeX } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/** Short looping video: tap to play/pause, corner button to toggle sound. */
export function PostVideo({ uri, aspect }: { uri: string; aspect: number }) {
  const [muted, setMuted] = useState(true);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  return (
    <View style={[styles.wrap, { aspectRatio: aspect }]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <Pressable style={StyleSheet.absoluteFill} onPress={() => (isPlaying ? player.pause() : player.play())}>
        {!isPlaying ? (
          <View style={styles.center}>
            <View style={styles.play}>
              <Play size={26} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
        ) : null}
      </Pressable>
      <Pressable
        style={styles.sound}
        hitSlop={10}
        onPress={() => {
          // expo-video players are mutable native objects; this is the documented API.
          // eslint-disable-next-line react-hooks/immutability
          player.muted = !muted;
          setMuted(!muted);
        }}>
        {muted ? <VolumeX size={19} color="#FFFFFF" /> : <Volume2 size={19} color="#FFFFFF" />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', backgroundColor: '#000', overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  play: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  sound: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
