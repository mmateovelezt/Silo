interface Window {
  electronAPI: {
    onUpdateReady(arg0: () => void): unknown;
    onUpdateProgress(arg0: (percent: any) => void): unknown;
    onUpdateAvailable(arg0: () => void): unknown;
    getEnv: (key: string) => Promise<string | undefined>;

    // Deepgram
    deepgramConnect: (token: string, language: string) => Promise<{ success: boolean; error?: string }>;
    deepgramSend: (audioChunk: Uint8Array<ArrayBuffer>) => Promise<{ success: boolean; error?: string }>;
    deepgramDisconnect: () => Promise<{ success: boolean }>;
    deepgramKeepalive: () => Promise<{ success: boolean }>;

    downloadUpdate: () => Promise<{ success: boolean }>;
    installUpdate: () => Promise<{ success: boolean }>;

    // Listeners
    onDeepgramMessage: (callback: (data: string) => void) => void;
    onDeepgramStatus: (callback: (status: { type: 'connected' | 'error' | 'disconnected'; message?: string }) => void) => void;
    removeDeepgramListeners: () => void;
  };
}
