
import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuration for sensitivity
    analyser.fftSize = 256; // 128 bins
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      animationIdRef.current = requestAnimationFrame(renderFrame);
      
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const barWidth = (canvas.width / bufferLength) * 2.5; // Wider bars
      let barHeight;
      let x = 0;

      // Glow Effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#fbbf24'; // Amber-400

      // Sensitivity Multiplier (Boost visual response for speech)
      const sensitivity = 1.8; 

      for (let i = 0; i < bufferLength; i++) {
        // Boost low frequencies slightly more for voice presence
        const boost = i < 10 ? 1.2 : 1.0;
        barHeight = (dataArray[i] / 255) * canvas.height * sensitivity * boost;
        
        // Clamp height
        if (barHeight > canvas.height) barHeight = canvas.height;
        // Min height for visibility
        if (dataArray[i] > 0 && barHeight < 2) barHeight = 2;

        // Gradient Color based on height
        const r = 245; // Amber Red
        const g = 158 + (i * 2); // Variation
        const b = 11;
        
        ctx.fillStyle = `rgb(${r},${g},${b})`;

        // Draw Mirrored Bars
        // Right side
        ctx.fillRect(centerX + x, (canvas.height - barHeight) / 2, barWidth, barHeight);
        // Left side
        ctx.fillRect(centerX - x - barWidth, (canvas.height - barHeight) / 2, barWidth, barHeight);

        x += barWidth + 1; // Spacing
        
        // Stop if outside canvas
        if (x > centerX) break;
      }
    };

    renderFrame();

    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    };
  }, [analyser]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={100}
      className="w-full h-full"
    />
  );
};

export default Visualizer;
