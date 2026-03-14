import { useRef, useCallback } from "react";

export function useRingtone() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const play = useCallback(() => {
    try {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.value = 0;
      gainRef.current = gain;

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 440;
      osc.connect(gain);
      osc.start();
      oscillatorRef.current = osc;

      // Ring pattern: on 1s, off 2s
      let on = true;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);

      intervalRef.current = setInterval(() => {
        on = !on;
        if (gainRef.current && audioContextRef.current) {
          gainRef.current.gain.setValueAtTime(
            on ? 0.3 : 0,
            audioContextRef.current.currentTime
          );
          // Alternate frequency for classic ring
          if (on && oscillatorRef.current) {
            oscillatorRef.current.frequency.setValueAtTime(
              oscillatorRef.current.frequency.value === 440 ? 480 : 440,
              audioContextRef.current.currentTime
            );
          }
        }
      }, 1000);
    } catch (e) {
      console.warn("Ringtone failed:", e);
    }
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    gainRef.current = null;
  }, []);

  return { play, stop };
}
