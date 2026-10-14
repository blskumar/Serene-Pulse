import React, { useState } from 'react';
import {
  MeditationSession,
  ImageResolution,
  AspectRatio,
  VoiceName,
  SoundscapeType,
  BreathPatternType,
} from '../types';
import {
  Sparkles,
  Image as ImageIcon,
  Mic,
  Music,
  Wind,
  Clock,
  Play,
  RotateCw,
  Sliders,
  Check,
  AlertCircle,
  Volume2,
} from 'lucide-react';

interface SessionCreatorProps {
  onSessionCreated: (session: MeditationSession) => void;
  onPlaySession: (session: MeditationSession) => void;
  initialValues?: Partial<MeditationSession>;
}

export const SessionCreator: React.FC<SessionCreatorProps> = ({
  onSessionCreated,
  onPlaySession,
  initialValues,
}) => {
  // Session parameters
  const [topic, setTopic] = useState(
    initialValues?.title || 'Twilight ocean shoreline for calming an overactive mind'
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    initialValues?.durationMinutes || 5
  );
  const [intent, setIntent] = useState('Deep relaxation, letting go of racing thoughts');

  // Visual settings - explicit Image Size affordance (1K, 2K, 4K) using gemini-3-pro-image-preview
  const [imageSize, setImageSize] = useState<ImageResolution>(
    initialValues?.imageSize || '2K'
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    initialValues?.aspectRatio || '16:9'
  );
  const [visualPrompt, setVisualPrompt] = useState(
    initialValues?.imagePrompt ||
      'Bioluminescent gentle ocean waves on lavender sand at twilight, starry sky with soft glowing moon, ethereal peace, ultra realistic'
  );

  // Voiceover settings using gemini-3.8-flash-tts
  const [voice, setVoice] = useState<VoiceName>(initialValues?.voice || 'Kore');
  const [voiceStyle, setVoiceStyle] = useState(
    initialValues?.voiceStyle ||
      'Calm, soothing, slow-cadence mindful meditation guide with gentle pauses'
  );

  // Ambient soundscape & breath
  const [soundscape, setSoundscape] = useState<SoundscapeType>(
    initialValues?.soundscape || 'ocean'
  );
  const [breathTechnique, setBreathTechnique] = useState<BreathPatternType>(
    initialValues?.breathTechnique || 'box'
  );

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Voice preview test
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [voiceSampleAudio, setVoiceSampleAudio] = useState<string | null>(null);

  // Pre-configured inspiration presets
  const inspirations = [
    {
      topic: 'Drifting into deep sleep with celestial nebula',
      intent: 'Insomnia relief & quiet mind',
      sound: 'theta-binaural' as SoundscapeType,
      breath: '4-7-8' as BreathPatternType,
      voice: 'Zephyr' as VoiceName,
      imgSize: '4K' as ImageResolution,
      prompt: 'Vast celestial nebula in violet and starlight dust, gentle cosmic aura, deep calm serenity',
    },
    {
      topic: 'Releasing burnout and physical tension',
      intent: 'Somatic nervous system relaxation',
      sound: 'forest-rain' as SoundscapeType,
      breath: 'box' as BreathPatternType,
      voice: 'Fenrir' as VoiceName,
      imgSize: '2K' as ImageResolution,
      prompt: 'Secluded mossy waterfall in temperate rainforest, soft rain filtering through emerald leaves, tranquil mist',
    },
    {
      topic: 'Morning sunlight & razor-sharp mental focus',
      intent: 'Clarity, energy, and gratitude',
      sound: 'alpha-flow' as SoundscapeType,
      breath: 'coherence' as BreathPatternType,
      voice: 'Kore' as VoiceName,
      imgSize: '4K' as ImageResolution,
      prompt: 'High alpine peak greeting the first rays of golden dawn, crystalline mountain lake reflection, pristine stillness',
    },
    {
      topic: 'Inner temple garden & loving kindness',
      intent: 'Self-compassion & emotional healing',
      sound: 'singing-bowls' as SoundscapeType,
      breath: 'natural' as BreathPatternType,
      voice: 'Charon' as VoiceName,
      imgSize: '1K' as ImageResolution,
      prompt: 'Ancient zen temple courtyard with stone lanterns, pink cherry blossom petals on tranquil reflection pool',
    },
  ];

  const handleApplyInspiration = (insp: typeof inspirations[0]) => {
    setTopic(insp.topic);
    setIntent(insp.intent);
    setSoundscape(insp.sound);
    setBreathTechnique(insp.breath);
    setVoice(insp.voice);
    setImageSize(insp.imgSize);
    setVisualPrompt(insp.prompt);
  };

  // Quick Voice Preview tester
  const handleTestVoice = async () => {
    setIsPreviewingVoice(true);
    setError(null);
    try {
      const sampleText = `Hello. Welcome to your quiet sanctuary. <breath> Take a slow, gentle breath with me.`;
      const res = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          voice,
          style: voiceStyle,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to synthesize sample');

      if (data.audioBase64) {
        setVoiceSampleAudio(data.audioBase64);
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        audio.play().catch(() => {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance('Welcome to your quiet sanctuary. Take a slow, gentle breath with me.');
            utt.rate = 0.85;
            window.speechSynthesis.speak(utt);
          }
        });
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance('Welcome to your quiet sanctuary. Take a slow, gentle breath with me.');
        utt.rate = 0.85;
        window.speechSynthesis.speak(utt);
      }
    } catch (err: any) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance('Welcome to your quiet sanctuary. Take a slow, gentle breath with me.');
        utt.rate = 0.85;
        window.speechSynthesis.speak(utt);
      } else {
        setError(`Voice test error: ${err.message}`);
      }
    } finally {
      setIsPreviewingVoice(false);
    }
  };

  // Full Session Generation Flow
  const handleGenerateFullSession = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Step 1: Generate Session Script & Plan
      setCurrentStep('Step 1/3: Crafting personalized meditation script with Gemini...');
      const planRes = await fetch('/api/generate-session-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          durationMinutes,
          intent,
          preferredVoice: voice,
          imageSize,
        }),
      });

      const planData = await planRes.json();
      if (!planRes.ok) {
        throw new Error(planData.error || 'Failed to craft meditation script');
      }

      const generatedTitle = planData.title || topic;
      const generatedPrompt = planData.visualPrompt || visualPrompt;
      const fullScript = planData.fullScript || '';
      const segments = planData.segments || [];

      // Step 2: Generate High-Quality Image with gemini-3-pro-image-preview
      setCurrentStep(
        `Step 2/3: Generating ${imageSize} sanctuary visual with gemini-3-pro-image-preview...`
      );
      let generatedImageUrl = '';
      try {
        const imageRes = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: generatedPrompt,
            imageSize, // Affordance for 1K, 2K, 4K
            aspectRatio,
          }),
        });

        const imgData = await imageRes.json();
        if (imageRes.ok && imgData.imageUrl) {
          generatedImageUrl = imgData.imageUrl;
        } else {
          console.warn('Image generation failed or fell back:', imgData.error);
          generatedImageUrl =
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80';
        }
      } catch (imgErr) {
        console.warn('Image error:', imgErr);
        generatedImageUrl =
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80';
      }

      // Step 3: Generate Voiceover Audio with gemini-3.8-flash-tts
      setCurrentStep(
        `Step 3/3: Synthesizing voiceover (${voice}) with gemini-3.8-flash-tts...`
      );
      let generatedAudioBase64: string | undefined = undefined;
      try {
        const ttsRes = await fetch('/api/generate-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: fullScript,
            voice,
            style: voiceStyle,
          }),
        });

        const ttsData = await ttsRes.json();
        if (ttsRes.ok && ttsData.audioBase64) {
          generatedAudioBase64 = ttsData.audioBase64;
        }
      } catch (ttsErr) {
        console.warn('TTS error:', ttsErr);
      }

      // Build complete session object
      const newSession: MeditationSession = {
        id: `custom-${Date.now()}`,
        title: generatedTitle,
        description: planData.description || intent,
        category: planData.category || 'Custom AI Session',
        durationMinutes,
        imageUrl: generatedImageUrl,
        imagePrompt: generatedPrompt,
        imageSize,
        aspectRatio,
        voice,
        voiceStyle,
        audioBase64: generatedAudioBase64,
        soundscape,
        breathTechnique,
        fullScript,
        segments,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };

      onSessionCreated(newSession);
      onPlaySession(newSession);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error creating custom meditation session');
    } finally {
      setIsGenerating(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6 text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium mb-2">
          <Sparkles size={13} />
          <span>Gemini AI Studio Studio • Custom Visuals & TTS</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-serif-zen font-medium text-white tracking-wide">
          Craft Your Bespoke Meditation Sanctuary
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Generate an entirely personalized meditation session with unique scenery imagery rendered by{' '}
          <code className="text-emerald-400 text-xs font-mono">gemini-3-pro-image-preview</code> (1K, 2K, 4K)
          and soothing voiceover narrated by{' '}
          <code className="text-emerald-400 text-xs font-mono">gemini-3.8-flash-tts</code>.
        </p>
      </div>

      {/* Quick Inspiration Pills */}
      <div className="mb-8">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-2.5">
          ✨ Quick Inspiration Themes
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {inspirations.map((insp, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyInspiration(insp)}
              className="p-3 text-left rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-emerald-500/30 transition text-xs group"
            >
              <div className="font-medium text-slate-200 group-hover:text-emerald-300 line-clamp-1">
                {insp.topic}
              </div>
              <div className="text-slate-400 text-[11px] mt-1 flex items-center justify-between">
                <span>{insp.intent}</span>
                <span className="text-emerald-400 font-mono text-[10px]">{insp.imgSize}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Creation Card Form */}
      <div className="space-y-6 bg-slate-900/70 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        {/* Section 1: Intent & Duration */}
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
              1
            </span>
            Session Intent & Duration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs text-slate-300">Meditation Theme or Need</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Deep ocean drift, letting go of workday tension, pre-sleep calm..."
                className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Duration</label>
              <div className="flex gap-1.5">
                {[1, 3, 5, 10, 15].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`flex-1 py-2 text-xs rounded-xl font-medium transition ${
                      durationMinutes === mins
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Section 2: Visual Scenery & Resolution (gemini-3-pro-image-preview) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                2
              </span>
              Unique AI Visuals
              <span className="text-[11px] font-mono font-normal text-emerald-400/90 lowercase">
                (gemini-3-pro-image-preview)
              </span>
            </h3>
          </div>

          <div className="space-y-3">
            {/* Visual Prompt Input */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 flex items-center justify-between">
                <span>Sanctuary Visual Prompt (customizable scenery description)</span>
              </label>
              <textarea
                rows={2}
                value={visualPrompt}
                onChange={(e) => setVisualPrompt(e.target.value)}
                placeholder="Describe the peaceful atmosphere: e.g. misty pine forest at sunrise, bioluminescent calm tide, cosmic stars..."
                className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* User Affordance: Image Size Selector (1K, 2K, 4K) & Aspect Ratio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* IMAGE SIZE AFFORDANCE */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50">
                <label className="text-xs font-medium text-emerald-300 flex items-center justify-between">
                  <span>Image Resolution Size:</span>
                  <span className="text-[10px] text-slate-400">gemini-3-pro-image</span>
                </label>
                <div className="flex gap-2">
                  {(['1K', '2K', '4K'] as ImageResolution[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setImageSize(size)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition border flex flex-col items-center ${
                        imageSize === size
                          ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500 shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700/70'
                      }`}
                    >
                      <span>{size}</span>
                      <span className="text-[9px] font-normal opacity-70">
                        {size === '1K' ? 'Fast' : size === '2K' ? 'Balanced' : 'Ultra HD'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50">
                <label className="text-xs font-medium text-slate-300">
                  Aspect Ratio
                </label>
                <div className="flex gap-2">
                  {[
                    { id: '16:9', label: '16:9 Sanctuary' },
                    { id: '1:1', label: '1:1 Mandala' },
                    { id: '9:16', label: '9:16 Mobile' },
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setAspectRatio(ratio.id as AspectRatio)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition border ${
                        aspectRatio === ratio.id
                          ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700/70'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Section 3: Gemini TTS Voiceover (gemini-3.8-flash-tts) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                3
              </span>
              Voiceover Narration
              <span className="text-[11px] font-mono font-normal text-emerald-400/90 lowercase">
                (gemini-3.8-flash-tts)
              </span>
            </h3>

            {/* Test Voice Sample Button */}
            <button
              type="button"
              onClick={handleTestVoice}
              disabled={isPreviewingVoice}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 px-3 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/50 transition disabled:opacity-50"
            >
              <Volume2 size={13} />
              <span>{isPreviewingVoice ? 'Speaking sample...' : 'Test Voice Sample'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { id: 'Kore', label: 'Kore', desc: 'Serene & gentle (Female)' },
              { id: 'Fenrir', label: 'Fenrir', desc: 'Deep & grounded (Male)' },
              { id: 'Zephyr', label: 'Zephyr', desc: 'Airy & peaceful (Whisper)' },
              { id: 'Puck', label: 'Puck', desc: 'Warm & friendly (Calm)' },
              { id: 'Charon', label: 'Charon', desc: 'Wise & stoic (Monk)' },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVoice(v.id as VoiceName)}
                className={`p-3 rounded-2xl text-left transition border ${
                  voice === v.id
                    ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-sm'
                    : 'bg-slate-800/80 border-slate-700/70 text-slate-300 hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span>{v.label}</span>
                  {voice === v.id && <Check size={12} className="text-emerald-400" />}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Section 4: Soundscape & Breathwork */}
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
              4
            </span>
            Soundscape & Breathing Pattern
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ambient Soundscape */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Ambient Background Audio</label>
              <select
                value={soundscape}
                onChange={(e) => setSoundscape(e.target.value as SoundscapeType)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="ocean">🌊 Deep Ocean Swells</option>
                <option value="singing-bowls">🥣 Tibetan Bowls (432Hz Resonance)</option>
                <option value="forest-rain">🌧️ Forest Rain & Mist</option>
                <option value="theta-binaural">🧠 4Hz Theta Binaural Waves</option>
                <option value="alpha-flow">✨ 8Hz Alpha Mental Flow Waves</option>
                <option value="zen-stream">🍃 Zen Mountain Stream</option>
              </select>
            </div>

            {/* Breathwork pattern */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Paced Breathing Guide</label>
              <select
                value={breathTechnique}
                onChange={(e) => setBreathTechnique(e.target.value as BreathPatternType)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="box">🔲 Box Breathing (4-4-4-4 for focus)</option>
                <option value="4-7-8">🌙 4-7-8 Relaxing Breath (for sleep/calm)</option>
                <option value="coherence">❤️ Heart Coherence (5s In, 5s Out)</option>
                <option value="natural">🍃 Natural Mindfulness Flow</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Submit & Generate Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGenerateFullSession}
            disabled={isGenerating}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-semibold text-base shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RotateCw size={20} className="animate-spin text-slate-950" />
                <span>{currentStep || 'Manifesting custom session...'}</span>
              </>
            ) : (
              <>
                <Sparkles size={20} className="text-slate-950" />
                <span>Generate Custom Session & Begin Practice</span>
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-slate-400 mt-2">
            Generated with <span className="text-emerald-400">gemini-3-pro-image-preview</span> ({imageSize}) &{' '}
            <span className="text-emerald-400">gemini-3.8-flash-tts</span> ({voice})
          </p>
        </div>
      </div>
    </div>
  );
};
