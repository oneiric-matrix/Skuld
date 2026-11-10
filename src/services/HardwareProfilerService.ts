export interface DeviceHardwareProfile {
  deviceModel: string; // e.g. "Nothing Phone (1) - A063"
  soc: string; // "Snapdragon 778G+ 5G"
  totalRamMb: number; // 8192 MB (8GB) or 12288 MB (12GB)
  usableRamBudgetMb: number; // 2500 MB safe budget allocated to Skuld AI
  npuAvailable: boolean;
  thermalStatus: 'nominal' | 'fair' | 'serious' | 'critical';
}

export interface ModelBenchmarkResult {
  modelName: string;
  quantization: 'q4_k_m' | 'int8' | 'fp16';
  ramAllocatedMb: number;
  timeToFirstTokenMs: number; // Target < 500ms
  tokensPerSecond: number; // Target > 12 tps
  cpuLoadPercent: number;
  batteryDrainEstimatePercentPerHour: number;
  status: 'optimal' | 'acceptable' | 'throttled' | 'out_of_memory';
}

export interface SubsystemLatencyReport {
  sttLatencyMs: number; // Streaming STT audio chunking
  llmTimeToFirstTokenMs: number; // Qwen 2.5 3B TTFT
  ttsFirstAudioChunkMs: number; // Piper neural TTS synthesis latency
  totalEndToEndVoiceLatencyMs: number; // Complete voice turnaround loop
  isUnderVoiceTarget: boolean; // Must be < 500ms for conversational zero-lag feel
}

/**
 * Hardware Profiler and Performance Benchmarking Engine.
 * Tailored specifically for Snapdragon 778G+ (Nothing Phone 1 hardware baseline).
 * Manages thermal throttling mitigation, memory budget enforcement,
 * and tracks on-device inference latency across AI subsystems.
 */
export class HardwareProfilerService {
  private static instance: HardwareProfilerService | null = null;
  private currentThermalStatus: DeviceHardwareProfile['thermalStatus'] = 'nominal';
  private safeRamBudgetMb = 2500; // Safe memory budget allocated to local AI models

  private constructor() {}

  static getInstance(): HardwareProfilerService {
    if (!HardwareProfilerService.instance) {
      HardwareProfilerService.instance = new HardwareProfilerService();
    }
    return HardwareProfilerService.instance;
  }

  getDeviceProfile(): DeviceHardwareProfile {
    return {
      deviceModel: 'Nothing Phone (1) - A063',
      soc: 'Qualcomm Snapdragon 778G+ 5G (6nm)',
      totalRamMb: 8192,
      usableRamBudgetMb: this.safeRamBudgetMb,
      npuAvailable: true,
      thermalStatus: this.currentThermalStatus,
    };
  }

  setThermalStatus(status: DeviceHardwareProfile['thermalStatus']): void {
    this.currentThermalStatus = status;
  }

  /**
   * Benchmarks model execution against Nothing Phone 1 operational bounds.
   */
  evaluateModelPerformance(
    modelName: string,
    quantization: ModelBenchmarkResult['quantization'],
    actualRamMb: number,
    ttftMs: number,
    tps: number
  ): ModelBenchmarkResult {
    if (actualRamMb > this.safeRamBudgetMb) {
      return {
        modelName,
        quantization,
        ramAllocatedMb: actualRamMb,
        timeToFirstTokenMs: ttftMs,
        tokensPerSecond: tps,
        cpuLoadPercent: 95,
        batteryDrainEstimatePercentPerHour: 22,
        status: 'out_of_memory',
      };
    }

    if (this.currentThermalStatus === 'serious' || this.currentThermalStatus === 'critical') {
      return {
        modelName,
        quantization,
        ramAllocatedMb: actualRamMb,
        timeToFirstTokenMs: Math.round(ttftMs * 1.5 * 10) / 10,
        tokensPerSecond: Math.round(tps * 0.6 * 10) / 10,
        cpuLoadPercent: 60, // throttled
        batteryDrainEstimatePercentPerHour: 18,
        status: 'throttled',
      };
    }

    const isOptimal = ttftMs <= 500 && tps >= 12;
    return {
      modelName,
      quantization,
      ramAllocatedMb: actualRamMb,
      timeToFirstTokenMs: ttftMs,
      tokensPerSecond: tps,
      cpuLoadPercent: isOptimal ? 35 : 55,
      batteryDrainEstimatePercentPerHour: 12,
      status: isOptimal ? 'optimal' : 'acceptable',
    };
  }

  /**
   * Evaluates voice turnaround pipeline latency.
   */
  measureVoiceSubsystemLatency(
    sttLatencyMs: number,
    llmTimeToFirstTokenMs: number,
    ttsFirstAudioChunkMs: number
  ): SubsystemLatencyReport {
    // Pipeline is concurrent: STT completes, LLM starts streaming, TTS synthesizes first punctuation clause
    const totalLatency = sttLatencyMs + llmTimeToFirstTokenMs + ttsFirstAudioChunkMs;
    const isUnderVoiceTarget = totalLatency < 500;

    return {
      sttLatencyMs,
      llmTimeToFirstTokenMs,
      ttsFirstAudioChunkMs,
      totalEndToEndVoiceLatencyMs: totalLatency,
      isUnderVoiceTarget,
    };
  }
}

export const hardwareProfiler = HardwareProfilerService.getInstance();
