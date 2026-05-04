import { useState, useRef, useCallback, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';

export interface STTMessage {
  id: string;
  type: 'stt' | 'translation';
  text?: string;
  original?: string;
  translated?: string;
  is_final?: boolean;
  is_corrected?: boolean;
  source_lang?: string;
}

export type EngineStatus = 'idle' | 'starting' | 'running' | 'paused' | 'error' | 'stopped';

interface EngineHookProps {
  sourceLang: string;
  sourceLangName: string;
  targetLang: string;
  glossary: GlossaryEntry[];
  session: Session | null;
}

export interface GlossaryEntry {
  id: string;
  english: string;
  spanishVariants: string[];
}

const filterRelevantGlossary = (text: string, fullGlossary: GlossaryEntry[], isSourceEs: boolean): GlossaryEntry[] => {
  if (!fullGlossary || fullGlossary.length === 0) return [];

  const normalizedText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Función auxiliar para extraer partes significativas de un término (ej: "AC unit (Air-con)" -> ["AC unit", "Air-con"])
  const getSubTerms = (term: string) => {
    const parts = [term];
    const match = term.match(/^(.*?)\s*\((.*?)\)\s*$/);
    if (match) {
      if (match[1]) parts.push(match[1].trim());
      if (match[2]) parts.push(match[2].trim());
    }
    return parts.map(p => p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  };

  return fullGlossary.filter(entry => {
    if (!entry || !entry.english || !Array.isArray(entry.spanishVariants)) return false;

    if (isSourceEs) {
      return entry.spanishVariants.some(variant => {
        const subTerms = getSubTerms(variant);
        return subTerms.some(st => normalizedText.includes(st));
      });
    } else {
      const subTerms = getSubTerms(entry.english);
      return subTerms.some(st => normalizedText.includes(st));
    }
  });
};



export function useInterpreterEngine({ sourceLang, sourceLangName, targetLang, glossary, session }: EngineHookProps) {

  const [status, setStatus] = useState<EngineStatus>('idle');
  const [messages, setMessages] = useState<STTMessage[]>([]);
  const [interimText, setInterimText] = useState<string>('');
  const [errorLog, setErrorLog] = useState<string>('');

  const [updateReady, setUpdateReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesRef = useRef<STTMessage[]>([]);


  // Keep ref in sync for callbacks
  messagesRef.current = messages;
  const tokenCacheRef = useRef<{ value: string; expiresAt: number } | null>(null);

  // Acumulador local — no dispara renders
  const pendingSecondsRef = useRef<number>(0);
  const pendingTokensRef = useRef<number>(0);

  // Ref para intervalo de reporte de uso de 60 segundos
  const usageIntervalRef = useRef<number | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);




  // Función para enviar el uso acumulado
  const flushUsage = useCallback(async () => {
    if (pendingSecondsRef.current <= 0 && pendingTokensRef.current <= 0) return;

    const seconds = pendingSecondsRef.current;
    const tokens = pendingTokensRef.current;

    pendingSecondsRef.current = 0; // resetea antes del fetch por si falla
    pendingTokensRef.current = 0;

    fetch('https://silo-api.vercel.app/api/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ seconds, tokens })
    }).catch(console.error);
  }, [session]);

  useEffect(() => {
    if (!errorLog) return;

    const timer = setTimeout(() => {
      setErrorLog("");
    }, 5000); // 5 segundos

    return () => clearTimeout(timer);
  }, [errorLog]);

  const getDeepgramToken = useCallback(async () => {
    if (tokenCacheRef.current && Date.now() < tokenCacheRef.current.expiresAt) {
      return tokenCacheRef.current.value;
    }

    const tokenRes = await fetch(`https://silo-api.vercel.app/api/stt-token`, {
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok || !data.token) {
      throw new Error("Error con el Token de Deepgram. Verifica tu conexión y que tu cuenta tenga acceso a STT.");
    }

    // El token dura 600s (10 min). Guardamos con margen de seguridad (9 minutos).
    tokenCacheRef.current = {
      value: data.token,
      expiresAt: Date.now() + 540_000
    };

    return data.token;
  }, [session?.access_token]);

  const getTranslation = async (text: string) => {
    try {


      // Armar glosario
      let glossary_str = "";
      if (glossary && glossary.length > 0) {
        const isSourceEs = sourceLang.includes('es');
        const isSourceEn = sourceLang.includes('en');
        const relevantTerms = filterRelevantGlossary(text, glossary, isSourceEs);

        let items = '';

        if (isSourceEs) {
          items = relevantTerms.map(g => {
            const spanishList = g.spanishVariants.map(v => `'${v}'`).join(' or ');
            return spanishList ? `- If the original text contains ${spanishList}, you must translate it to: '${g.english}'` : '';
          }).filter(Boolean).join('\n');
        } else if (isSourceEn) {
          items = relevantTerms.map(g => {
            const spanishList = g.spanishVariants.join(' / ');
            return spanishList ? `- If the original text contains '${g.english}', you must output ALL variants exactly as: '${spanishList}'` : '';
          }).filter(Boolean).join('\n');
        }

        if (items) {
          glossary_str = `\nTERMINOLOGY CONSTRAINTS (MANDATORY):\nFollow these exact translation rules, NO EXCEPTIONS:\n${items}\n`;
        }
      }

      const prompt_system = `You are a professional real-time interpreter.
Translate strictly from ${sourceLangName} to ${targetLang}.
Rules:
1. Provide ONLY the translation. No explanations.
2. If terminology constraints are provided, you MUST use them literally.
3. Maintain the technical tone of the conversation.${glossary_str}`;

      const prompt_user = `Translate this text: "${text}"`;
      const res = await fetch(`https://silo-api.vercel.app/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ text, prompt_user, prompt_system })
      });

      if (!res.ok) throw new Error('Translation failed');
      const data = await res.json();

      if (data.totalTokens) {
        pendingTokensRef.current += data.totalTokens;
      }

      return data.translated || '[Error de traducción]';

    } catch (e) {
      return '[Translation Error]';
    }
  };

  const statusRef = useRef<EngineStatus>(status);
  statusRef.current = status;


  const stopEngine = useCallback(() => {

    // 👇 Limpia el keep-alive al reanudar
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }

    setStatus('stopped');
    setInterimText('');

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {

      mediaRecorderRef.current.pause();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    // Desconectar Deepgram
    window.electronAPI.deepgramDisconnect();
    window.electronAPI.removeDeepgramListeners();

    // Limpia el intervalo
    if (usageIntervalRef.current) {
      clearInterval(usageIntervalRef.current);
      usageIntervalRef.current = null;
    }

    //  Envía los segundos pendientes antes de cerrar
    flushUsage();


  }, [flushUsage]);

  const pauseEngine = useCallback(() => {
    setStatus('paused');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {

      mediaRecorderRef.current.pause();
    }



    // 👇 Mantiene el WS vivo mientras está pausado
    keepAliveIntervalRef.current = setInterval(() => {
      window.electronAPI.deepgramKeepalive();
    }, 8000); // Deepgram cierra tras ~10s sin audio
  }, []);

  useEffect(() => {

    window.electronAPI.onUpdateAvailable(() => {
      console.log("funcionando!!!!! - useInterpreterEngine.ts:268")
      console.log("New update available - useInterpreterEngine.ts:269")
      setUpdateAvailable(true);

      window.electronAPI.downloadUpdate();
    });

    window.electronAPI.onUpdateProgress((percent) => {
      console.log(`percentage ${percent}% - useInterpreterEngine.ts:276`)
      setDownloadProgress(Math.round(percent));

    });

    window.electronAPI.onUpdateReady(() => {
      console.log("Update ready to install - useInterpreterEngine.ts:282");
      setUpdateReady(true);
    });

  }, [])


  const resumeEngine = useCallback(() => {
    setStatus('running');


    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.resume();
    }


  }, []);



  const verifyLimit = async () => {

    try {
      const limitRes = await fetch('https://silo-api.vercel.app/api/check', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      const limitData = await limitRes.json();
      return limitData;
    } catch (error) {
      setErrorLog("Can’t connect right now. Check your internet and try again")
    }

  }



  const startEngine = useCallback(async () => {
    // 1. Verificar límite antes de arrancar
    const limitData = await verifyLimit();

    if (limitData.has_reached_limit) {

      setErrorLog(`You’ve reached your time limit. (${limitData.hours_limit}h). Upgrade to continue.`);
      setStatus('error');
      return;
    }

    if (statusRef.current === 'running' || statusRef.current === 'starting') return;

    try {
      setStatus('starting');


      usageIntervalRef.current = setInterval(async () => {
        await flushUsage();
        verifyLimit().then(limitData => {
          if (limitData.has_reached_limit) {
            setErrorLog(`You’ve reached your time limit. (${limitData.hours_limit}h). Upgrade to continue.`);
            stopEngine();
          }

          if (limitData.seconds_remaining !== undefined) {
            if (limitData.seconds_remaining <= 600) { // Si quedan 10 minutos o menos, mostrar alerta
              setErrorLog(`You have ${Math.floor(limitData.seconds_remaining / 60)} minutes remaining before reaching your limit.`);
            }
          }
        });

      }, 60_000); // cada 60 segundos
      setErrorLog('');

      if (!window.electronAPI) {
        throw new Error("API de Electron no disponible. Asegúrate de ejecutar la app desde el acceso de escritorio y no tu navegador web.");
      }


      // Obtiene el token de Deepgram desde API en vercel (o de la caché local)
      const token = await getDeepgramToken();

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
        }
      });

      stream.getVideoTracks().forEach(track => {
        track.stop();
        stream.removeTrack(track);
      });

      if (stream.getAudioTracks().length === 0) {
        throw new Error("No se pudo obtener el track local de audio.");
      }

      streamRef.current = stream;

      // MAPEA EL IDIOMA PARA DEEPGRAM (Evita fallback a inglés)
      // Si el código tiene guion (es-MX) usamos el prefijo (es) para mayor estabilidad en Nova-2 si falla el específico.
      const deepgramLang = sourceLang.includes('-') && sourceLang.startsWith('es') ? sourceLang.split('-')[0] : sourceLang;



      // 1. Conectar
      await window.electronAPI.deepgramConnect(token, deepgramLang);





      // 2. Escuchar mensajes
      window.electronAPI.onDeepgramStatus((status) => {
        if (status.type === 'connected') {

          if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'paused')) {
            mediaRecorderRef.current.resume();
          } else {
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
          }
          setStatus('running');

          mediaRecorderRef.current.ondataavailable = async (e) => {

            if (statusRef.current === 'running' && e.data.size > 0) {

              const arrayBuffer = await e.data.arrayBuffer();
              const uint8Array = new Uint8Array(arrayBuffer); // 👈 usa Uint8Array en vez de Buffer
              await window.electronAPI.deepgramSend(uint8Array);
              // }
            }
          };

          mediaRecorderRef.current.start(250);

        }
        if (status.type === 'error') setErrorLog("Please try again in a moment. If the problem persists, contact support.");
        if (status.type === 'disconnected') {


          stopEngine();

        }
      });





      window.electronAPI.onDeepgramMessage(async (rawData) => {
        const res = JSON.parse(rawData);


        if (res.type === 'Results' && res.channel?.alternatives?.[0] && res.duration) {


          // Solo suma, cero peticiones HTTP aquí

          const transcript = res.channel.alternatives[0].transcript;

          if (res.is_final) {
            pendingSecondsRef.current += res.duration;
            if (transcript.trim().length > 0) {
              setInterimText('');
              const newId = crypto.randomUUID();
              setMessages(prev => [...prev, { id: newId, type: 'stt', original: transcript, source_lang: sourceLang }]);
              const translated = await getTranslation(transcript);
              setMessages(prev => prev.map(m => m.id === newId ? { ...m, translated } : m));
            }
          } else {
            setInterimText(transcript);
          }
        }
      });

    } catch (err: any) {
      setErrorLog("Please try again in a moment. If the problem persists, contact support.");
      setStatus('error');
      stopEngine();
    }
  }, [sourceLang, sourceLangName, targetLang, glossary, stopEngine, getTranslation]);

  // EFEITO DE "HOT SWAP": Reinicia o WebSocket se o idioma mudar enquanto estiver rodando.
  useEffect(() => {
    if (status === 'running' && streamRef.current && streamRef.current.active) {
      // Pequeno timeout para evitar múltiplos reinícios rápidos se o usuário mudar ambos selects
      const timer = setTimeout(async () => {
        // Empezar a pedir el token INMEDIATAMENTE (en paralelo con la desconexión)
        const tokenPromise = getDeepgramToken();

        // 1. Parar o MediaRecorder e o WebSocket anteriores
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }

        // 2. Limpiar listeners anteriores ANTES de desconectar para que el evento 
        // de 'disconnected' no dispare el stopEngine() de la sesión vieja.
        window.electronAPI.removeDeepgramListeners();

        // 3. Desconectar Deepgram y esperar a que cierre
        await window.electronAPI.deepgramDisconnect();

        // 4. Reiniciar el STT usando el stream existente
        const restart = async () => {
          try {
            // Esperar el token que empezamos a pedir arriba (o de la caché)
            const token = await tokenPromise;

            const stream = streamRef.current;

            if (!stream || !token) return;

            const deepgramLang = (sourceLang.includes('-') && sourceLang.startsWith('es')) ? sourceLang.split('-')[0] : sourceLang;


            // 1. Conectar
            await window.electronAPI.deepgramConnect(token, deepgramLang);


            window.electronAPI.onDeepgramStatus((status) => {
              if (status.type === 'connected') {
                const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                mediaRecorderRef.current = mediaRecorder;

                mediaRecorder.ondataavailable = async (e) => {
                  if (e.data.size > 0) {
                    const arrayBuffer = await e.data.arrayBuffer();
                    await window.electronAPI.deepgramSend(new Uint8Array(arrayBuffer));
                  }
                };
                mediaRecorder.start(250);
              }
              if (status.type === 'error') setErrorLog("Please try again in a moment. If the problem persists, contact support.");
              if (status.type === 'disconnected') stopEngine();
            });

            window.electronAPI.onDeepgramMessage(async (rawData) => {
              if (statusRef.current !== 'running') return;
              try {
                const res = JSON.parse(rawData);
                if (res.type === 'Results' && res.channel?.alternatives?.[0]) {
                  const transcript = res.channel.alternatives[0].transcript;
                  if (res.is_final) {
                    if (transcript.trim().length > 0) {
                      setInterimText('');
                      const newId = crypto.randomUUID();
                      setMessages(prev => [...prev, { id: newId, type: 'stt', original: transcript, source_lang: sourceLang }]);
                      const translated = await getTranslation(transcript);
                      setMessages(prev => prev.map(m => m.id === newId ? { ...m, translated } : m));
                    }
                  } else {
                    setInterimText(transcript);
                  }
                }
              } catch (err) {
                console.error("Hot swap parse error - useInterpreterEngine.ts:544", err);
              }
            });


          } catch (e) {
            console.error("Hot swap fail: - useInterpreterEngine.ts:550", e);
          }
        };
        restart();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [sourceLang, targetLang]);

  const clearMessages = () => setMessages([]);

  const updateMessageCorrection = async (id: string, newOriginal: string) => {
    setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, original: newOriginal, is_corrected: true, translated: 'Translating...' } : msg));
    const translated = await getTranslation(newOriginal);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, translated } : m));
  };


  return {
    // autoupdater


    status,
    messages,
    interimText,
    errorLog,
    startEngine,
    pauseEngine,
    resumeEngine,
    stopEngine,
    clearMessages,
    updateMessageCorrection,
    updateReady,
    updateAvailable,
    downloadProgress
  };
}


