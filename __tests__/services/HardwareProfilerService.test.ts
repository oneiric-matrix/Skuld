import {
  HardwareProfilerService,
  hardwareProfiler,
} from '../../src/services/HardwareProfilerService';

describe('HardwareProfilerService (Task 4.2: Nothing Phone 1 Profiling)', () => {
  let profiler: HardwareProfilerService;

  beforeEach(() => {
    profiler = HardwareProfilerService.getInstance();
    profiler.setThermalStatus('nominal');
  });

  describe('Device Specifications & Hardware Baseline', () => {
    it('returns accurate Nothing Phone (1) hardware specifications and memory budget', () => {
      const profile = profiler.getDeviceProfile();

      expect(profile.deviceModel).toBe('Nothing Phone (1) - A063');
      expect(profile.soc).toContain('Snapdragon 778G+');
      expect(profile.totalRamMb).toBe(8192);
      expect(profile.usableRamBudgetMb).toBe(2500);
      expect(profile.npuAvailable).toBe(true);
      expect(profile.thermalStatus).toBe('nominal');
    });

    it('tracks updates to device thermal states', () => {
      profiler.setThermalStatus('serious');
      expect(profiler.getDeviceProfile().thermalStatus).toBe('serious');
    });
  });

  describe('Model Execution & Thermal Benchmarking', () => {
    it('rates Qwen 2.5 3B Q4_K_M as optimal when within memory and latency targets', () => {
      const result = profiler.evaluateModelPerformance(
        'Qwen-2.5-3B-Instruct',
        'q4_k_m',
        1850, // 1.85 GB allocated (safe under 2.5GB budget)
        320, // TTFT: 320ms (< 500ms)
        18.5 // 18.5 tokens/sec (> 12 tps)
      );

      expect(result.modelName).toBe('Qwen-2.5-3B-Instruct');
      expect(result.status).toBe('optimal');
      expect(result.ramAllocatedMb).toBe(1850);
      expect(result.cpuLoadPercent).toBe(35);
      expect(result.batteryDrainEstimatePercentPerHour).toBe(12);
    });

    it('flags out_of_memory if model exceeds safe mobile budget', () => {
      const result = profiler.evaluateModelPerformance(
        'Llama-3-8B-Instruct',
        'q4_k_m',
        4500, // 4.5 GB exceeds safe 2.5 GB budget
        900,
        6
      );

      expect(result.status).toBe('out_of_memory');
      expect(result.cpuLoadPercent).toBe(95);
    });

    it('throttles performance metrics when device reports elevated thermals', () => {
      profiler.setThermalStatus('serious');

      const result = profiler.evaluateModelPerformance(
        'Qwen-2.5-3B-Instruct',
        'q4_k_m',
        1850,
        300,
        18
      );

      expect(result.status).toBe('throttled');
      expect(result.timeToFirstTokenMs).toBe(450); // 300 * 1.5
      expect(result.tokensPerSecond).toBe(10.8); // 18 * 0.6
    });

    it('marks model performance acceptable if latency slightly exceeds optimal target', () => {
      const result = profiler.evaluateModelPerformance(
        'Custom-Onnx-Model',
        'int8',
        1200,
        620, // > 500ms
        10 // < 12 tps
      );

      expect(result.status).toBe('acceptable');
      expect(result.cpuLoadPercent).toBe(55);
    });
  });

  describe('Zero-Lag Voice Turnaround Pipeline Latency Evaluation', () => {
    it('evaluates end-to-end voice latency target (< 500ms)', () => {
      // 120ms (STT) + 210ms (LLM early clause) + 110ms (Piper TTS first chunk) = 440ms
      const report = profiler.measureVoiceSubsystemLatency(120, 210, 110);

      expect(report.sttLatencyMs).toBe(120);
      expect(report.llmTimeToFirstTokenMs).toBe(210);
      expect(report.ttsFirstAudioChunkMs).toBe(110);
      expect(report.totalEndToEndVoiceLatencyMs).toBe(440);
      expect(report.isUnderVoiceTarget).toBe(true);
    });

    it('identifies when voice turnaround exceeds acceptable conversational threshold', () => {
      const report = profiler.measureVoiceSubsystemLatency(200, 350, 150);

      expect(report.totalEndToEndVoiceLatencyMs).toBe(700);
      expect(report.isUnderVoiceTarget).toBe(false);
    });
  });
});
