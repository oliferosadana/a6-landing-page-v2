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
  title = 'Amanda Brownies Ambient Music',
  defaultVolume = 40
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(defaultVolume);
  const [showVolumePanel, setShowVolumePanel] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const videoId = extractYouTubeId(videoUrl) || 'y9F9wkQ_LLg';

  // Initialize YouTube IFrame Player API
  useEffect(() => {
    let isMounted = true;

    const initPlayer = () => {
      if (!isMounted || !window.YT || !window.YT.Player) return;

      // Clean up previous instance if any
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
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            loop: 1,
            playlist: videoId, // Required for loop to repeat the same video
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              if (!isMounted) return;
              try {
                event.target.setVolume(defaultVolume);
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
                // Ensure loop continues without gap
                try {
                  event.target.playVideo();
                } catch (e) {}
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

    // Load YouTube API script if not present
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

      // Chain onto onYouTubeIframeAPIReady callback
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

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    setHasInteracted(true);
    if (!playerRef.current || !isReady) return;

    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch (err) {
      console.warn('Error toggling playback:', err);
    }
  }, [isPlaying, isReady]);

  // Toggle Mute / Unmute
  const toggleMute = useCallback((e) => {
    e.stopPropagation();
    if (!playerRef.current || !isReady) return;

    try {
      if (isMuted) {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume || defaultVolume);
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch (e) {}
  }, [isMuted, isReady, volume, defaultVolume]);

  // Adjust volume
  const handleVolumeChange = useCallback((e) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    if (playerRef.current && isReady) {
      try {
        playerRef.current.setVolume(newVol);
        if (newVol > 0 && isMuted) {
          playerRef.current.unMute();
          setIsMuted(false);
        }
      } catch (e) {}
    }
  }, [isReady, isMuted]);

  // Close volume panel when clicking outside
  useEffect(() => {
    if (!showVolumePanel) return;
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowVolumePanel(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [showVolumePanel]);

  return (
    <>
      {/* 
        Offscreen YouTube IFrame Container
        Zero opacity, 1px size, positioned completely off-screen.
        Never use display:none because modern browsers pause media in hidden elements.
      */}
      <div
        id="yt-bg-audio-container"
        className="yt-audio-offscreen"
        aria-hidden="true"
      >
        <div id="yt-bg-audio-player"></div>
      </div>

      {/* Floating Music Controller */}
      <div
        ref={containerRef}
        className={`floating-music-widget ${isPlaying ? 'is-playing' : 'is-paused'} ${isReady ? 'is-ready' : 'is-loading'}`}
        aria-label="Kontrol Backsound Musik"
      >
        {/* Expandable Volume Popover */}
        {showVolumePanel && (
          <div className="music-volume-panel" onClick={(e) => e.stopPropagation()}>
            <div className="music-volume-header">
              <span className="volume-label">
                <i className={`fa-solid ${isMuted || volume === 0 ? 'fa-volume-xmark' : volume < 50 ? 'fa-volume-low' : 'fa-volume-high'}`}></i>
                Volume Musik ({isMuted ? 'Mute' : `${volume}%`})
              </span>
              <button
                type="button"
                className="music-mute-btn"
                onClick={toggleMute}
                title={isMuted ? 'Nyalakan Suara' : 'Bisukan Suara'}
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="music-volume-slider"
              aria-label="Pengatur Volume Backsound"
            />
          </div>
        )}

        {/* Floating Tooltip Pill (Interactive badge) */}
        <div
          className="music-floating-pill"
          onClick={togglePlay}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              togglePlay();
            }
          }}
          title={isPlaying ? 'Klik untuk jeda musik' : 'Klik untuk putar backsound'}
        >
          <span className="music-pill-status-dot"></span>
          <span className="music-pill-text">
            {isBuffering
              ? 'Memuat Lagu...'
              : isPlaying
              ? 'Musik Santai Aktif'
              : hasInteracted
              ? 'Putar Musik'
              : '🎵 Musik Suasana'}
          </span>
        </div>

        {/* Floating Circle Button */}
        <div className="music-btn-wrapper">
          {/* Gentle pulse wave ring when paused & not yet interacted */}
          {!isPlaying && !hasInteracted && <span className="music-pulse-ring"></span>}

          <button
            type="button"
            className="floating-music-btn"
            onClick={togglePlay}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowVolumePanel(prev => !prev);
            }}
            aria-label={isPlaying ? 'Jeda Musik' : 'Putar Musik'}
            title={isPlaying ? 'Klik: Jeda Musik | Klik Kanan: Atur Volume' : 'Klik untuk Putar Musik Suasana'}
          >
            {isBuffering ? (
              <i className="fa-solid fa-spinner fa-spin music-icon-loading"></i>
            ) : isPlaying ? (
              /* Animated Soundwave Equalizer */
              <div className="music-equalizer" aria-hidden="true">
                <span className="eq-bar eq-bar-1"></span>
                <span className="eq-bar eq-bar-2"></span>
                <span className="eq-bar eq-bar-3"></span>
                <span className="eq-bar eq-bar-4"></span>
              </div>
            ) : (
              /* Play Triangle Icon */
              <i className="fa-solid fa-play music-icon-play"></i>
            )}
          </button>

          {/* Quick Volume Settings Toggle Trigger */}
          <button
            type="button"
            className="music-quick-vol-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowVolumePanel(prev => !prev);
            }}
            title="Pengaturan Volume"
            aria-label="Buka Pengaturan Volume"
          >
            <i className={`fa-solid ${isMuted || volume === 0 ? 'fa-volume-xmark' : 'fa-sliders'}`}></i>
          </button>
        </div>
      </div>
    </>
  );
}
