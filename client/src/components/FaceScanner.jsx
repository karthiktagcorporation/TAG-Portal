import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, AlertCircle } from 'lucide-react';
import { loadFaceModels, getDescriptor } from '../face';

/**
 * Live webcam face scanner. While `active`, it loads the models, opens the
 * camera and keeps detecting; every captured descriptor is passed to
 * `onDescriptor(desc)` — return `true` from it to stop scanning (success).
 * `statusText` lets the parent override the caption (attempts, progress…).
 */
export default function FaceScanner({ active, onDescriptor, statusText }) {
  const videoRef = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | loading | scanning | error
  const [error, setError] = useState('');

  // Keep the latest callback available to the long-lived scan loop,
  // otherwise it would see a stale closure from the first render.
  const onDescriptorRef = useRef(onDescriptor);
  onDescriptorRef.current = onDescriptor;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let stream = null;
    let timer = null;

    (async () => {
      try {
        setPhase('loading');
        await loadFaceModels();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setPhase('scanning');

        const tick = async () => {
          if (cancelled) return;
          try {
            const desc = await getDescriptor(videoRef.current);
            if (cancelled) return;
            if (desc) {
              const done = await onDescriptorRef.current(desc);
              if (done || cancelled) return;
            }
          } catch { /* transient detection error — keep scanning */ }
          timer = setTimeout(tick, 700);
        };
        tick();
      } catch (err) {
        if (cancelled) return;
        setPhase('error');
        setError(
          err.name === 'NotAllowedError'
            ? 'Camera access was denied. Allow camera permission in your browser and try again.'
            : `Could not start the camera: ${err.message}`
        );
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-brand-500/40 bg-slate-950">
        <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />

        {phase === 'scanning' && (
          <>
            <div className="scan-line absolute left-[8%] right-[8%] h-0.5 rounded bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_2px_rgba(239,68,68,0.7)]" />
            {['top-3 left-3 border-t-2 border-l-2 rounded-tl-lg', 'top-3 right-3 border-t-2 border-r-2 rounded-tr-lg',
              'bottom-3 left-3 border-b-2 border-l-2 rounded-bl-lg', 'bottom-3 right-3 border-b-2 border-r-2 rounded-br-lg']
              .map((pos) => (
                <div key={pos} className={`absolute h-9 w-9 border-brand-400 ${pos}`} />
              ))}
          </>
        )}

        {phase === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
            <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
            <span className="text-sm">Loading face recognition engine…</span>
          </div>
        )}

        {phase === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-slate-300">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <span className="text-sm leading-relaxed">{error}</span>
          </div>
        )}
      </div>

      {phase === 'scanning' && (
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          <Camera className="h-4 w-4 animate-pulse text-brand-500" />
          {statusText || 'Position your face inside the frame…'}
        </p>
      )}
    </div>
  );
}
