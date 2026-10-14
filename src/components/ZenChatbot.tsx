import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatModel, ChatPersona, MeditationSession } from '../types';
import {
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  Zap,
  Brain,
  Shield,
  Compass,
  ArrowRight,
  Flame,
} from 'lucide-react';

interface ZenChatbotProps {
  onApplySessionIdea?: (topic: string, intent: string) => void;
}

export const ZenChatbot: React.FC<ZenChatbotProps> = ({ onApplySessionIdea }) => {
  // Conversation history maintained in state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `Peace to you. I am Master Bodhi, your Zen mindfulness companion. 

Whether you are carrying work stress, seeking a custom meditation session, or learning how to quiet a restless mind, I am here with you. What is on your heart today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Model selection requirement:
  // - gemini-3.1-pro-preview for particularly complex tasks
  // - gemini-3.5-flash for general tasks (default)
  // - gemini-3.1-flash-lite for tasks that should happen fast
  const [selectedModel, setSelectedModel] = useState<ChatModel>('gemini-3.5-flash');

  // Role persona system instruction
  const [persona, setPersona] = useState<ChatPersona>('zen_master');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll thread to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Send entire conversation history for true multi-turn context
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
          rolePersona: persona,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get guidance');
      }

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: data.reply || 'May this moment bring you stillness.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `I apologize, I encountered a gentle pause: ${err.message || 'Unable to connect'}. Take a slow breath, and feel free to try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'model',
        content: `A fresh breath, an open horizon. How may I guide your practice today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Quick suggestion prompts
  const suggestions = [
    'I feel tight anxiety in my chest. What somatic exercise helps right now?',
    'Create a 5-minute deep sleep meditation session with starry night visuals.',
    'Why does my mind wander so much during meditation, and how do I let go?',
    'Teach me how Box Breathing resets the nervous system.',
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 h-[calc(100vh-130px)] flex flex-col animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Sparkles size={16} />
            </span>
            <h2 className="text-xl font-serif-zen font-medium text-white tracking-wide">
              Gemini Mindfulness Sanctuary Companion
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Empathetic multi-turn mindful coaching, personalized script design, and somatic calming.
          </p>
        </div>

        {/* Model & Persona Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Persona selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setPersona('zen_master')}
              className={`px-2.5 py-1 rounded-lg transition ${
                persona === 'zen_master'
                  ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Zen Master Bodhi - Mindfulness Wisdom"
            >
              🧘 Master Bodhi
            </button>
            <button
              onClick={() => setPersona('somatic_guide')}
              className={`px-2.5 py-1 rounded-lg transition ${
                persona === 'somatic_guide'
                  ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Maya - Somatic Nervous System Regulation"
            >
              🌿 Maya (Somatic)
            </button>
            <button
              onClick={() => setPersona('neuro_mindfulness')}
              className={`px-2.5 py-1 rounded-lg transition ${
                persona === 'neuro_mindfulness'
                  ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Dr. Marcus - Neuroscience & Focus"
            >
              🧠 Dr. Marcus (Neuro)
            </button>
          </div>

          {/* Model selector requirement */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setSelectedModel('gemini-3.5-flash')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedModel === 'gemini-3.5-flash'
                  ? 'bg-teal-500/25 text-teal-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="gemini-3.5-flash: Balanced for general mindfulness tasks"
            >
              3.5 Flash (General)
            </button>
            <button
              onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedModel === 'gemini-3.1-pro-preview'
                  ? 'bg-purple-500/25 text-purple-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="gemini-3.1-pro-preview: Deep cognitive inquiry & complex tasks"
            >
              3.1 Pro (Complex)
            </button>
            <button
              onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedModel === 'gemini-3.1-flash-lite'
                  ? 'bg-amber-500/25 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="gemini-3.1-flash-lite: Fast, rapid calming cues"
            >
              3.1 Lite (Fast)
            </button>
          </div>

          <button
            onClick={handleClearChat}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
            title="Reset Conversation"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Scrollable Message Thread */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scroll-smooth">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                  isUser
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {isUser ? <User size={15} /> : <Bot size={15} />}
              </div>

              <div
                className={`rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-emerald-600/90 text-white rounded-tr-none shadow-md'
                    : 'bg-slate-900/90 border border-white/10 text-slate-200 rounded-tl-none shadow-xl backdrop-blur-md'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                {/* If the message looks like a meditation recommendation, provide action button */}
                {!isUser &&
                  (msg.content.toLowerCase().includes('meditation') ||
                    msg.content.toLowerCase().includes('session') ||
                    msg.content.toLowerCase().includes('visual')) && (
                    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Turn this advice into a custom session?
                      </span>
                      <button
                        onClick={() =>
                          onApplySessionIdea?.(
                            'Guided Meditation based on Zen advice',
                            msg.content.slice(0, 140)
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium border border-emerald-500/40 transition"
                      >
                        <span>Open Session Studio</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}

                <div
                  className={`text-[10px] mt-1.5 text-right font-mono ${
                    isUser ? 'text-emerald-200/80' : 'text-slate-500'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 mr-auto max-w-[85%] items-center text-xs text-slate-400">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Bot size={15} className="animate-spin" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse delay-150" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse delay-300" />
              <span className="ml-2 font-mono text-[11px] text-slate-400">
                Reflecting with {selectedModel}...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar (when few messages or for inspiration) */}
      <div className="py-2 flex gap-2 overflow-x-auto no-scrollbar">
        {suggestions.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(sug)}
            className="px-3 py-1.5 rounded-full text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 whitespace-nowrap transition shrink-0"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Input Form Bar */}
      <div className="pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center bg-slate-900 border border-white/10 rounded-2xl p-1.5 shadow-xl focus-within:border-emerald-500 transition"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${
              persona === 'zen_master'
                ? 'Master Bodhi'
                : persona === 'somatic_guide'
                ? 'Maya'
                : 'Dr. Marcus'
            } for mindful guidance, breathing tips, or a custom session script...`}
            className="flex-1 bg-transparent px-4 py-2.5 text-xs md:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium transition disabled:opacity-40 disabled:hover:bg-emerald-500"
          >
            <Send size={16} />
          </button>
        </form>
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 px-2 font-mono">
          <span>Active Role: {persona}</span>
          <span>Engine: {selectedModel}</span>
        </div>
      </div>
    </div>
  );
};
