import { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

export default function ArtplayerComponent({ option, getInstance, ...rest }) {
  const artRef = useRef();

  useEffect(() => {
    const art = new Artplayer({
      ...option,
      container: artRef.current,
      hotkey: true,
      fastForward: true,
      fullscreenWeb: true,
      fullscreen: true,
      autoOrientation: true,
      customType: {
        m3u8: function (video, url, artInstance) {
          if (Hls.isSupported()) {
            if (artInstance.hls) {
              artInstance.hls.loadSource(url);
            } else {
              const hls = new Hls();
              hls.loadSource(url);
              hls.attachMedia(video);
              artInstance.hls = hls;
              
              if (!artInstance.hlsIsBound) {
                hls.on(Hls.Events.MANIFEST_PARSED, function () {
                  const tracks = hls.audioTracks;
                  if (tracks && tracks.length > 0) {
                    const audioControl = {
                      name: 'audioTrack',
                      position: 'right',
                      html: 'Audio',
                      index: 10,
                      selector: tracks.map((track, index) => ({
                        html: track.name || track.lang || `Track ${index + 1}`,
                        trackId: index
                      })),
                      onSelect: function (item) {
                        hls.audioTrack = item.trackId;
                        return 'Audio';
                      }
                    };
                    
                    if (artInstance.controls.audioTrack) {
                      artInstance.controls.remove('audioTrack');
                    }
                    artInstance.controls.add(audioControl);
                  }
                });
                
                artInstance.on('destroy', () => {
                  if (artInstance.hls) artInstance.hls.destroy();
                });
                artInstance.hlsIsBound = true;
              }
            }
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
          } else {
            artInstance.notice.show = 'Unsupported video format: m3u8';
          }
        },
      },
      plugins: [
        (art) => {
          art.on('fullscreen', (state) => {
            if (state && window.screen && window.screen.orientation && window.screen.orientation.lock) {
              window.screen.orientation.lock('landscape').catch(() => {});
            } else if (!state && window.screen && window.screen.orientation && window.screen.orientation.unlock) {
              window.screen.orientation.unlock();
            }
          });
          return { name: 'autoRotate' };
        },
        (art) => {
          let tapCount = 0;
          let tapTimeout = null;
          let lastTapDirection = null; // 'left' or 'right'
          let lastTapTime = 0;

          const handleTap = (clientX, isDblClickEvent = false) => {
            const now = Date.now();
            const rect = art.template.$video.getBoundingClientRect();
            const x = clientX - rect.left;
            const direction = x > rect.width / 2 ? 'right' : 'left';

            if (isDblClickEvent) {
               // From desktop dblclick
               if (tapCount < 2 || lastTapDirection !== direction) tapCount = 2;
               else tapCount++;
               lastTapDirection = direction;
            } else {
               // From touchstart
               if (now - lastTapTime < 300 && lastTapDirection === direction) {
                 if (tapCount === 0 || tapCount === 1) tapCount = 2;
                 else tapCount++;
               } else {
                 tapCount = 1; 
               }
               lastTapTime = now;
               lastTapDirection = direction;
            }

            if (tapCount >= 2) {
              const skipAmount = (tapCount - 1) * 10;
              if (direction === 'right') {
                art.currentTime = Math.min(art.currentTime + 10, art.duration);
                art.notice.show = `⏩ +${skipAmount}s`;
              } else {
                art.currentTime = Math.max(art.currentTime - 10, 0);
                art.notice.show = `⏪ -${skipAmount}s`;
              }
            }

            if (tapTimeout) clearTimeout(tapTimeout);
            tapTimeout = setTimeout(() => {
              tapCount = 0;
              lastTapDirection = null;
            }, 600);
          };

          const handleTouchStart = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            if (tapCount >= 1 && Date.now() - lastTapTime < 300) {
               if (e.cancelable) e.preventDefault();
            }
            handleTap(clientX, false);
          };

          art.on('video:touchstart', handleTouchStart);
          art.template.$video.addEventListener('dblclick', (e) => {
            handleTap(e.clientX, true);
          });
          
          return { name: 'doubleTapSeek' };
        }
      ],
      controls: []
    });

    if (getInstance && typeof getInstance === 'function') {
      getInstance(art);
    }

    // Global Spacebar override to pause/play
    const handleGlobalKeydown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (e.code === 'Space' || e.keyCode === 32) {
        e.preventDefault();
        art.toggle();
      }
    };
    window.addEventListener('keydown', handleGlobalKeydown);

    // Attach native video events
    const handlers = {
      play: rest.onPlay,
      pause: rest.onPause,
      ended: rest.onEnded,
      timeupdate: rest.onTimeUpdate,
      loadedmetadata: rest.onLoadedMetadata,
      seeked: rest.onSeeked,
      error: rest.onError,
      waiting: rest.onWaiting,
      playing: rest.onPlaying,
      canplay: rest.onCanPlay,
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      if (handler && typeof handler === 'function') {
        art.video.addEventListener(event, handler);
      }
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        if (handler && typeof handler === 'function' && art.video) {
          art.video.removeEventListener(event, handler);
        }
      });
      window.removeEventListener('keydown', handleGlobalKeydown);
      if (art && art.destroy) {
        art.destroy(false);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract events out of rest so they aren't applied to the div
  const divProps = { ...rest };
  delete divProps.onPlay;
  delete divProps.onPause;
  delete divProps.onEnded;
  delete divProps.onTimeUpdate;
  delete divProps.onLoadedMetadata;
  delete divProps.onSeeked;
  delete divProps.onError;
  delete divProps.onWaiting;
  delete divProps.onPlaying;
  delete divProps.onCanPlay;

  return <div ref={artRef} {...divProps}></div>;
}
