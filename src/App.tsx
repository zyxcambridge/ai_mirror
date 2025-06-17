import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Settings as Lungs, Image, X, Mic } from 'lucide-react';

function App() {
  const [mode, setMode] = useState<'subtitle' | 'breathing' | 'memories'>('subtitle');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [transformedText, setTransformedText] = useState('');
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [counter, setCounter] = useState(4);
  const [memories, setMemories] = useState<string[]>([
    'https://images.pexels.com/photos/3768131/pexels-photo-3768131.jpeg',
    'https://images.pexels.com/photos/4148842/pexels-photo-4148842.jpeg',
    'https://images.pexels.com/photos/3985368/pexels-photo-3985368.jpeg',
    'https://images.pexels.com/photos/5638612/pexels-photo-5638612.jpeg',
    'https://images.pexels.com/photos/4609038/pexels-photo-4609038.jpeg'
  ]);
  const [currentMemory, setCurrentMemory] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // Or 'zh-CN' for Chinese

      recognition.onresult = (event) => {
        let currentInterimTranscript = '';
        let finalTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            currentInterimTranscript += result[0].transcript;
          }
        }

        setInterimTranscript(currentInterimTranscript);

        // Process the final transcript
        if (finalTranscript) {
          setInterimTranscript(''); // Clear interim when final is processed
          const command = finalTranscript.toLowerCase().trim();
          let commandProcessed = false;
          const textInputPrefixes = ["set input to ", "set text to ", "dictate ", "say "];
          let matchedPrefix = null;

          for (const prefix of textInputPrefixes) {
            if (command.startsWith(prefix)) {
              matchedPrefix = prefix;
              break;
            }
          }

          if (matchedPrefix) {
            const content = finalTranscript.substring(matchedPrefix.length).trim();
            setInputText(content);
            setTranscript(content); // Or finalTranscript for full command log
            console.log(`Voice command: Set input to "${content}"`);
            commandProcessed = true;
          } else {
            // Voice commands for mode switching
            // Note: If recognition.lang is changed, these commands need to be localized.
            if (["go to subtitle mode", "switch to subtitle", "open subtitle"].includes(command)) {
              setMode('subtitle');
              setInputText('');
              setTranscript(''); // Clear transcript or set to command
              console.log("Voice command: Switch to subtitle mode");
              commandProcessed = true;
            } else if (["go to breathing mode", "switch to breathing", "start breathing exercise", "open breathing"].includes(command)) {
              setMode('breathing');
              setInputText('');
              setTranscript(''); // Clear transcript or set to command
              console.log("Voice command: Switch to breathing mode");
              commandProcessed = true;
            } else if (["go to memories mode", "switch to memories", "show memories", "open memories"].includes(command)) {
              setMode('memories');
              setInputText('');
              setTranscript(''); // Clear transcript or set to command
              console.log("Voice command: Switch to memories mode");
              commandProcessed = true;
            } else if (["enter fullscreen", "go fullscreen", "exit fullscreen", "leave fullscreen", "toggle fullscreen"].includes(command)) {
              toggleFullscreen();
              setInputText('');
              setTranscript(command); // Or set to '' if preferred
              console.log("Voice command: Toggle fullscreen");
              commandProcessed = true;
            }
          }

          if (!commandProcessed) {
            // If no command was processed, append to inputText for dictation
            setInputText(prevInput => prevInput + (prevInput.length > 0 && finalTranscript.length > 0 ? ' ' : '') + finalTranscript);
            setTranscript(finalTranscript); // Also update transcript state for consistency if needed elsewhere
          } else {
            // If a command was processed, we've already cleared inputText and transcript
            // but we might want to set the transcript state to the command itself for record, or keep it empty
            setTranscript(finalTranscript); // Or setTranscript('') if preferred after a command
          }
        }
      };

      recognition.onerror = (event) => {
        setVoiceError(`Speech recognition error: ${event.error}`);
        setIsListening(false); // Ensure listening stops on error
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setSpeechRecognition(recognition);
    } else {
      setVoiceError('Voice recognition not supported in this browser.');
    }
  }, []);

  const startListening = () => {
    if (speechRecognition && !isListening) {
      setTranscript(''); // Clear previous final transcript
      setInterimTranscript(''); // Clear previous interim transcript
      setVoiceError('');   // Clear previous error
      try {
        speechRecognition.start();
        setIsListening(true);
      } catch (error) {
        setVoiceError(`Error starting recognition: ${error}`);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (speechRecognition && isListening) {
      speechRecognition.stop();
      setIsListening(false); // This will also be set by onend, but good to be explicit
    }
  };

  // Transform aggressive statements to "I feel" statements
  useEffect(() => {
    const transformText = (text: string) => {
      // Simple transformations
      let transformed = text;
      
      if (text.includes('你从不帮忙') || text.includes('you never help')) {
        transformed = '我感到家务压力较大，希望能得到更多帮助';
      } else if (text.includes('你总是迟到') || text.includes('you are always late')) {
        transformed = '我感到时间对我很重要，等待让我有些焦虑';
      } else if (text.includes('你不听我说话') || text.includes('you never listen')) {
        transformed = '我希望能被倾听和理解，这对我很重要';
      } else if (text.includes('你只关心自己') || text.includes('you only care about yourself')) {
        transformed = '我有时感到被忽视，希望能得到更多关注';
      } else if (text.length > 0) {
        transformed = '我感到...' + text;
      }
      
      return transformed;
    };

    setTransformedText(transformText(inputText));
  }, [inputText]);

  // Breathing exercise timer
  useEffect(() => {
    if (mode !== 'breathing') return;
    
    const timer = setInterval(() => {
      setCounter(prev => {
        if (prev > 1) return prev - 1;
        
        // Switch phases
        if (breathingPhase === 'inhale') {
          setBreathingPhase('hold');
          return 7;
        } else if (breathingPhase === 'hold') {
          setBreathingPhase('exhale');
          return 8;
        } else {
          setBreathingPhase('inhale');
          return 4;
        }
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [breathingPhase, mode]);

  // Memory slideshow
  useEffect(() => {
    if (mode !== 'memories') return;
    
    const timer = setInterval(() => {
      setCurrentMemory(prev => (prev + 1) % memories.length);
    }, 5000);
    
    return () => clearInterval(timer);
  }, [memories.length, mode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 text-white flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Heart className="text-pink-400" size={24} />
          <h1 className="text-2xl font-bold">AI Mirror</h1>
        </div>
        <button 
          onClick={toggleFullscreen}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          {isFullscreen ? <X size={20} /> : <span className="text-sm">全屏</span>}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Mode Selector */}
        <div className="flex space-x-4 mb-8">
          <button 
            onClick={() => setMode('subtitle')} 
            className={`p-3 rounded-full ${mode === 'subtitle' ? 'bg-pink-500' : 'bg-white/10'} transition-colors`}
          >
            <MessageCircle size={24} />
          </button>
          <button 
            onClick={() => setMode('breathing')} 
            className={`p-3 rounded-full ${mode === 'breathing' ? 'bg-blue-500' : 'bg-white/10'} transition-colors`}
          >
            <Lungs size={24} />
          </button>
          <button 
            onClick={() => setMode('memories')} 
            className={`p-3 rounded-full ${mode === 'memories' ? 'bg-amber-500' : 'bg-white/10'} transition-colors`}
          >
            <Image size={24} />
          </button>
          {/* Microphone Button */}
          {speechRecognition && (
            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-green-500'} hover:bg-opacity-80 transition-colors`}
              title={isListening ? 'Stop Listening' : 'Start Listening'}
            >
              <Mic size={24} />
            </button>
          )}
        </div>

        {/* Voice Error Display */}
        {voiceError && (
          <p className="text-red-400 bg-red-900/50 p-2 rounded-md mb-4 text-sm">
            Error: {voiceError}
          </p>
        )}

        {/* Content based on mode */}
        {mode === 'subtitle' && (
          <div className="w-full max-w-2xl">
            <div className="mb-4 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="输入对话内容或开始语音输入..."
                className="w-full p-4 pr-12 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div className="p-6 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 min-h-32 flex flex-col items-center justify-center">
              <p className="text-xl text-center">{transformedText || '转换后的文字将显示在这里...'}</p>
              {isListening && (
                <>
                  <p className="text-sm text-center opacity-70 mt-2">正在倾听...</p>
                  {interimTranscript && (
                    <p className="text-sm text-gray-400 italic text-center mt-1">{interimTranscript}</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {mode === 'breathing' && (
          <div className="text-center">
            <div className="relative w-64 h-64 mb-8">
              <div 
                className={`absolute inset-0 rounded-full bg-blue-400/30 backdrop-blur-sm border-4 border-blue-400 transition-all duration-1000 flex items-center justify-center
                  ${breathingPhase === 'inhale' ? 'scale-75' : breathingPhase === 'hold' ? 'scale-100' : 'scale-50'}`}
              >
                <span className="text-5xl font-bold">{counter}</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {breathingPhase === 'inhale' ? '吸气' : breathingPhase === 'hold' ? '屏息' : '呼气'}
            </h2>
            <p className="text-lg opacity-80">
              {breathingPhase === 'inhale' ? '缓慢吸气 4 秒' : breathingPhase === 'hold' ? '屏住呼吸 7 秒' : '缓慢呼气 8 秒'}
            </p>
          </div>
        )}

        {mode === 'memories' && (
          <div className="w-full max-w-3xl">
            <div className="relative rounded-lg overflow-hidden aspect-video shadow-2xl">
              <img 
                src={memories[currentMemory]} 
                alt="Sweet memory" 
                className="w-full h-full object-cover transition-opacity duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                <p className="p-6 text-xl font-medium">回忆美好时光...</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-white/60">
        <p>AI Mirror - 帮助夫妻沟通的智能助手</p>
      </footer>
    </div>
  );
}

export default App;