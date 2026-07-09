import { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

export default function ArtplayerComponent({ option, getInstance, ...rest }) {
  const artRef = useRef();

  useEffect(() => {
    const art = new Artplayer({
      ...option,
      container: artRef.current,
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
          let touchTime = 0;
          let isDoubleTapping = false;

          const handleTap = (e) => {
            const now = Date.now();
            if (now - touchTime < 300) {
              isDoubleTapping = true;
              const clientX = e.touches ? e.touches[0].clientX : e.clientX;
              const rect = art.template.$video.getBoundingClientRect();
              const x = clientX - rect.left;
              
              if (x > rect.width / 2) {
                art.currentTime = Math.min(art.currentTime + 10, art.duration);
                art.notice.show = '⏩ +10s';
              } else {
                art.currentTime = Math.max(art.currentTime - 10, 0);
                art.notice.show = '⏪ -10s';
              }
              if (e.cancelable) e.preventDefault();
              
              // Reset
              setTimeout(() => { isDoubleTapping = false; }, 300);
            }
            touchTime = now;
          };

          art.on('video:touchstart', handleTap);
          art.on('video:click', handleTap);
          
          return { name: 'doubleTapSeek' };
        }
      ]
    });

    if (getInstance && typeof getInstance === 'function') {
      getInstance(art);
    }

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
