import { useEffect, useState } from "react";
import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import { useRestTimerStore } from "@/stores/rest-timer-store";
import { useSettingsStore } from "@/stores/settings-store";

const sound = require("../../../assets/sounds/rest_complete.wav");

export function useRestTimer() {
  const active = useRestTimerStore((state) => state.active);
  const paused = useRestTimerStore((state) => state.paused);
  const endsAt = useRestTimerStore((state) => state.endsAt);
  const nextLabel = useRestTimerStore((state) => state.nextLabel);
  const notificationId = useRestTimerStore((state) => state.notificationId);
  const getRemaining = useRestTimerStore((state) => state.getRemaining);
  const pause = useRestTimerStore((state) => state.pause);
  const resume = useRestTimerStore((state) => state.resume);
  const addSeconds = useRestTimerStore((state) => state.addSeconds);
  const stop = useRestTimerStore((state) => state.stop);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const [remaining, setRemaining] = useState(() => getRemaining());
  const player = useAudioPlayer(sound);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let finished = false;
    const tick = () => {
      const next = getRemaining();
      setRemaining(next);
      if (active && !paused && next <= 0 && !finished) {
        finished = true;
        // When a native local notification was scheduled, Android/iOS owns the
        // sound/vibration. Falling back here keeps the timer useful when the user
        // denied notification permission or disabled background notifications.
        if (!notificationId && soundEnabled) {
          player.seekTo(0);
          player.play();
        }
        if (!notificationId && hapticsEnabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        void stop();
      }
    };
    const initial = setTimeout(tick, 0);
    if (active && !paused) interval = setInterval(tick, 250);
    return () => {
      clearTimeout(initial);
      if (interval) clearInterval(interval);
    };
  }, [active, paused, endsAt, getRemaining, hapticsEnabled, notificationId, player, soundEnabled, stop]);

  return { active, paused, endsAt, nextLabel, remaining, pause, resume, addSeconds, stop };
}
