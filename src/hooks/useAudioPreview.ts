import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import type {
  AudioPreviewState,
  RadioStation,
  StationDiagnosticResult,
  StreamDiagnosticCategory,
} from '../types/radio';
import {
  isExternalPlaylistUrl,
  isHtmlReferencePageUrl,
  validateStreamUrl,
} from '../services/radioService';

const CONNECTION_TIMEOUT_MS = 14000;
const MAX_RECONNECT_ATTEMPTS = 2;

function categoryLabel(category: StreamDiagnosticCategory): string {
  switch (category) {
    case 'working':
      return 'Streaming funcionando';
    case 'unavailable':
      return 'Streaming indisponível';
    case 'invalid_url':
      return 'URL inválida';
    case 'playlist_inaccessible':
      return 'Playlist inacessível';
    case 'incompatible_format':
      return 'Formato incompatível';
    case 'checking':
      return 'Verificando...';
    case 'idle':
    default:
      return '';
  }
}

function getAbsoluteArtworkUrl(path: string): string {
  try {
    return new URL(path, window.location.origin).href;
  } catch {
    return path;
  }
}

export function useAudioPreview(radios: RadioStation[] = []) {
  const [previewState, setPreviewState] = useState<AudioPreviewState>({
    stationId: null,
    status: 'idle',
    category: 'idle',
    errorMessage: null,
  });

  const [diagnostics, setDiagnostics] = useState<Record<string, StationDiagnosticResult>>({});
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const activeStationIdRef = useRef<string | null>(null);
  const lastStationIdRef = useRef<string | null>(null);
  const cancelVerifyAllRef = useRef(false);
  const userPausedRef = useRef(false);
  const radiosRef = useRef(radios);
  const startStationPlaybackRef = useRef<
    ((station: RadioStation, options?: { stopImmediatelyOnPlay?: boolean; isReconnect?: boolean }) => Promise<StationDiagnosticResult>) | null
  >(null);

  // Media Session callbacks can arrive while the page is backgrounded. Keep this
  // ref current during render instead of waiting for a passive effect to run.
  radiosRef.current = radios;

  const ensureAudioElement = useCallback((): HTMLAudioElement => {
    if (audioRef.current) return audioRef.current;
    const audio = document.createElement('audio');
    audio.preload = 'none';
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    audio.setAttribute('referrerpolicy', 'no-referrer');
    audio.setAttribute('aria-hidden', 'true');
    Object.assign(audio.style, {
      position: 'fixed',
      width: '1px',
      height: '1px',
      opacity: '0.01',
      pointerEvents: 'none',
      left: '0',
      bottom: '0',
      overflow: 'hidden',
    });
    document.body.appendChild(audio);
    audioRef.current = audio;
    return audio;
  }, []);

  const updateNowPlayingMetadata = useCallback((station: RadioStation, subtitle?: string) => {
    if (!('mediaSession' in navigator)) return;
    try {
      const iconApple = getAbsoluteArtworkUrl('/apple-touch-icon.png');
      const icon192 = getAbsoluteArtworkUrl('/android-chrome-192x192.png');
      const icon512 = getAbsoluteArtworkUrl('/android-chrome-512x512.png');
      navigator.mediaSession.metadata = new MediaMetadata({
        title: station.name,
        artist: subtitle ?? (station.city || 'Rádio ao vivo'),
        album: 'Sintoniza',
        artwork: [
          { src: iconApple, sizes: '180x180', type: 'image/png' },
          { src: icon192, sizes: '192x192', type: 'image/png' },
          { src: icon512, sizes: '512x512', type: 'image/png' },
        ],
      });
      navigator.mediaSession.playbackState = 'playing';
    } catch {
      /* ignorar em navegadores sem suporte completo */
    }
  }, []);

  const recordDiagnostic = useCallback(
    (stationId: string, category: StreamDiagnosticCategory, detail: string) => {
      setDiagnostics((prev) => ({
        ...prev,
        [stationId]: {
          category,
          label: categoryLabel(category),
          detail,
          checkedAt: new Date().toLocaleTimeString('pt-BR'),
        },
      }));
    },
    []
  );

  const clearDiagnostic = useCallback((stationId: string) => {
    setDiagnostics((prev) => {
      if (!(stationId in prev)) return prev;
      const copy = { ...prev };
      delete copy[stationId];
      return copy;
    });
  }, []);

  const cleanupPlayback = useCallback((keepAudioAlive = false) => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (audioRef.current) {
      const audio = audioRef.current;
      audio.onplaying = null;
      audio.onwaiting = null;
      audio.onerror = null;
      audio.onstalled = null;

      // Em trocas de rádio (keepAudioAlive = true), NUNCA pausar nem zerar o <audio>.
      // No Safari/WebKit do iOS, pausar em segundo plano revoga a sessão de áudio ativa.
      if (!keepAudioAlive) {
        audio.pause();
        audio.removeAttribute('src');
        audio.srcObject = null;
        audio.load();
      }
    }
  }, []);

  const stopPreview = useCallback(() => {
    cancelVerifyAllRef.current = true;
    userPausedRef.current = true;
    activeStationIdRef.current = null;
    reconnectAttemptsRef.current = 0;
    cleanupPlayback(false);
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'paused';
      } catch {
        /* ignorar */
      }
    }
    setIsVerifyingAll(false);
    setPreviewState({
      stationId: null,
      status: 'idle',
      category: 'idle',
      errorMessage: null,
    });
  }, [cleanupPlayback]);

  const failPreview = useCallback(
    (stationId: string, category: StreamDiagnosticCategory, message: string, preserveSession = false) => {
      if (activeStationIdRef.current !== stationId) return;
      cleanupPlayback(preserveSession);
      recordDiagnostic(stationId, category, message);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'paused';
        } catch {
          /* ignorar */
        }
      }
      setPreviewState({
        stationId,
        status: 'error',
        category,
        errorMessage: message,
      });
    },
    [cleanupPlayback, recordDiagnostic]
  );

  const startStationPlayback = useCallback(
    (
      station: RadioStation,
      options?: { stopImmediatelyOnPlay?: boolean; isReconnect?: boolean }
    ): Promise<StationDiagnosticResult> => {
      const isTestingAll = Boolean(options?.stopImmediatelyOnPlay);
      cleanupPlayback(!isTestingAll);

      userPausedRef.current = false;
      activeStationIdRef.current = station.id;
      lastStationIdRef.current = station.id;

      if (!options?.isReconnect) {
        reconnectAttemptsRef.current = 0;
      }

      const trimmedUrl = station.stream_url.trim();
      if (!trimmedUrl) {
        const msg = 'Endereço de streaming ainda não configurado.';
        failPreview(station.id, 'invalid_url', msg, !isTestingAll);
        return Promise.resolve({
          category: 'invalid_url',
          label: categoryLabel('invalid_url'),
          detail: msg,
          checkedAt: new Date().toLocaleTimeString('pt-BR'),
        });
      }

      const urlCheck = validateStreamUrl(trimmedUrl);
      if (!urlCheck.valid) {
        const msg = urlCheck.error ?? 'URL do streaming inválida.';
        failPreview(station.id, 'invalid_url', msg, !isTestingAll);
        return Promise.resolve({
          category: 'invalid_url',
          label: categoryLabel('invalid_url'),
          detail: msg,
          checkedAt: new Date().toLocaleTimeString('pt-BR'),
        });
      }

      if (isHtmlReferencePageUrl(urlCheck.normalized)) {
        const msg =
          'Este endereço aponta para uma página HTML, não para um streaming direto de áudio (MP3, AAC ou HLS).';
        failPreview(station.id, 'incompatible_format', msg, !isTestingAll);
        return Promise.resolve({
          category: 'incompatible_format',
          label: categoryLabel('incompatible_format'),
          detail: msg,
          checkedAt: new Date().toLocaleTimeString('pt-BR'),
        });
      }

      if (isExternalPlaylistUrl(urlCheck.normalized)) {
        const msg =
          'URL aponta para arquivo de playlist (.m3u/.pls). Use o link direto do áudio.';
        failPreview(station.id, 'incompatible_format', msg, !isTestingAll);
        return Promise.resolve({
          category: 'incompatible_format',
          label: categoryLabel('incompatible_format'),
          detail: msg,
          checkedAt: new Date().toLocaleTimeString('pt-BR'),
        });
      }

      if (window.location.protocol === 'https:' && urlCheck.normalized.startsWith('http://')) {
        const msg =
          'O navegador bloqueia streaming http:// em página https://. Use https://.';
        failPreview(station.id, 'unavailable', msg, !isTestingAll);
        return Promise.resolve({
          category: 'unavailable',
          label: categoryLabel('unavailable'),
          detail: msg,
          checkedAt: new Date().toLocaleTimeString('pt-BR'),
        });
      }

      // Atualiza metadados imediatamente na tela bloqueada antes de abrir a conexão
      if (!isTestingAll) {
        updateNowPlayingMetadata(station, 'Conectando...');
      }

      setPreviewState({
        stationId: station.id,
        status: 'loading',
        category: 'checking',
        errorMessage: null,
      });

      // IMPORTANTE: Obter o <audio> e iniciar `audio.src` + `audio.play()` SINCRONAMENTE
      // dentro da pilha de chamada do evento de usuário / MediaSession (nexttrack / previoustrack),
      // antes de entrar em qualquer Promise assíncrona!
      const audio = ensureAudioElement();

      return new Promise<StationDiagnosticResult>((resolve) => {
        let settled = false;
        const settle = (result: StationDiagnosticResult) => {
          if (settled) return;
          settled = true;
          resolve(result);
        };

        timeoutRef.current = window.setTimeout(() => {
          const msg = 'Tempo limite de conexão atingido ao tentar iniciar o streaming.';
          failPreview(station.id, 'unavailable', msg, !isTestingAll);
          settle({
            category: 'unavailable',
            label: categoryLabel('unavailable'),
            detail: msg,
            checkedAt: new Date().toLocaleTimeString('pt-BR'),
          });
        }, CONNECTION_TIMEOUT_MS);

        audio.onplaying = () => {
          if (activeStationIdRef.current !== station.id) return;
          if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          reconnectAttemptsRef.current = 0;

          const detail = 'Áudio decodificado e reproduzindo em tempo real.';
          if (!isTestingAll) {
            updateNowPlayingMetadata(station, station.city || 'Rádio ao vivo');
          }
          recordDiagnostic(station.id, 'working', detail);

          if (isTestingAll) {
            cleanupPlayback(false);
            setPreviewState({
              stationId: null,
              status: 'idle',
              category: 'idle',
              errorMessage: null,
            });
          } else {
            setPreviewState({
              stationId: station.id,
              status: 'playing',
              category: 'working',
              errorMessage: null,
            });
          }

          settle({
            category: 'working',
            label: categoryLabel('working'),
            detail,
            checkedAt: new Date().toLocaleTimeString('pt-BR'),
          });
        };

        audio.onwaiting = () => {
          if (activeStationIdRef.current !== station.id) return;
          setPreviewState((prev) =>
            prev.stationId === station.id && prev.status === 'playing'
              ? { ...prev, status: 'loading' }
              : prev
          );
        };

        audio.onstalled = () => {
          if (activeStationIdRef.current !== station.id || isTestingAll || userPausedRef.current) return;
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current += 1;
            const sep = urlCheck.normalized.includes('?') ? '&' : '?';
            audio.src = `${urlCheck.normalized}${sep}_r=${Date.now()}`;
            void audio.play().catch(() => {});
          }
        };

        audio.onerror = () => {
          if (activeStationIdRef.current !== station.id) return;
          if (!isTestingAll && !userPausedRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current += 1;
            const sep = urlCheck.normalized.includes('?') ? '&' : '?';
            audio.src = `${urlCheck.normalized}${sep}_r=${Date.now()}`;
            void audio.play().catch(() => {});
            return;
          }

          const mediaErrorCode = audio.error?.code;
          const isFormatError =
            mediaErrorCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
            mediaErrorCode === MediaError.MEDIA_ERR_DECODE;
          const category: StreamDiagnosticCategory = isFormatError
            ? 'incompatible_format'
            : 'unavailable';
          const msg = isFormatError
            ? 'Formato incompatível com o navegador ou URL não retornou áudio válido (MP3, AAC ou HLS).'
            : 'Streaming indisponível ou servidor recusou a conexão.';

          failPreview(station.id, category, msg, !isTestingAll);
          settle({
            category,
            label: categoryLabel(category),
            detail: msg,
            checkedAt: new Date().toLocaleTimeString('pt-BR'),
          });
        };

        const isHlsStream = urlCheck.normalized.toLowerCase().includes('.m3u8');
        // No iOS/Safari, o <audio> nativo toca .m3u8 diretamente em segundo plano.
        const supportsNativeHls =
          audio.canPlayType('application/vnd.apple.mpegurl') !== '' ||
          audio.canPlayType('audio/mpegurl') !== '';

        if (isHlsStream && !supportsNativeHls && Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
          });
          hlsRef.current = hls;

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !isTestingAll) {
                hls.startLoad();
                return;
              }
              const isNetwork = data.type === Hls.ErrorTypes.NETWORK_ERROR;
              const category: StreamDiagnosticCategory = isNetwork ? 'unavailable' : 'incompatible_format';
              const msg = isNetwork
                ? 'Streaming HLS indisponível ou inacessível.'
                : 'Stream HLS com formato incompatível.';
              failPreview(station.id, category, msg, !isTestingAll);
              settle({
                category,
                label: categoryLabel(category),
                detail: msg,
                checkedAt: new Date().toLocaleTimeString('pt-BR'),
              });
            }
          });

          hls.loadSource(urlCheck.normalized);
          hls.attachMedia(audio);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            audio.play().catch(() => {
              const msg = 'Reprodução bloqueada pelo navegador. Toque novamente para iniciar.';
              failPreview(station.id, 'unavailable', msg, !isTestingAll);
              settle({
                category: 'unavailable',
                label: categoryLabel('unavailable'),
                detail: msg,
                checkedAt: new Date().toLocaleTimeString('pt-BR'),
              });
            });
          });
          return;
        }

        const streamTarget = options?.isReconnect
          ? `${urlCheck.normalized}${urlCheck.normalized.includes('?') ? '&' : '?'}_r=${Date.now()}`
          : urlCheck.normalized;

        // Disparo síncrono imediato para manter a autorização de segundo plano do iOS
        audio.src = streamTarget;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            if (activeStationIdRef.current !== station.id) return;
            window.setTimeout(() => {
              if (activeStationIdRef.current !== station.id || userPausedRef.current) return;
              audio.play().catch(() => {
                const msg = 'Não foi possível iniciar o streaming em segundo plano.';
                failPreview(station.id, 'unavailable', msg, !isTestingAll);
                settle({
                  category: 'unavailable',
                  label: categoryLabel('unavailable'),
                  detail: msg,
                  checkedAt: new Date().toLocaleTimeString('pt-BR'),
                });
              });
            }, 250);
          });
        }
      });
    },
    [cleanupPlayback, ensureAudioElement, failPreview, recordDiagnostic, updateNowPlayingMetadata]
  );

  useEffect(() => {
    startStationPlaybackRef.current = startStationPlayback;
  }, [startStationPlayback]);

  // Registra os controles da tela bloqueada / Bluetooth uma única vez na montagem
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    const safelySet = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        session.setActionHandler(action, handler);
      } catch {
        /* ação não suportada */
      }
    };

    safelySet('previoustrack', () => {
      const list = radiosRef.current;
      if (!list.length) return;
      const currentId = activeStationIdRef.current ?? lastStationIdRef.current;
      const index = list.findIndex((item) => item.id === currentId);
      const target =
        index < 0
          ? list[list.length - 1]
          : list[(index - 1 + list.length) % list.length];
      if (startStationPlaybackRef.current) {
        void startStationPlaybackRef.current(target);
      }
    });

    safelySet('nexttrack', () => {
      const list = radiosRef.current;
      if (!list.length) return;
      const currentId = activeStationIdRef.current ?? lastStationIdRef.current;
      const index = list.findIndex((item) => item.id === currentId);
      const target =
        index < 0
          ? list[0]
          : list[(index + 1) % list.length];
      if (startStationPlaybackRef.current) {
        void startStationPlaybackRef.current(target);
      }
    });

    safelySet('play', () => {
      const targetId = activeStationIdRef.current ?? lastStationIdRef.current;
      const current = radiosRef.current.find((station) => station.id === targetId);
      const stationToPlay = current ?? radiosRef.current[0];
      if (stationToPlay && startStationPlaybackRef.current) {
        void startStationPlaybackRef.current(stationToPlay);
      }
    });

    safelySet('pause', () => {
      stopPreview();
    });

    safelySet('seekbackward', null);
    safelySet('seekforward', null);
    safelySet('seekto', null);
    safelySet('stop', null);
  }, [stopPreview]);

  const togglePreview = useCallback(
    async (station: RadioStation) => {
      if (
        activeStationIdRef.current === station.id &&
        (previewState.status === 'playing' || previewState.status === 'loading')
      ) {
        stopPreview();
        return;
      }
      cancelVerifyAllRef.current = true;
      setIsVerifyingAll(false);
      await startStationPlayback(station);
    },
    [previewState.status, startStationPlayback, stopPreview]
  );

  const verifyAllStations = useCallback(
    async (stations: RadioStation[]) => {
      cancelVerifyAllRef.current = false;
      setIsVerifyingAll(true);

      for (const station of stations) {
        if (cancelVerifyAllRef.current) break;
        await startStationPlayback(station, { stopImmediatelyOnPlay: true });
      }

      setIsVerifyingAll(false);
    },
    [startStationPlayback]
  );

  const startByIndex = useCallback(
    (direction: -1 | 1) => {
      const list = radiosRef.current;
      if (!list.length) return;
      const currentId = activeStationIdRef.current ?? lastStationIdRef.current;
      const currentIndex = list.findIndex((station) => station.id === currentId);
      const nextIndex =
        currentIndex < 0
          ? direction === 1
            ? 0
            : list.length - 1
          : (currentIndex + direction + list.length) % list.length;
      void startStationPlayback(list[nextIndex]);
    },
    [startStationPlayback]
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const activeId = activeStationIdRef.current;
      if (!activeId || userPausedRef.current) return;

      const audio = audioRef.current;
      const station = radiosRef.current.find((s) => s.id === activeId);
      if (!station) return;

      if (audio && (audio.paused || audio.ended || audio.readyState < 2)) {
        void startStationPlayback(station, { isReconnect: true });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [startStationPlayback]);

  useEffect(() => {
    return () => {
      cleanupPlayback(false);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'none';
        } catch {
          /* ignorar */
        }
      }
    };
  }, [cleanupPlayback]);

  return {
    previewState,
    diagnostics,
    isVerifyingAll,
    togglePreview,
    stopPreview,
    nextStation: () => startByIndex(1),
    previousStation: () => startByIndex(-1),
    verifyAllStations,
    clearDiagnostic,
  };
}
