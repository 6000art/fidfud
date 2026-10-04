// Web Audio API Synth for high-performance, instant reaction pops
export class ReactionAudioService {
  private static ctx: AudioContext | null = null;

  public static playReactionPop(emoji: string) {
    try {
      if (typeof window === 'undefined') return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Distinct audio character per reaction
      const freqMap: Record<string, { f1: number; f2: number; type: OscillatorType }> = {
        '🔥': { f1: 520, f2: 880, type: 'triangle' },
        '😋': { f1: 650, f2: 960, type: 'sine' },
        '🤤': { f1: 420, f2: 680, type: 'sine' },
        '❤️': { f1: 720, f2: 1100, type: 'sine' },
        '💯': { f1: 850, f2: 1300, type: 'square' },
        '👨‍🍳': { f1: 580, f2: 900, type: 'triangle' },
        '👏': { f1: 700, f2: 1050, type: 'sine' },
        '⭐': { f1: 800, f2: 1200, type: 'sine' },
      };

      const sound = freqMap[emoji] || { f1: 600, f2: 900, type: 'sine' };

      osc.type = sound.type;
      osc.frequency.setValueAtTime(sound.f1, now);
      osc.frequency.exponentialRampToValueAtTime(sound.f2, now + 0.07);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);

      // Trigger subtle haptic on mobile if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12);
      }
    } catch {
      // Audio or vibration gracefully ignored if restricted
    }
  }
}
