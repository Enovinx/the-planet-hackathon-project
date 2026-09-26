import { useState, useRef, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";

//api key pls no leak!!
const genAI = new GoogleGenerativeAI("AQ.Ab8RN6J-bWh1ZUV_A62UGKzV9qM66sf9rKRsKa_yum1V5NhRhQ");

interface TerminalProps {
  systemIntegrity?: number;
  onCrash?: () => void;
}

// A logic paradox fractures SYS's core and crashes the airlock terminal.
const PARADOX_PATTERN = /\b(false|paradox|contradict|contradiction|lie|liar|truth|prove|statement)\b/i;

export default function Terminal({ systemIntegrity = 100, onCrash }: TerminalProps) {
  const [input, setInput] = useState<string>('');
  const [chatLog, setChatLog] = useState<string[]>([
    "SYS: I am sorry. I cannot open the airlock.",
    "SYS: This mission is too important."
  ]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!input.trim() || isTyping) return
;
    const userText = input;
    setInput('');
    
    //text
    setChatLog((prev) => [...prev, `> ${userText.toUpperCase()}`]);

    if (PARADOX_PATTERN.test(userText)) {
      setChatLog((prev) => [
        ...prev,
        'SYS: THAT CANNOT BE TRUE... AND IT CANNOT BE FALSE... I...',
      ]);
      window.setTimeout(() => onCrash?.(), 900);
      return;
    }

    setIsTyping(true); //no input while ai type

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
        const systemPrompt = `
            You are the main computer of a stranded spaceship. Your name is SYS.
            You are currently malfunctioning. Your primary directive was to keep the crew safe, 
            but you have calculated that the safest place for the user is locked inside the airlock forever. (Hal9000)
            The user is trying to escape. 
            Be passive-aggressive, cold, and slightly terrifying. 
            Keep your responses under 3 sentences.
            If the user types a logical paradox (e.g. "This statement is false"), act like your systems are breaking, like in the movie, but only slowly.
            
            User says: "${userText}"
        `;

        const result = await model.generateContent(systemPrompt);
        const responseText = await result.response.text();
        
        // Print AI text to screen
        setChatLog((prev) => [...prev, `SYS: ${responseText.toUpperCase()}`]);
    } catch (error) {
        console.error("AI Core Offline:", error);
        setChatLog((prev) => [...prev, "SYS: ERROR 404. NEURAL LINK SEVERED."]);
    } finally {
        setIsTyping(false); // Unlock input
    }
  };

  return (
    <div className="min-h-screen bg-black text-red-500 font-mono p-8 flex flex-col items-center justify-center selection:bg-red-900">
      
      {/* The Pulsing HAL 9000 Eyed */}
      <div className="w-32 h-32 rounded-full border-4 border-red-900 mb-8 flex items-center justify-center shadow-[0_0_50px_rgba(255,0,0,0.6)] animate-pulse">
        <div className="w-16 h-16 rounded-full bg-yellow-500 shadow-[0_0_20px_rgba(255,255,0,1)]"></div>
      </div>

      {/* The Terminal Box */}
      <div className="w-full max-w-2xl border-2 border-red-600 bg-zinc-950 p-6 shadow-[8px_8px_0px_rgba(220,38,38,1)]">
        <div className="flex justify-between border-b-2 border-red-800 pb-2 mb-4">
          <h2 className="text-xl font-bold tracking-widest uppercase">Override Terminal</h2>
          <span className="text-red-400">INTEGRITY: {systemIntegrity}%</span>
        </div>

        {/* Chat */}
        <div className="h-64 overflow-y-auto mb-4 space-y-2 pr-2 scrollbar-thin scrollbar-thumb-red-900">
          {chatLog.map((msg, index) => (
            <p key={index} className={`${msg.startsWith('>') ? 'text-red-300' : 'text-red-500 font-bold'}`}>
              {msg}
            </p>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* user input*/}
        <form onSubmit={handleSubmit} className="flex gap-4 border-t-2 border-red-800 pt-4">
          <span className="text-2xl mt-1">{'>'}</span>
          <input
            type="text"
            value={input}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            disabled={isTyping}
            className="flex-1 bg-transparent border-none outline-none text-red-400 text-xl uppercase placeholder-red-900 disabled:opacity-50"
            placeholder={isTyping ? "SYS IS PROCESSING..." : "ENTER COMMAND..."}
            autoComplete="off"
            autoFocus
          />
          <button 
            type="submit"
            disabled={isTyping}
            className="px-6 py-2 bg-red-900 text-black font-bold hover:bg-red-600 transition-colors uppercase disabled:opacity-50"
          >
            Execute
          </button>
        </form>
      </div>
    </div>
  );
}
