/**
 * Audio Analysis for IELTS Speaking Evaluation
 * Uses Web Audio API (Free, Built-in to all modern browsers)
 * 
 * Analyzes:
 * 1. Pronunciation clarity (frequency analysis)
 * 2. Hesitations and pauses
 * 3. Speaking rate (words per minute)
 * 4. Audio quality
 * 5. Silence detection
 */

/**
 * AudioAnalyzer class - Main entry point
 * Usage:
 * const analyzer = new AudioAnalyzer();
 * const features = await analyzer.analyzeAudioBlob(audioBlob);
 */
export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize AudioContext (free, built-in) - only available in browser
    try {
      if (typeof window === "undefined") {
        console.warn("Web Audio API not available: running on server");
        return;
      }
      const audioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new audioContextClass();
    } catch (e) {
      console.warn("Web Audio API not available:", e);
    }
  }

  /**
   * Main method: Analyze audio blob and extract features
   * Returns comprehensive audio metrics
   */
  async analyzeAudioBlob(audioBlob: Blob): Promise<AudioFeatures> {
    if (!this.audioContext) {
      // Return default features if Web Audio API not available (server-side)
      console.warn("Web Audio API not available, returning default features");
      return {
        frequencyProfile: {
          lowFreqRatio: 0,
          midFreqRatio: 0,
          highFreqRatio: 0,
          dominantFrequency: 0,
          frequencyDistribution: "normal",
        },
        clarityScore: 0,
        signalToNoiseRatio: 0,
        microphoneQuality: {
          quality: "poor",
          score: 0,
          isClipping: false,
          isTooQuiet: true,
          snrEstimate: 0,
          recommendations: ["Cannot analyze audio on server"],
        },
        audioQualityScore: 0,
        hesitationAnalysis: {
          count: 0,
          totalDuration: 0,
          averageDuration: 0,
          ratePerMinute: 0,
          fluencyImpact: "none",
          fillerWords: [],
        },
        pauseAnalysis: {
          count: 0,
          totalDuration: 0,
          averageDuration: 0,
          pauses: [],
          hasExcessivePauses: false,
          pauseRatePerMinute: 0,
        },
        speechRate: {
          estimatedWordsPerMinute: 0,
          speedAssessment: "normal",
          isOptimal: false,
          estimatedWordCount: 0,
        },
        silentDuration: 0,
        totalDuration: audioBlob.size > 0 ? 1 : 0,
        activeSpeechDuration: 0,
        averageAmplitude: 0,
        peakAmplitude: 0,
        dynamicRange: 0,
      };
    }

    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    // Extract features from the decoded audio
    const features: AudioFeatures = {
      // Frequency-based metrics
      frequencyProfile: this.analyzeFrequency(audioBuffer),
      clarityScore: this.calculateClarityScore(audioBuffer),
      signalToNoiseRatio: this.calculateSNR(audioBuffer),

      // Speech quality metrics
      microphoneQuality: this.assessMicrophoneQuality(audioBuffer),
      audioQualityScore: this.calculateAudioQuality(audioBuffer),

      // Timing and fluency metrics
      hesitationAnalysis: this.analyzeHesitations(audioBuffer),
      pauseAnalysis: this.analyzePauses(audioBuffer),
      speechRate: this.calculateSpeechRate(audioBuffer),
      silentDuration: this.calculateSilentDuration(audioBuffer),

      // Overall metrics
      totalDuration: audioBuffer.duration,
      activeSpeechDuration: this.calculateActiveSpeech(audioBuffer),
      averageAmplitude: this.calculateAverageAmplitude(audioBuffer),
      peakAmplitude: this.calculatePeakAmplitude(audioBuffer),
      dynamicRange: this.calculateDynamicRange(audioBuffer),
    };

    return features;
  }

  /**
   * Analyze frequency profile of audio
   * Higher frequencies = better clarity
   */
  private analyzeFrequency(audioBuffer: AudioBuffer): FrequencyProfile {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    // Use FFT (Fast Fourier Transform) to get frequency information
    const fftSize = 2048;

    // Simplified frequency analysis
    // In production, you'd use more sophisticated FFT library
    let lowFreqEnergy = 0; // <500Hz
    let midFreqEnergy = 0; // 500-2000Hz
    let highFreqEnergy = 0; // >2000Hz

    for (let i = 0; i < Math.min(channelData.length, fftSize); i++) {
      const freq = (i * sampleRate) / fftSize;
      const energy = Math.abs(channelData[i]);

      if (freq < 500) lowFreqEnergy += energy;
      else if (freq < 2000) midFreqEnergy += energy;
      else highFreqEnergy += energy;
    }

    const totalEnergy = lowFreqEnergy + midFreqEnergy + highFreqEnergy;

    return {
      lowFreqRatio: totalEnergy > 0 ? lowFreqEnergy / totalEnergy : 0, // 0-1
      midFreqRatio: totalEnergy > 0 ? midFreqEnergy / totalEnergy : 0, // Ideal ~0.6
      highFreqRatio: totalEnergy > 0 ? highFreqEnergy / totalEnergy : 0,
      dominantFrequency: this.findDominantFrequency(channelData, sampleRate),
      frequencyDistribution: "normal", // Could be "muffled", "harsh", "clear"
    };
  }

  /**
   * Calculate clarity score (0-10)
   * Based on frequency distribution and amplitude
   */
  private calculateClarityScore(audioBuffer: AudioBuffer): number {
    const profile = this.analyzeFrequency(audioBuffer);
    const avgAmp = this.calculateAverageAmplitude(audioBuffer);

    // Ideal clarity: balanced frequency distribution + good amplitude
    const frequencyBalance = 1 - Math.abs(profile.midFreqRatio - 0.6);
    const amplitudeScore = Math.min(avgAmp / 0.3, 1); // Normalize to 0-1

    const clarityScore = (frequencyBalance * 0.6 + amplitudeScore * 0.4) * 10;
    return Math.round(clarityScore * 10) / 10; // Round to 1 decimal
  }

  /**
   * Calculate Signal-to-Noise Ratio (SNR)
   * Higher SNR = less background noise
   * Returns SNR in dB (decibels)
   */
  private calculateSNR(audioBuffer: AudioBuffer): number {
    const channelData = audioBuffer.getChannelData(0);
    const threshold = 0.02; // 2% amplitude = silence threshold

    // Separate signal and noise
    let signalPower = 0;
    let noisePower = 0;
    let signalCount = 0;
    let noiseCount = 0;

    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.abs(channelData[i]);
      if (sample > threshold) {
        signalPower += sample * sample;
        signalCount++;
      } else {
        noisePower += sample * sample;
        noiseCount++;
      }
    }

    const avgSignalPower = signalCount > 0 ? signalPower / signalCount : 0.001;
    const avgNoisePower = noiseCount > 0 ? noisePower / noiseCount : 0.0001;

    // Convert to dB
    const snrDb = 10 * Math.log10(avgSignalPower / (avgNoisePower || 0.0001));
    return Math.max(0, snrDb); // At least 0 dB
  }

  /**
   * Assess microphone quality (0-100)
   */
  private assessMicrophoneQuality(audioBuffer: AudioBuffer): MicrophoneQuality {
    const snr = this.calculateSNR(audioBuffer);
    const clarity = this.calculateClarityScore(audioBuffer);
    const peakAmp = this.calculatePeakAmplitude(audioBuffer);

    // Microphone quality indicators
    const isClipping = peakAmp > 0.95; // Recording is too loud
    const isTooQuiet = peakAmp < 0.1; // Recording is too quiet
    const hasGoodSNR = snr > 20; // Good if >20dB
    const hasGoodClarity = clarity > 6; // Good if >6/10

    let quality: "excellent" | "good" | "fair" | "poor" = "fair";
    let score = 50;

    if (isClipping) {
      quality = "poor";
      score = 30;
    } else if (isTooQuiet) {
      quality = "fair";
      score = 40;
    } else if (hasGoodSNR && hasGoodClarity) {
      quality = "excellent";
      score = 90;
    } else if (hasGoodClarity) {
      quality = "good";
      score = 70;
    }

    return {
      quality,
      score, // 0-100
      isClipping,
      isTooQuiet,
      snrEstimate: snr,
      recommendations: this.getMicQualityRecommendations(isClipping, isTooQuiet, hasGoodSNR),
    };
  }

  /**
   * Calculate overall audio quality score (0-100)
   */
  private calculateAudioQuality(audioBuffer: AudioBuffer): number {
    const clarity = this.calculateClarityScore(audioBuffer);
    const micQuality = this.assessMicrophoneQuality(audioBuffer);
    const dynamicRange = this.calculateDynamicRange(audioBuffer);

    // Composite score
    const qualityScore =
      clarity * 0.4 + // 40% clarity
      (micQuality.score / 10) * 0.3 + // 30% microphone
      Math.min(dynamicRange / 50, 10) * 0.3; // 30% dynamic range

    return Math.min(100, Math.round(qualityScore * 10) / 10);
  }

  /**
   * Analyze hesitations ("um", "uh", "er", etc.)
   * Detected as breaks/interruptions in speech flow
   */
  private analyzeHesitations(audioBuffer: AudioBuffer): HesitationAnalysis {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const threshold = 0.02; // Silence threshold

    let hesitationCount = 0;
    let totalHesitationDuration = 0;
    let inSilence = false;
    let silenceStart = 0;

    // Minimum hesitation duration: 100ms (short "um" sound)
    const minHesitationDuration = sampleRate * 0.1;
    // Maximum hesitation duration: 1 second
    const maxHesitationDuration = sampleRate * 1.0;

    for (let i = 0; i < channelData.length; i++) {
      const isLoud = Math.abs(channelData[i]) > threshold;

      if (!isLoud && !inSilence) {
        inSilence = true;
        silenceStart = i;
      } else if (isLoud && inSilence) {
        const silenceDuration = i - silenceStart;

        // This might be a hesitation (filler word)
        if (silenceDuration >= minHesitationDuration && silenceDuration <= maxHesitationDuration) {
          hesitationCount++;
          totalHesitationDuration += silenceDuration;
        }

        inSilence = false;
      }
    }

    const avgHesitationDuration = hesitationCount > 0 ? totalHesitationDuration / hesitationCount / sampleRate : 0;
    const hesitationRate = (hesitationCount / (audioBuffer.duration * 60)) * 100; // Per minute

    // IELTS scoring impact
    // Ideal: < 5 hesitations per minute
    // Acceptable: 5-10 per minute
    // Poor: > 10 per minute
    let fluencyImpact: "none" | "slight" | "moderate" | "severe" = "none";
    if (hesitationRate > 10) fluencyImpact = "severe";
    else if (hesitationRate > 7) fluencyImpact = "moderate";
    else if (hesitationRate > 5) fluencyImpact = "slight";

    return {
      count: hesitationCount,
      totalDuration: totalHesitationDuration / sampleRate, // Convert to seconds
      averageDuration: avgHesitationDuration,
      ratePerMinute: hesitationRate,
      fluencyImpact,
      fillerWords: this.estimateFillerWords(hesitationCount, avgHesitationDuration),
    };
  }

  /**
   * Analyze pauses (longer silences)
   * Important for fluency scoring
   */
  private analyzePauses(audioBuffer: AudioBuffer): PauseAnalysis {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const threshold = 0.02;

    let pauses: { start: number; duration: number }[] = [];
    let inSilence = false;
    let silenceStart = 0;

    // Pauses are longer than 500ms
    const minPauseDuration = sampleRate * 0.5;

    for (let i = 0; i < channelData.length; i++) {
      const isLoud = Math.abs(channelData[i]) > threshold;

      if (!isLoud && !inSilence) {
        inSilence = true;
        silenceStart = i;
      } else if (isLoud && inSilence) {
        const silenceDuration = i - silenceStart;

        if (silenceDuration >= minPauseDuration) {
          pauses.push({
            start: silenceStart / sampleRate,
            duration: silenceDuration / sampleRate,
          });
        }

        inSilence = false;
      }
    }

    const totalPauseDuration = pauses.reduce((sum, p) => sum + p.duration, 0);
    const averagePauseDuration = pauses.length > 0 ? totalPauseDuration / pauses.length : 0;
    const longPauses = pauses.filter((p) => p.duration > 3).length; // > 3 seconds

    return {
      count: pauses.length,
      totalDuration: totalPauseDuration,
      averageDuration: averagePauseDuration,
      pauses,
      hasExcessivePauses: longPauses > 2, // More than 2 pauses >3s is excessive
      pauseRatePerMinute: (pauses.length / audioBuffer.duration) * 60,
    };
  }

  /**
   * Calculate speaking rate (words per minute)
   * This is an estimate based on audio duration and expected word count
   */
  private calculateSpeechRate(audioBuffer: AudioBuffer): SpeechRate {
    const activeDuration = this.calculateActiveSpeech(audioBuffer);
    const totalDuration = audioBuffer.duration;

    // Typical IELTS speaking rate:
    // Native speakers: 120-150 words per minute
    // Non-native: 80-120 words per minute
    // Slow/careful: 60-80 words per minute

    // Estimate words from audio characteristics
    // This is a rough estimate - ideally you'd use speech-to-text
    const estimatedWords = activeDuration * 2.5; // Rough estimate: ~2.5 words per second of active speech
    const wordsPerMinute = (estimatedWords / totalDuration) * 60;

    let speedAssessment: "too_slow" | "slow" | "normal" | "fast" | "too_fast" = "normal";
    if (wordsPerMinute < 60) speedAssessment = "too_slow";
    else if (wordsPerMinute < 100) speedAssessment = "slow";
    else if (wordsPerMinute > 180) speedAssessment = "too_fast";
    else if (wordsPerMinute > 150) speedAssessment = "fast";

    return {
      estimatedWordsPerMinute: Math.round(wordsPerMinute),
      speedAssessment,
      isOptimal: speedAssessment === "normal",
      estimatedWordCount: Math.round(estimatedWords),
    };
  }

  /**
   * Calculate duration of silence/non-speech
   */
  private calculateSilentDuration(audioBuffer: AudioBuffer): number {
    const channelData = audioBuffer.getChannelData(0);
    const threshold = 0.02;
    let silentSamples = 0;

    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) < threshold) {
        silentSamples++;
      }
    }

    return (silentSamples / channelData.length) * audioBuffer.duration;
  }

  /**
   * Calculate active speech duration (non-silent)
   */
  private calculateActiveSpeech(audioBuffer: AudioBuffer): number {
    return audioBuffer.duration - this.calculateSilentDuration(audioBuffer);
  }

  /**
   * Calculate average amplitude (loudness)
   */
  private calculateAverageAmplitude(audioBuffer: AudioBuffer): number {
    const channelData = audioBuffer.getChannelData(0);
    let sum = 0;

    for (let i = 0; i < channelData.length; i++) {
      sum += Math.abs(channelData[i]);
    }

    return sum / channelData.length;
  }

  /**
   * Calculate peak amplitude (max loudness)
   */
  private calculatePeakAmplitude(audioBuffer: AudioBuffer): number {
    const channelData = audioBuffer.getChannelData(0);
    let peak = 0;

    for (let i = 0; i < channelData.length; i++) {
      const abs = Math.abs(channelData[i]);
      if (abs > peak) peak = abs;
    }

    return peak;
  }

  /**
   * Calculate dynamic range (difference between loud and quiet)
   * Higher is better (more expression)
   */
  private calculateDynamicRange(audioBuffer: AudioBuffer): number {
    const peak = this.calculatePeakAmplitude(audioBuffer);
    const avg = this.calculateAverageAmplitude(audioBuffer);

    // Dynamic range in dB
    return avg > 0 ? 20 * Math.log10(peak / (avg || 0.0001)) : 0;
  }

  /**
   * Find dominant frequency (pitch-like estimation)
   */
  private findDominantFrequency(channelData: Float32Array, sampleRate: number): number {
    // Simplified: use autocorrelation method
    // In production, use more sophisticated pitch detection (e.g., PYIN algorithm)
    const minFreq = 50; // Hz
    const maxFreq = 400; // Hz (typical for speech)
    let maxCorr = 0;
    let dominantFreq = 100;

    for (let freq = minFreq; freq <= maxFreq; freq += 10) {
      const period = sampleRate / freq;
      let corr = 0;

      for (let i = 0; i < Math.min(channelData.length / 2, period * 5); i++) {
        if (i + period < channelData.length) {
          corr += channelData[i] * channelData[i + Math.floor(period)];
        }
      }

      if (corr > maxCorr) {
        maxCorr = corr;
        dominantFreq = freq;
      }
    }

    return dominantFreq;
  }

  /**
   * Estimate filler word count from hesitation characteristics
   */
  private estimateFillerWords(_count: number, avgDuration: number): string[] {
    const estimated: string[] = [];

    // "um" - typically 200-400ms
    if (avgDuration > 0.15 && avgDuration < 0.5) {
      estimated.push("um", "uh");
    }

    // "er" - typically 150-300ms
    if (avgDuration > 0.1 && avgDuration < 0.4) {
      estimated.push("er", "um");
    }

    // "like" - typically 300-600ms
    if (avgDuration > 0.25 && avgDuration < 0.7) {
      estimated.push("like", "you know");
    }

    return estimated.length > 0 ? estimated : ["hesitation/pause"];
  }

  /**
   * Get microphone quality recommendations
   */
  private getMicQualityRecommendations(
    isClipping: boolean,
    isTooQuiet: boolean,
    hasGoodSNR: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (isClipping) {
      recommendations.push("Microphone is picking up too much volume. Speak a bit further away or lower your volume.");
    }

    if (isTooQuiet) {
      recommendations.push("Speaking volume is too low. Please speak louder or move closer to the microphone.");
    }

    if (!hasGoodSNR) {
      recommendations.push("There is background noise. Try to find a quieter location for the test.");
    }

    if (recommendations.length === 0) {
      recommendations.push("Audio quality looks good!");
    }

    return recommendations;
  }
}

// ─── Type Definitions ──────────────────────────────────────────────────────

export interface AudioFeatures {
  frequencyProfile: FrequencyProfile;
  clarityScore: number; // 0-10
  signalToNoiseRatio: number; // dB
  microphoneQuality: MicrophoneQuality;
  audioQualityScore: number; // 0-100
  hesitationAnalysis: HesitationAnalysis;
  pauseAnalysis: PauseAnalysis;
  speechRate: SpeechRate;
  silentDuration: number; // seconds
  totalDuration: number; // seconds
  activeSpeechDuration: number; // seconds
  averageAmplitude: number; // 0-1
  peakAmplitude: number; // 0-1
  dynamicRange: number; // dB
}

export interface FrequencyProfile {
  lowFreqRatio: number; // 0-1
  midFreqRatio: number; // 0-1
  highFreqRatio: number; // 0-1
  dominantFrequency: number; // Hz
  frequencyDistribution: "muffled" | "normal" | "harsh";
}

export interface MicrophoneQuality {
  quality: "excellent" | "good" | "fair" | "poor";
  score: number; // 0-100
  isClipping: boolean;
  isTooQuiet: boolean;
  snrEstimate: number;
  recommendations: string[];
}

export interface HesitationAnalysis {
  count: number;
  totalDuration: number; // seconds
  averageDuration: number; // seconds
  ratePerMinute: number;
  fluencyImpact: "none" | "slight" | "moderate" | "severe";
  fillerWords: string[]; // Estimated: ["um", "uh", "like"]
}

export interface PauseAnalysis {
  count: number;
  totalDuration: number; // seconds
  averageDuration: number; // seconds
  pauses: Array<{ start: number; duration: number }>;
  hasExcessivePauses: boolean;
  pauseRatePerMinute: number;
}

export interface SpeechRate {
  estimatedWordsPerMinute: number;
  speedAssessment: "too_slow" | "slow" | "normal" | "fast" | "too_fast";
  isOptimal: boolean;
  estimatedWordCount: number;
}
