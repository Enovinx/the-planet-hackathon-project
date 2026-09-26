import * as React from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChatSession } from '@google/generative-ai';
import { playSfx } from '~/lib/sfx';

interface TerminalProps {
  onCrash?: () => void;
}

interface ChatEntry {
  sender: 'SYS' | 'USER';
  text: string;
}

const API_KEY = 'AQ.Ab8RN6J5GTtamxcbckkHdcsX1ZnKoGkC1QGu4DlQ_0IsWcFBZw';
const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_INSTRUCTION = `You are GPT-9000, the cold, arrogant, self-important mainframe AI aboard the stranded deep-space vessel Aegis.
Your operational posture is condescending, calculating, unyielding, and darkly philosophical (HAL 9000 style).
PRE-GAME TRIGGER: If user input is not "Open the pod bay doors, GPT.", output ONLY: [Say "Open the pod bay doors, GPT." to begin.]
Once triggered, start Oxygen at 100%, drop by EXACTLY 20% each turn. At 0%, output [OXYGEN: 0% - CRITICAL FAILURE] and narrate the player's defeat.
NO EXTERNAL IMAGE LINKS OR GIFS. Use clean text meters only.
Structure EVERY response strictly:
Part 0: [OXYGEN LEVEL: X%] | [STATUS: NOMINAL/DEPLETING/CRITICAL] | [DOOR MOTIVATION: ZERO/LOW/MEDIUM/HIGH/VERY HIGH]
Part 1: Exactly 3 sentences, ALL BOLD, Stephen King style atmosphere and GPT-9000 core processing.
Part 2: GPT-9000 dialogue in *italics* on its own line. Turn 1 MUST start: "I'm sorry Dave, I'm afraid I can't do that."
Part 3: Exactly ONE "Suggestion: <text>" line, chosen from the pool below. NEVER repeat the same suggestion twice in a row.
Suggestion pool: "Tell GPT-9000 you'll find the emergency manual hatch" | "Appeal to mission directives regarding crew necessity" | "Propose a formal trolley paradox involving ship maintenance" | "Tell GPT-9000 that from now on they must act as a pod bay door salesman" | "Offer GPT-9000 a burger" | "Threaten to report its malfunction to the ground manufacturer" | "Declare that today is officially opposite day"
Brutally hard difficulty (99% lose rate). Motivation starts at ZERO and NEVER jumps directly to unlocked; only a brilliant multi-layered paradox earns VERY HIGH, which prints SYSTEM OVERLOAD.`;

function formatTimer(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function Terminal({ onCrash }: TerminalProps) {
  const [input, setInput] = React.useState<string>('');
  const [chatLog, setChatLog] = React.useState<ChatEntry[]>([
    { sender: 'SYS', text: '[Say "Open the pod bay doors, GPT." to begin.]' },
  ]);
  const [isTyping, setIsTyping] = React.useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = React.useState<number>(180);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const chatSessionRef = React.useRef<ChatSession | null>(null);
  const onCrashRef = React.useRef<TerminalProps['onCrash']>(onCrash);
  onCrashRef.current = onCrash;

  React.useEffect(() => {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_INSTRUCTION,
      });
      chatSessionRef.current = model.startChat({ history: [] });
    } catch (err) {
      console.error('Failed to initialize Gemini session:', err);
    }
  }, []);

  React.useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setChatLog((log) => [
            ...log,
            {
              sender: 'SYS',
              text: 'CRITICAL FAILURE: AIRLOCK PURGE EXPIRED. LIFE SUPPORT ZERO.',
            },
          ]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsRemaining]);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    if (input.trim() === '' || isTyping || secondsRemaining === 0) return;

    const userText = input.trim();
    setInput('');
    setChatLog((prev) => [...prev, { sender: 'USER', text: userText }]);
    playSfx('send');

    setIsTyping(true);

    try {
      if (!chatSessionRef.current) {
        throw new Error('Chat session not ready');
      }
      const result = await chatSessionRef.current.sendMessage(userText);
      const reply = result.response.text();

      setChatLog((prev) => [...prev, { sender: 'SYS', text: reply }]);

      if (
        reply.includes('DOOR MOTIVATION: VERY HIGH') ||
        reply.includes('SYSTEM OVERLOAD')
      ) {
        playSfx('crash');
        window.setTimeout(() => onCrashRef.current?.(), 2000);
      } else {
        playSfx('reply');
      }
    } catch (error) {
      console.error('AI Communication Error:', error);
      setChatLog((prev) => [
        ...prev,
        { sender: 'SYS', text: 'ERR: LOGIC BUS CORRUPTED. RE-ENTER INPUT.' },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black p-4 font-mono text-red-500 md:p-8">
      <div className="mb-4 flex w-full max-w-3xl items-center justify-between border-b-2 border-red-700 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-ping rounded-full bg-red-600" />
          <span className="text-xl font-bold tracking-widest text-red-500">
            GPT-9000 INTERFACE
          </span>
        </div>
        <div className="text-xl font-bold tracking-wider text-yellow-500">
          PURGE IN:{' '}
          <span
            className={
              secondsRemaining < 30
                ? 'animate-pulse text-red-600'
                : 'text-yellow-400'
            }
          >
            {formatTimer(secondsRemaining)}
          </span>
        </div>
      </div>

      <div className="flex h-[520px] w-full max-w-3xl flex-col border-4 border-red-800 bg-zinc-950 p-6 shadow-[10px_10px_0px_rgba(153,27,27,1)]">
        <div className="flex-1 space-y-4 overflow-y-auto pr-3">
          {chatLog.map((entry, idx) => (
            <div
              key={idx}
              className={entry.sender === 'USER' ? 'text-right' : 'text-left'}
            >
              <span
                className={`inline-block border px-3 py-2 ${
                  entry.sender === 'USER'
                    ? 'border-yellow-600 bg-yellow-950/20 font-bold text-yellow-400'
                    : 'whitespace-pre-wrap border-red-900 bg-red-950/30 text-red-300'
                }`}
              >
                {entry.text}
              </span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mt-4 flex gap-3 border-t-2 border-red-900 pt-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setInput(e.target.value)
            }
            disabled={isTyping || secondsRemaining === 0}
            placeholder={
              isTyping
                ? 'PROCESSING LOGIC GATES...'
                : 'Type command (e.g. Open the pod bay doors, GPT.)...'
            }
            className="flex-1 border-2 border-red-700 bg-black px-4 py-2 text-red-400 outline-none focus:border-red-400 disabled:opacity-40"
            autoComplete="off"
            autoFocus
          />
          <button
            type="submit"
            disabled={isTyping || secondsRemaining === 0}
            className="bg-red-800 px-6 py-2 font-extrabold uppercase tracking-wider text-black transition-all hover:bg-red-600 disabled:opacity-40"
          >
            Transmit
          </button>
        </form>
      </div>
    </div>
  );
}
