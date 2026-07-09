import { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';

export default function ArtplayerComponent({ option, getInstance, ...rest }) {
  const artRef = useRef();

  useEffect(() => {
    const art = new Artplayer({
      ...option,
      container: artRef.current,
      fullscreenWeb: true,
      fullscreen: true,
      autoOrientation: true,
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
