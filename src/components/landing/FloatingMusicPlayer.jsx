import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Helper to extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url) {
  if (!url) return '';
  const clean = url.trim();
  const match = clean.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/)?)([\w-]{11})/
  );
  if (match && match[1]) return match[1];
  if (clean.length === 11) return clean;
  return '';
}

export default function FloatingMusicPlayer({
  videoUrl = 'https://www.youtube.com/watch?v=y9F9wkQ_LLg',
  defaultVolume = 40
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const playerRef = useRef(null);
  const videoId = extractYouTubeId(videoUrl) || 'y9F9wkQ_LLg';

  // Initialize YouTube IFrame Player API
  useEffect(() => {
    let isMounted = true;

    const initPlayer = () => {
      if (!isMounted || !window.YT || !window.YT.Player) return;

      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying existing YT player:', e);
        }
      }

      try {
        playerRef.current = new window.YT.Player('yt-bg-audio-player', {
          height: '1',
          width: '1',
          videoId: videoId,
          playerVars: {
            autoplay: 1, // Auto play saat halaman dibuka
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            loop: 0, // Putar hanya sekali (tanpa loop otomatis)
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              if (!isMounted) return;
              try {
                event.target.setVolume(defaultVolume);
                // Langsung putar saat player siap
                event.target.playVideo();
              } catch (e) {}
              setIsReady(true);
            },
            onStateChange: (event) => {
              if (!isMounted || !window.YT) return;
              const state = event.data;
              if (state === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                setIsBuffering(false);
              } else if (state === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                setIsBuffering(false);
              } else if (state === window.YT.PlayerState.BUFFERING) {
                setIsBuffering(true);
              } else if (state === window.YT.PlayerState.ENDED) {
                // Musik selesai diputar 1x: berhenti dan kembali ke tombol Play
                setIsPlaying(false);
                setIsBuffering(false);
              }
            },
            onError: (err) => {
              console.warn('YouTube Audio Player error:', err);
              if (isMounted) setIsBuffering(false);
            }
          }
        });
      } catch (err) {
        console.warn('Failed to initialize YouTube Audio Player:', err);
      }
    };

    if (!window.YT) {
      const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScript = document.getElementsByTagName('script')[0];
        if (firstScript && firstScript.parentNode) {
          firstScript.parentNode.insertBefore(tag, firstScript);
        } else {
          document.head.appendChild(tag);
        }
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        initPlayer();
      };
    } else if (window.YT && window.YT.Player) {
      initPlayer();
    }

    return () => {
      isMounted = false;
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [videoId, defaultVolume]);

  // Autoplay fallback: jika browser membatasi autoplay suara sebelum ada gestur pengunjung,
  // musik otomatis langsung menyala saat pertama kali pengunjung menyentuh/scroll/klik halaman.
  useEffect(() => {
    if (!isReady || isPlaying) return;

    const handleFirstUserGesture = () => {
      if (playerRef.current && isReady) {
        try {
          const state = typeof playerRef.current.getPlayerState === 'function'
            ? playerRef.current.getPlayerState()
            : -1;
          // Putar jika belum berputar dan belum tamat
          if (state !== 1 && state !== 0) {
            playerRef.current.playVideo();
          }
        } catch (e) {}
      }
    };

    window.addEventListener('pointerdown', handleFirstUserGesture, { once: true, passive: true });
    window.addEventListener('touchstart', handleFirstUserGesture, { once: true, passive: true });
    window.addEventListener('scroll', handleFirstUserGesture, { once: true, passive: true });
    window.addEventListener('keydown', handleFirstUserGesture, { once: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstUserGesture);
      window.removeEventListener('touchstart', handleFirstUserGesture);
      window.removeEventListener('scroll', handleFirstUserGesture);
      window.removeEventListener('keydown', handleFirstUserGesture);
    };
  }, [isReady, isPlaying]);

  // Toggle Play / Pause saat tombol diklik
  const togglePlay = useCallback(() => {
    if (!playerRef.current || !isReady) return;

    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        const state = typeof playerRef.current.getPlayerState === 'function'
          ? playerRef.current.getPlayerState()
          : -1;
        // Jika sudah selesai (ended), ulang dari detik ke-0
        if (state === 0 || state === window.YT?.PlayerState?.ENDED) {
          playerRef.current.seekTo(0, true);
        }
        playerRef.current.playVideo();
      }
    } catch (err) {
      console.warn('Error toggling playback:', err);
    }
  }, [isPlaying, isReady]);

  return (
    <>
      {/* 
        Offscreen YouTube IFrame Container
        Zero opacity, 1px size, positioned completely off-screen.
      */}
      <div
        id="yt-bg-audio-container"
        className="yt-audio-offscreen"
        aria-hidden="true"
      >
        <div id="yt-bg-audio-player"></div>
      </div>

      {/* Floating Single Circle Button (Hanya Tombol Play / Pause Soundwave) */}
      <div
        className={`floating-music-widget ${isPlaying ? 'is-playing' : 'is-paused'} ${isReady ? 'is-ready' : 'is-loading'}`}
        aria-label="Kontrol Backsound Musik"
      >
        <div className="music-btn-wrapper">
          {/* Pulse ring saat sedang dijeda */}
          {!isPlaying && <span className="music-pulse-ring"></span>}

          <button
            type="button"
            className="floating-music-btn"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Jeda Musik' : 'Putar Musik'}
            title={isPlaying ? 'Jeda Musik' : 'Putar Musik'}
          >
            {isBuffering ? (
              <i className="fa-solid fa-spinner fa-spin music-icon-loading"></i>
            ) : isPlaying ? (
              /* Animated Soundwave Equalizer saat sedang berputar */
              <div className="music-equalizer" aria-hidden="true">
                <span className="eq-bar eq-bar-1"></span>
                <span className="eq-bar eq-bar-2"></span>
                <span className="eq-bar eq-bar-3"></span>
                <span className="eq-bar eq-bar-4"></span>
              </div>
            ) : (
              /* Ikon Play saat sedang berhenti/jeda */
              <i className="fa-solid fa-play music-icon-play"></i>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
