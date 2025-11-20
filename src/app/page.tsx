"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Mic, Wifi, Battery, MessageSquare, Volume2 } from 'lucide-react';

function useBattery() {
  const [level, setLevel] = useState(100);
  const [charging, setCharging] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((bat: any) => {
        setLevel(bat.level * 100); setCharging(bat.charging);
        bat.addEventListener('levelchange', () => setLevel(bat.level * 100));
        bat.addEventListener('chargingchange', () => setCharging(bat.charging));
      });
    }
  }, []);
  return { level: Math.round(level), charging };
}

function useNetwork() {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', () => setIsOnline(true));
      window.addEventListener('offline', () => setIsOnline(false));
    }
  }, []);
  return isOnline;
}

const speak = (text: string) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.8; utterance.rate = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const botVoice = voices.find(v => v.name.includes('Google US') || v.name.includes('Samantha'));
    if (botVoice) utterance.voice = botVoice;
    window.speechSynthesis.speak(utterance);
  }
};

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Uint8Array | null = null;

const initAudio = async () => {
  if (audioContext) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 512;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    return true;
  } catch (e) { console.error("Audio failed", e); return false; }
};

function AudioReactiveHeart({ audioActive }: { audioActive: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const count = 4000; const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = Math.random() * Math.PI * 2; const u = Math.random() * Math.PI;
      let x = 16 * Math.pow(Math.sin(t), 3);
      let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      let z = 10 * Math.cos(u) * Math.sin(t) * 0.5;
      x *= 0.05; y *= 0.05; z *= 0.05;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    return pos;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    let scale = 1; let colorShift = 0;

    if (audioActive && analyser && dataArray) {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0; for(let i = 0; i < 50; i++) sum += dataArray[i];
      const average = sum / 50;
      scale = 1 + (average / 128) * 0.8; colorShift = average / 255;
    } else { scale = 1 + Math.sin(Date.now() * 0.002) * 0.05; }

    ref.current.scale.setScalar(scale); ref.current.rotation.y += 0.002;
    (ref.current.material as THREE.PointsMaterial).color.setHSL(0, 1, 0.5 + colorShift * 0.5);
  });

  return (
    <group rotation={[0, 0, Math.PI]}>
       <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
          <PointMaterial transparent color="red" size={0.02} sizeAttenuation={true} depthWrite={false} blending={THREE.AdditiveBlending} />
       </Points>
    </group>
  );
}

const RealAIService = {
  async ask(question: string, apiKey: string) {
    if (!apiKey) throw new Error("NO_API_KEY");
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: "You are VITAL_OS." }, { role: "user", content: question }], max_tokens: 150 })
    });
    if (!res.ok) throw new Error(`API_ERROR: ${res.status}`);
    const data = await res.json(); return data.choices[0].message.content;
  }
};

export default function Page() {
  const [audioReady, setAudioReady] = useState(false);
  const [activeModule, setActiveModule] = useState<'VISUALIZER' | 'AI_CHAT'>('VISUALIZER');
  const battery = useBattery(); const isOnline = useNetwork();
  const [apiKey, setApiKey] = useState(''); const [input, setInput] = useState('');
  const [history, setHistory] = useState<{role: 'user'|'ai', text: string}[]>([]); const [loading, setLoading] = useState(false);

  const activateSystem = async () => { if (await initAudio()) { setAudioReady(true); speak("System Online."); } };
  
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault(); if (!input.trim()) return;
    const userText = input; setHistory(p => [...p, { role: 'user', text: userText }]);
    setInput(''); setLoading(true);
    try {
      const reply = await RealAIService.ask(userText, apiKey);
      setHistory(p => [...p, { role: 'ai', text: reply }]); speak(reply);
    } catch (err: any) { setHistory(p => [...p, { role: 'ai', text: `ERR: ${err.message}` }]); speak("Error connecting to server."); } 
    finally { setLoading(false); }
  };

  return (
    <main className="relative w-screen h-screen bg-black text-white overflow-hidden font-mono">
      <div className="absolute inset-0 z-0"><Canvas camera={{ position: [0, 0, 4] }}><ambientLight intensity={0.5} /><AudioReactiveHeart audioActive={audioReady} /></Canvas></div>
      <div className="absolute inset-0 z-10 flex flex-col p-6 pointer-events-none">
        <header className="flex justify-between items-start">
           <div className="pointer-events-auto cursor-pointer" onClick={activateSystem}>
              <h1 className="text-2xl font-bold tracking-tighter flex items-center gap-2">VITAL<span className="text-red-600">FINAL</span>{!audioReady && <span className="text-[10px] bg-red-900 px-2 py-1 rounded animate-pulse">ACTIVATE</span>}</h1>
           </div>
           <div className="flex flex-col items-end text-xs text-gray-400">
              <div className="flex items-center gap-2"><Wifi size={14} className={isOnline?"text-green-500":"text-red-500"}/><span>{isOnline?"ONLINE":"OFFLINE"}</span></div>
              <div className="flex items-center gap-2"><Battery size={14} className={battery.charging?"text-yellow-500":"text-green-500"}/><span>{battery.level}%</span></div>
           </div>
        </header>
        <div className="flex-1 flex items-center justify-center pointer-events-auto">
           {activeModule === 'VISUALIZER' && <div className="text-center">{audioReady ? <p className="text-red-500 text-sm animate-pulse">SENSORS LISTENING...</p> : <button onClick={activateSystem} className="border border-gray-600 px-6 py-2 text-xs hover:bg-white hover:text-black">ENABLE MIC</button>}</div>}
           {activeModule === 'AI_CHAT' && (
              <div className="w-full max-w-lg h-[60vh] bg-black/80 backdrop-blur border border-gray-800 flex flex-col">
                 <div className="p-3 border-b border-gray-800 flex justify-between items-center"><span className="text-xs font-bold flex items-center gap-2"><Cpu size={14}/> CORE</span>
                 <input type="password" placeholder="API KEY" className="bg-black border border-gray-700 text-[10px] px-2 py-1 w-32 focus:w-64 transition-all outline-none text-gray-300" value={apiKey} onChange={e=>setApiKey(e.target.value)}/></div>
                 <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">{history.map((msg,i)=><div key={i} className={`flex \${msg.role==='user'?'justify-end':'justify-start'}\`}><div className={\`max-w-[85%] p-3 \${msg.role==='user'?'bg-gray-800':'bg-red-900/20 text-red-100'}\`}>{msg.text}</div></div>)}{loading&&<div className="text-xs text-gray-500 animate-pulse">COMPUTING...</div>}</div>
                 <form onSubmit={handleSend} className="p-3 border-t border-gray-800 flex gap-2"><input value={input} onChange={e=>setInput(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" placeholder="Command..."/><button type="submit"><MessageSquare size={16}/></button></form>
              </div>
           )}
        </div>
        <footer className="pointer-events-auto flex justify-center gap-8 pb-8">
           <button onClick={()=>setActiveModule('VISUALIZER')} className={`flex flex-col items-center gap-1 text-xs \${activeModule==='VISUALIZER'?'text-red-500':'text-gray-600'}\`}><Volume2 size={20}/><span>VISUAL</span></button>
           <button onClick={()=>setActiveModule('AI_CHAT')} className={`flex flex-col items-center gap-1 text-xs \${activeModule==='AI_CHAT'?'text-red-500':'text-gray-600'}\`}><MessageSquare size={20}/><span>AI</span></button>
        </footer>
      </div>
    </main>
  );
}