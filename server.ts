import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));

// Server-side GoogleGenAI client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

const FALLBACK_THEME_IMAGES: Record<string, string> = {
  ocean: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2560&q=85',
  mountain: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2560&q=85',
  forest: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=2560&q=85',
  rain: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2560&q=85',
  cosmic: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=2560&q=85',
  stars: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2560&q=85',
  temple: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=2560&q=85',
  heart: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=2560&q=85',
  lavender: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=2560&q=85',
  default: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=2560&q=85',
};

function getThemedFallbackImage(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('ocean') || p.includes('sea') || p.includes('water') || p.includes('wave') || p.includes('beach')) return FALLBACK_THEME_IMAGES.ocean;
  if (p.includes('mountain') || p.includes('alpine') || p.includes('peak') || p.includes('summit')) return FALLBACK_THEME_IMAGES.mountain;
  if (p.includes('rain') || p.includes('mist') || p.includes('storm')) return FALLBACK_THEME_IMAGES.rain;
  if (p.includes('forest') || p.includes('bamboo') || p.includes('tree') || p.includes('moss') || p.includes('wood')) return FALLBACK_THEME_IMAGES.forest;
  if (p.includes('cosmic') || p.includes('nebula') || p.includes('space') || p.includes('galaxy') || p.includes('astral')) return FALLBACK_THEME_IMAGES.cosmic;
  if (p.includes('star') || p.includes('night') || p.includes('moon') || p.includes('sky')) return FALLBACK_THEME_IMAGES.stars;
  if (p.includes('temple') || p.includes('garden') || p.includes('zen') || p.includes('lantern') || p.includes('shrine')) return FALLBACK_THEME_IMAGES.temple;
  if (p.includes('heart') || p.includes('love') || p.includes('warmth') || p.includes('sun') || p.includes('dawn')) return FALLBACK_THEME_IMAGES.heart;
  return FALLBACK_THEME_IMAGES.default;
}

/**
 * Helper for exponential backoff on transient errors (503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED)
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = 2,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || err?.error?.code;
      const msg = err?.message || String(err || '');
      const isTransient =
        status === 503 ||
        status === 429 ||
        status === 'UNAVAILABLE' ||
        status === 'RESOURCE_EXHAUSTED' ||
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('high demand') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('temporarily') ||
        msg.includes('Spikes in demand');

      if (attempt < retries && isTransient) {
        const delay = baseDelayMs * Math.pow(1.8, attempt) + Math.random() * 400;
        console.warn(
          `Transient Gemini API spike (attempt ${attempt + 1}/${retries + 1}), retrying in ${Math.round(delay)}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * 1. Image Generation Endpoint
 * Model: gemini-3-pro-image-preview
 * Supports user-selected resolution: 1K, 2K, 4K
 */
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, imageSize = '1K', aspectRatio = '16:9' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the environment.',
      });
    }

    const enhancedPrompt = `${prompt}. Serene, tranquil, atmospheric, peaceful meditation sanctuary visual, cinematic composition, breathtaking natural beauty, soft harmonic lighting, photorealistic details, high artistic quality.`;

    try {
      const response = await retryWithBackoff(
        () =>
          ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
              parts: [{ text: enhancedPrompt }],
            },
            config: {
              imageConfig: {
                aspectRatio: aspectRatio as '16:9' | '1:1' | '9:16' | '4:3',
                imageSize: imageSize as '1K' | '2K' | '4K',
              },
            },
          }),
        1,
        1500
      );

      let imageUrl: string | null = null;
      const candidates = response.candidates || [];
      for (const candidate of candidates) {
        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
        if (imageUrl) break;
      }

      if (imageUrl) {
        return res.json({
          imageUrl,
          imageSize,
          aspectRatio,
        });
      }
    } catch (genErr: any) {
      console.warn('gemini-3-pro-image-preview generation warning (using themed high-res fallback):', genErr?.message);
    }

    // Fallback to high-resolution theme visual if paid model key not enabled
    const fallbackImage = getThemedFallbackImage(prompt);
    res.json({
      imageUrl: fallbackImage,
      imageSize,
      aspectRatio,
      fallback: true,
    });
  } catch (error: any) {
    console.error('Error generating image:', error);
    const fallbackImage = getThemedFallbackImage(req.body?.prompt || '');
    res.json({
      imageUrl: fallbackImage,
      imageSize: req.body?.imageSize || '1K',
      aspectRatio: req.body?.aspectRatio || '16:9',
      fallback: true,
    });
  }
});

/**
 * 2. Text to Speech (TTS) Endpoint
 * Uses Google's high-efficiency model: gemini-3.8-flash-lite-tts
 * Prebuilt voices: 'Kore', 'Fenrir', 'Puck', 'Zephyr', 'Charon'
 * Includes automatic retry on 503 high demand spikes and graceful fallback to client speech synthesis.
 */
app.post('/api/generate-speech', async (req, res) => {
  try {
    const { text, voice = 'Kore', style, speaker = 'Meditation Guide' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the environment.',
      });
    }

    // Clean up markup tags to ensure seamless audio synthesis
    const cleanText = String(text)
      .replace(/<pause>/gi, ' ... ')
      .replace(/<breath>/gi, ' ... ')
      .replace(/<sigh>/gi, ' ... ')
      .replace(/\|yeah\|/gi, '')
      .replace(/\|mhm\|/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const speechStyle =
      style ||
      'Calm, soothing, slow-paced mindful meditation guide with soft breaths and gentle warmth';

    // 1. Primary: Use gemini-3.8-flash-lite-tts with exponential retry
    try {
      const response = await retryWithBackoff(
        () =>
          ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: cleanText,
                    speechMetadata: {
                      style: speechStyle,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice },
                },
              },
            },
          }),
        2,
        1000
      );

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (base64Audio) {
        return res.json({
          audioBase64: base64Audio,
          mimeType: 'audio/wav',
          voice,
          model: 'gemini-3.8-flash-lite-tts',
        });
      }
    } catch (liteErr: any) {
      console.warn('gemini-3.8-flash-lite-tts warning, attempting gemini-3.8-flash-tts:', liteErr?.message);
    }

    // 2. Secondary fallback: gemini-3.8-flash-tts with retry
    try {
      const response = await retryWithBackoff(
        () =>
          ai.models.generateContent({
            model: 'gemini-3.8-flash-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: cleanText,
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice },
                },
              },
            },
          }),
        1,
        1200
      );

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (base64Audio) {
        return res.json({
          audioBase64: base64Audio,
          mimeType: 'audio/wav',
          voice,
          model: 'gemini-3.8-flash-tts',
        });
      }
    } catch (ttsErr: any) {
      console.warn('gemini-3.8-flash-tts fallback failed:', ttsErr?.message);
    }

    // 3. Graceful fallback when Gemini audio experiences high demand (e.g. 503)
    // Return 200 with fallback indicator so client meditation is never disrupted
    return res.json({
      audioBase64: null,
      webSpeechFallback: true,
      demandHigh: true,
      cleanText,
      voice,
      notice: 'Gemini audio is temporarily experiencing high traffic. Local mindful voice guide is active.',
    });
  } catch (error: any) {
    console.warn('Speech generation fallback activated due to API demand/error:', error?.message);
    const cleanText = String(req.body?.text || '')
      .replace(/<[^>]+>/g, ' ')
      .trim();
    return res.json({
      audioBase64: null,
      webSpeechFallback: true,
      demandHigh: true,
      cleanText,
      voice: req.body?.voice || 'Kore',
      notice: 'Gemini audio is temporarily experiencing high traffic. Local mindful voice guide is active.',
    });
  }
});

/**
 * 3. Multi-turn Chat Interface Endpoint
 * Models:
 * - gemini-3.5-flash (general tasks)
 * - gemini-3.1-pro-preview (complex tasks)
 * - gemini-3.1-flash-lite (fast tasks)
 */
app.post('/api/chat', async (req, res) => {
  try {
    const {
      messages = [],
      model = 'gemini-3.5-flash',
      rolePersona = 'zen_master',
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the environment.',
      });
    }

    // Allowed model validation
    const allowedModels = [
      'gemini-3.5-flash',
      'gemini-3.1-pro-preview',
      'gemini-3.1-flash-lite',
    ];
    const selectedModel = allowedModels.includes(model)
      ? model
      : 'gemini-3.5-flash';

    // Persona system instructions
    let personaInstruction = '';
    if (rolePersona === 'zen_master') {
      personaInstruction = `You are Master Bodhi, an empathetic Zen mindfulness master and meditation guide.
Your tone is deeply calming, patient, grounded, poetic, and compassionate.
You help seekers explore mindfulness, relieve stress, manage busy thoughts, practice breathwork, and craft personalized meditation sessions.
When appropriate, you can suggest a complete meditation session outline with:
- Suggested Title
- Visual Sanctuary Concept
- Breathing Technique (e.g. Box Breathing 4-4-4-4, 4-7-8 Relaxing Breath, Coherence 5.5s)
- A short sample guided script with vocal cues like <breath> or <pause>
Offer gentle encouragement and practical wisdom.`;
    } else if (rolePersona === 'somatic_guide') {
      personaInstruction = `You are Maya, a compassionate somatic mindfulness coach specializing in nervous system regulation and anxiety relief.
Your tone is warm, gentle, reassuring, and trauma-informed.
You focus on bodily grounding, vagus nerve stimulation, release of physical tension, and slow restorative breathing.
Help users reconnect with bodily safety and calm.`;
    } else if (rolePersona === 'neuro_mindfulness') {
      personaInstruction = `You are Dr. Marcus, a neuroscientist and meditation instructor.
You combine modern neuroscience with contemplative mindfulness practices.
You explain how meditation reduces amygdala reactivity, enhances prefrontal cortex activity, and improves heart-rate variability (HRV), providing science-backed techniques for focus and recovery.`;
    } else {
      personaInstruction = `You are a calm, empathetic AI meditation guide dedicated to helping users find inner peace, focus, and restorative relaxation.`;
    }

    // Format conversation contents for generateContent
    const formattedContents = messages.map((m: any) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || m.text || '' }],
    }));

    let reply = '';
    let activeModelUsed = selectedModel === 'gemini-3.5-flash' ? 'gemini-3.8-flash' : selectedModel;

    try {
      const response = await retryWithBackoff(
        () =>
          ai.models.generateContent({
            model: activeModelUsed,
            contents: formattedContents,
            config: {
              systemInstruction: personaInstruction,
            },
          }),
        2,
        800
      );
      reply = response.text || '';
    } catch (modelErr: any) {
      if (activeModelUsed !== 'gemini-3.8-flash') {
        console.warn('Retrying chat with gemini-3.8-flash due to error:', modelErr?.message);
        const fallbackResponse = await retryWithBackoff(
          () =>
            ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: formattedContents,
              config: {
                systemInstruction: personaInstruction,
              },
            }),
          1,
          1000
        );
        reply = fallbackResponse.text || '';
        activeModelUsed = 'gemini-3.8-flash';
      } else {
        throw modelErr;
      }
    }

    res.json({
      reply,
      model: activeModelUsed,
    });
  } catch (error: any) {
    console.error('Error in chat:', error);
    const message = error?.message || 'Failed to process chat message';
    res.status(500).json({ error: message });
  }
});

/**
 * 4. Generate Complete Custom Session Script & Metadata
 * Uses structured JSON schema
 */
app.post('/api/generate-session-plan', async (req, res) => {
  try {
    const {
      topic = 'Peaceful evening wind-down',
      durationMinutes = 5,
      intent = 'Stress relief & relaxation',
      preferredVoice = 'Kore',
      imageSize = '2K',
    } = req.body;

    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the environment.',
      });
    }

    const prompt = `Create a complete guided meditation session based on:
- Topic: ${topic}
- Duration: approximately ${durationMinutes} minutes
- Intention/Focus: ${intent}
- Preferred Voice: ${preferredVoice}

The session must include:
1. An inspiring, peaceful title.
2. A brief 1-2 sentence description.
3. Recommended breathing pattern ('box' | '4-7-8' | 'coherence' | 'natural').
4. Recommended soundscape ('ocean' | 'singing-bowls' | 'forest-rain' | 'theta-binaural' | 'alpha-flow' | 'zen-stream').
5. A detailed, poetic visual scenery prompt suitable for rendering with high-resolution image model gemini-3-pro-image-preview.
6. A complete spoken meditation script (including gentle pauses marked with <pause> and soft breaths marked with <breath>).
7. 4 to 6 timed script segments for displaying subtitles sequentially.`;

    const response = await retryWithBackoff(
      () =>
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            breathTechnique: {
              type: Type.STRING,
              description: 'One of: box, 4-7-8, coherence, natural',
            },
            soundscape: {
              type: Type.STRING,
              description:
                'One of: ocean, singing-bowls, forest-rain, theta-binaural, alpha-flow, zen-stream',
            },
            visualPrompt: {
              type: Type.STRING,
              description:
                'Detailed serene sanctuary visual prompt for image generation',
            },
            voice: {
              type: Type.STRING,
              description: 'One of: Kore, Fenrir, Puck, Zephyr, Charon',
            },
            voiceStyle: { type: Type.STRING },
            fullScript: {
              type: Type.STRING,
              description:
                'The full guide script with <breath> and <pause> cues for TTS',
            },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  cueTimeSec: { type: Type.INTEGER },
                  text: { type: Type.STRING },
                },
                required: ['cueTimeSec', 'text'],
              },
            },
          },
          required: [
            'title',
            'description',
            'category',
            'breathTechnique',
            'soundscape',
            'visualPrompt',
            'voice',
            'fullScript',
            'segments',
          ],
        },
      },
    }),
    2,
    800
  );

  const sessionData = JSON.parse(response.text || '{}');
    res.json(sessionData);
  } catch (error: any) {
    console.error('Error creating session plan:', error);
    const message = error?.message || 'Failed to generate session plan';
    res.status(500).json({ error: message });
  }
});

/**
 * 5. Daily Empowering Affirmation Endpoint
 * Uses gemini-3.8-flash with structured JSON output and retry
 */
app.post('/api/daily-affirmation', async (req, res) => {
  try {
    const { theme = 'peace', userName = '' } = req.body || {};

    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the environment.',
      });
    }

    const todayDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    const prompt = `Generate an inspiring, empowering, and deeply grounding daily affirmation for meditation and mindfulness practice for ${todayDate}.
Focus theme: ${theme}.
${userName ? `Personalize gently for: ${userName}.` : ''}

The affirmation should be:
1. Poetic, empowering, and transformative (1-2 sentences).
2. A short breathing mantra (e.g. "Inhale trust · Exhale hesitation").
3. A theme category label (e.g. "Inner Sanctuary", "Unshakable Peace", "Courage & Release", "Self-Compassion", "Clarity & Presence").
4. A reflective contemplative prompt for mindfulness journaling.`;

    const response = await retryWithBackoff(
      () =>
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                affirmation: {
                  type: Type.STRING,
                  description: 'The empowering mindfulness affirmation quote',
                },
                theme: {
                  type: Type.STRING,
                  description: 'The theme of the affirmation',
                },
                breathingMantra: {
                  type: Type.STRING,
                  description: 'Short anchor phrase like Inhale peace · Exhale doubt',
                },
                mindfulPrompt: {
                  type: Type.STRING,
                  description: 'A 1-sentence contemplative reflection question',
                },
                author: {
                  type: Type.STRING,
                  description: 'Attribution, e.g. Zen Sanctuary Guide',
                },
              },
              required: ['affirmation', 'theme', 'breathingMantra', 'mindfulPrompt'],
            },
          },
        }),
      2,
      800
    );

    const data = JSON.parse(response.text || '{}');
    return res.json(data);
  } catch (error: any) {
    console.warn('Affirmation fallback activated:', error?.message);
    return res.json({
      affirmation:
        'Within this very breath lies everything you need. You are grounded, capable, and completely at peace with who you are becoming.',
      theme: 'Inner Sanctuary',
      breathingMantra: 'Inhale stillness · Exhale uncertainty',
      mindfulPrompt: 'What peaceful quality will you embody in your interactions today?',
      author: 'Zen Sanctuary Reflection',
      fallback: true,
    });
  }
});

// Vite middleware in dev, static files in production
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SerenePulse Server running on http://0.0.0.0:${PORT}`);
});
