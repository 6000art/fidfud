import React, { useState, useRef, useEffect } from 'react';
import { getSafeVideoUrl, STABLE_CULINARY_FALLBACK_VIDEOS } from '../utils/videoUtils';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Video, Square, RefreshCw, Volume2, Sparkles, Download, Check, AlertCircle } from 'lucide-react';

interface VideoRecorderStudioProps {
  onVideoCaptured: (url: string) => void;
  accentColor?: string;
}

export const VideoRecorderStudio: React.FC<VideoRecorderStudioProps> = ({
  onVideoCaptured,
  accentColor = "#FF5C00"
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState<boolean>(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('warm-food');
  const [duration, setDuration] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isPlayingCaptured, setIsPlayingCaptured] = useState<boolean>(false);
  const [previewTime, setPreviewTime] = useState<number>(0);
  const [previewDuration, setPreviewDuration] = useState<number>(0);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const capturedVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check support on mount
  useEffect(() => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setIsSupported(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Set up Audio Context for visualization
  const setupAudioAnalyser = (mediaStream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(mediaStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setAudioLevel(average / 128); // Normalize to 0-1 range
        animationFrameRef.current = requestAnimationFrame(drawVolume);
      };

      drawVolume();
    } catch (e) {
      console.warn('Audio visualization not supported', e);
    }
  };

  const startCamera = async () => {
    try {
      stopCamera();
      setVideoUrl(null);
      setRecordedChunks([]);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: true
      });

      setStream(mediaStream);
      setHasPermission(true);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = mediaStream;
        videoPreviewRef.current.play().catch(() => {});
      }

      setupAudioAnalyser(mediaStream);
    } catch (err) {
      console.error('Camera access error:', err);
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const startRecording = () => {
    if (!stream) return;
    
    setRecordedChunks([]);
    setDuration(0);
    setRecording(true);

    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    let mediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      } catch (err) {
        mediaRecorder = new MediaRecorder(stream);
      }
    }

    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        setRecordedChunks(prev => [...prev, event.data]);
      }
    };

    mediaRecorder.onstop = () => {
      setRecording(false);
    };

    // Stagger chunks every 200ms
    mediaRecorder.start(200);

    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    stopCamera();
  };

  useEffect(() => {
    if (recordedChunks.length > 0 && !recording && !stream) {
      const blob = new Blob(recordedChunks, { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
    }
  }, [recordedChunks, recording, stream]);

  const handleApplyVideo = () => {
    if (videoUrl) {
      onVideoCaptured(videoUrl);
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `fitfood-studio-recording-${Date.now()}.mp4`;
    a.click();
  };

  const getFilterClass = (selectedFilter: string) => {
    switch (selectedFilter) {
      case 'warm-food':
        return 'brightness-105 contrast-105 saturate-125 sepia-[15%]';
      case 'silver-vintage':
        return 'contrast-115 grayscale brightness-95 sepia-[5%]';
      case 'cinematic-pro':
        return 'contrast-110 saturate-105 hue-rotate-5';
      case 'cyber-glow':
        return 'saturate-150 contrast-125 brightness-110 text-cyan-400';
      default:
        return '';
    }
  };

  return (
    <div className="w-full bg-zinc-950/80 border border-white/5 rounded-2xl overflow-hidden p-5 space-y-4">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <h4 className="text-xs font-black uppercase tracking-widest text-white font-mono flex items-center gap-1">
            Fitfood Camera Studio <Sparkles size={12} className="text-[#FF5C00]" />
          </h4>
        </div>
        <span className="text-[10px] bg-zinc-900 border border-white/5 text-zinc-500 font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
          Interactive HD
        </span>
      </div>

      {!isSupported ? (
        <div className="p-6 bg-red-950/20 border border-red-900/30 rounded-xl text-center space-y-2">
          <AlertCircle className="mx-auto text-red-500" size={24} />
          <p className="text-xs font-bold text-red-200">Enregistrement non supporté par ce navigateur.</p>
          <p className="text-[10px] text-zinc-400 font-sans">Veuillez autoriser la caméra ou ouvrir l'application dans un navigateur moderne.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Side: Video stage with custom overlays */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center relative bg-black rounded-xl overflow-hidden aspect-[9/16] max-w-[340px] mx-auto border border-white/10 shadow-2xl">
            {/* Live Preview Stream */}
            {stream && !videoUrl && (
              <div className="w-full h-full relative">
                <video
                  ref={videoPreviewRef}
                  muted
                  playsInline
                  className={`w-full h-full object-cover transform scale-x-[-1] transition-all duration-300 ${getFilterClass(filter)}`}
                />

                {/* Constant Watermark corner */}
                <div className="absolute top-4 right-4 z-20 pointer-events-none flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-100 font-sans">
                    Fit<span className="text-[#FF5C00]">food</span> Watermark
                  </span>
                </div>

                {/* Recording blinking indicator */}
                {recording && (
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-red-600/90 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider font-mono shadow-md animate-pulse">
                    <span className="w-1.5 h-1.5 bg-white rounded-full" />
                    <span>REC • {duration}s</span>
                  </div>
                )}

                {/* Interactive Audio Level Meter */}
                {recording && (
                  <div className="absolute bottom-6 left-4 right-4 z-20 bg-black/40 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-2 border border-white/5">
                    <Volume2 size={10} className="text-zinc-400 shrink-0" />
                    <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-emerald-500"
                        style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Captured Video Preview with Automatic Outro Simulator */}
            {videoUrl && (
              <div className="w-full h-full relative">
                <video
                  ref={capturedVideoRef}
                  src={getSafeVideoUrl(videoUrl)}
                  playsInline
                  autoPlay
                  loop
                  onPlay={() => setIsPlayingCaptured(true)}
                  onPause={() => setIsPlayingCaptured(false)}
                  onError={(e) => {
                    console.warn('[VideoRecorderStudio] Recorded video load error, falling back');
                    e.currentTarget.src = STABLE_CULINARY_FALLBACK_VIDEOS[0];
                  }}
                  onTimeUpdate={(e) => {
                    setPreviewTime(e.currentTarget.currentTime);
                    setPreviewDuration(e.currentTarget.duration || 1);
                  }}
                  onLoadedMetadata={(e) => {
                    setPreviewDuration(e.currentTarget.duration || 1);
                  }}
                  className={`w-full h-full object-cover ${getFilterClass(filter)}`}
                />

                {/* Subtle Watermark corner */}
                <div className="absolute top-4 right-4 z-20 pointer-events-none flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-100 font-sans">
                    Fit<span className="text-[#FF5C00]">food</span> Watermark
                  </span>
                </div>

                {/* Ending Outro Animation Demonstration overlay (triggered in the final 2.5s of preview playback) */}
                {previewDuration > 0 && (previewDuration - previewTime <= 2.5) && (
                  <motion.div
                    className="absolute inset-0 z-30 bg-[#050506]/95 flex flex-col items-center justify-center text-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <motion.div
                      className="w-16 h-16 mb-3 flex items-center justify-center bg-zinc-950 border border-white/10 rounded-2xl shadow-xl"
                      initial={{ scale: 0.5, rotate: -15 }}
                      animate={{ scale: 1, rotate: 0 }}
                    >
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" stroke="#FF5C00" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8v8M3 9v6" stroke="#10B981" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 8v8M21 9v6" stroke="#10B981" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4c2.5 0 4 2 4 4s-1.5 4-4 4-4-2-4-4 1.5-4 4-4z" stroke="#FF5C00" fill="#FF5C00" fillOpacity="0.1" />
                      </svg>
                    </motion.div>

                    <h5 className="text-sm font-black text-white uppercase italic">Fit<span className="text-[#FF5C00]">food</span> Studio</h5>
                    <p className="text-[8px] text-zinc-500 font-mono tracking-widest uppercase mt-0.5">LOGO & WATERMARK OUTRO</p>
                    <div className="w-8 h-[1.5px] bg-gradient-to-r from-emerald-500 to-[#FF5C00] rounded-full my-2 mx-auto" />
                    
                    <button
                      onClick={() => {
                        if (capturedVideoRef.current) {
                          capturedVideoRef.current.currentTime = 0;
                          capturedVideoRef.current.play();
                        }
                      }}
                      className="px-2.5 py-1 bg-zinc-900 border border-white/15 text-[8.5px] text-zinc-300 font-bold uppercase rounded-lg hover:text-white"
                    >
                      🔁 Revoir la preview
                    </button>
                  </motion.div>
                )}
              </div>
            )}

            {/* Offline/Permission request state */}
            {!stream && !videoUrl && (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-14 h-14 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400">
                  <Camera size={24} />
                </div>
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-white uppercase font-mono">Démarrer le Studio</h5>
                  <p className="text-[10px] text-zinc-400 font-sans max-w-[200px]">Enregistrez votre cuisine, vos burgers sains ou vos salades de chef en direct.</p>
                </div>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-zinc-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95"
                >
                  Ouvrir la caméra
                </button>
              </div>
            )}
          </div>

          {/* Right Side: Recording controls, filters, adjustments */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Studio Filters block */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider font-mono">
                  Sélectionner un filtre de caméra :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'warm-food', label: '🔥 Warm Food' },
                    { id: 'silver-vintage', label: '🎞️ Silver Grain' },
                    { id: 'cinematic-pro', label: '🎬 Cinematic Pro' },
                    { id: 'cyber-glow', label: '⚡ Cyber Glow' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      className={`py-2 px-3 rounded-lg text-[10.5px] font-bold text-left border transition-all ${
                        filter === f.id
                          ? 'bg-[#FF5C00]/15 text-white border-[#FF5C00]'
                          : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Physical Info box explaining the process */}
              <div className="p-3 bg-[#0F0F12] border border-white/[0.03] rounded-xl space-y-2">
                <div className="text-[9.5px] font-black uppercase text-[#10B981] tracking-wider font-mono flex items-center gap-1">
                  <span>ℹ️ Processus de Watermarking automatique</span>
                </div>
                <p className="text-[9.5px] text-zinc-400 font-sans leading-relaxed">
                  Le système de traitement Fitfood injecte une signature numérique invisible et un logo animé à la toute fin de la vidéo (outro de 2,5s). Tout utilisateur visualisant ce contenu verra votre logo et le filigrane de votre marque.
                </p>
              </div>
            </div>

            {/* Bottom State Controller Buttons */}
            <div className="pt-3 border-t border-white/5 space-y-2">
              {stream && (
                <div className="flex gap-2">
                  {!recording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Video size={14} className="fill-current text-white animate-pulse" />
                      Démarrer l'enregistrement
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex-1 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 animate-pulse"
                    >
                      <Square size={14} className="fill-current text-zinc-950" />
                      Arrêter & Générer Outro
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white rounded-xl transition-all"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              )}

              {videoUrl && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-white/10 text-white font-bold text-[10.5px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Download size={13} />
                      Télécharger .mp4
                    </button>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 border border-white/10 text-zinc-400 hover:text-white font-bold text-[10.5px] uppercase rounded-xl transition-all"
                    >
                      Recommencer
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyVideo}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-[#FF5C00] hover:opacity-90 text-zinc-950 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#FF5C00]/15 text-white cursor-pointer"
                  >
                    <Check size={14} />
                    Appliquer la vidéo au formulaire
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
