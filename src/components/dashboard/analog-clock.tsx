'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { ClockState } from '@/types';

interface AnalogClockProps {
  time: ClockState;
  label: string;
  abbreviation?: string;
  isPrimary?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
  className?: string;
}

export function AnalogClock({
  time,
  label,
  abbreviation,
  isPrimary = false,
  isLoading = false,
  hasError = false,
  className,
}: AnalogClockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = isPrimary ? 160 : 120;
  const center = size / 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas scaling for retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Get theme colors based on dark mode
    const isDarkMode = document.documentElement.classList.contains('dark');

    // Default colors
    const clockFace = isDarkMode ? '#1f2937' : '#ffffff';
    const clockBorder = isDarkMode ? '#374151' : '#e5e7eb';
    const hourHandColor = isDarkMode ? '#f9fafb' : '#1f2937';
    const minuteHandColor = isDarkMode ? '#d1d5db' : '#374151';
    const secondHandColor = '#ef4444';
    const tickColor = isDarkMode ? '#6b7280' : '#9ca3af';
    const hourTickColor = isDarkMode ? '#9ca3af' : '#6b7280';
    const centerDotColor = isPrimary ? '#3b82f6' : (isDarkMode ? '#6b7280' : '#9ca3af');

    // Draw loading state
    if (isLoading) {
      ctx.beginPath();
      ctx.arc(center, center, center - 8, 0, Math.PI * 2);
      ctx.fillStyle = clockFace;
      ctx.fill();
      ctx.strokeStyle = clockBorder;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Loading spinner
      ctx.save();
      ctx.translate(center, center);
      const loadingAngle = (Date.now() / 500) % (Math.PI * 2);
      ctx.rotate(loadingAngle);
      ctx.beginPath();
      ctx.arc(0, 0, center - 25, 0, Math.PI * 0.75);
      ctx.strokeStyle = centerDotColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Draw error state
    if (hasError) {
      ctx.beginPath();
      ctx.arc(center, center, center - 8, 0, Math.PI * 2);
      ctx.fillStyle = clockFace;
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Error X
      ctx.save();
      ctx.translate(center, center);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const xSize = 15;
      ctx.beginPath();
      ctx.moveTo(-xSize, -xSize);
      ctx.lineTo(xSize, xSize);
      ctx.moveTo(xSize, -xSize);
      ctx.lineTo(-xSize, xSize);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Draw clock face
    ctx.beginPath();
    ctx.arc(center, center, center - 8, 0, Math.PI * 2);
    ctx.fillStyle = clockFace;
    ctx.fill();

    // Draw outer ring
    ctx.beginPath();
    ctx.arc(center, center, center - 8, 0, Math.PI * 2);
    ctx.strokeStyle = isPrimary ? '#3b82f6' : clockBorder;
    ctx.lineWidth = isPrimary ? 3 : 2;
    ctx.stroke();

    // Draw tick marks
    for (let i = 0; i < 60; i++) {
      const angle = (i * 6 - 90) * (Math.PI / 180);
      const isHourMark = i % 5 === 0;

      const outerRadius = center - 12;
      const innerRadius = isHourMark ? center - 22 : center - 17;

      const x1 = center + outerRadius * Math.cos(angle);
      const y1 = center + outerRadius * Math.sin(angle);
      const x2 = center + innerRadius * Math.cos(angle);
      const y2 = center + innerRadius * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = isHourMark ? hourTickColor : tickColor;
      ctx.lineWidth = isHourMark ? 2 : 1;
      ctx.stroke();
    }

    // Calculate angles for hands
    const hourAngle = ((time.hours % 12 + time.minutes / 60) * 30 - 90) * (Math.PI / 180);
    const minuteAngle = ((time.minutes + time.seconds / 60) * 6 - 90) * (Math.PI / 180);
    const secondAngle = (time.seconds * 6 - 90) * (Math.PI / 180);

    // Draw hour hand
    const hourLength = center - 45;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(
      center + hourLength * Math.cos(hourAngle),
      center + hourLength * Math.sin(hourAngle)
    );
    ctx.strokeStyle = hourHandColor;
    ctx.lineWidth = isPrimary ? 4 : 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw minute hand
    const minuteLength = center - 30;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(
      center + minuteLength * Math.cos(minuteAngle),
      center + minuteLength * Math.sin(minuteAngle)
    );
    ctx.strokeStyle = minuteHandColor;
    ctx.lineWidth = isPrimary ? 3 : 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw second hand
    const secondLength = center - 25;
    ctx.beginPath();
    ctx.moveTo(center - 10 * Math.cos(secondAngle), center - 10 * Math.sin(secondAngle));
    ctx.lineTo(
      center + secondLength * Math.cos(secondAngle),
      center + secondLength * Math.sin(secondAngle)
    );
    ctx.strokeStyle = secondHandColor;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw center dot
    ctx.beginPath();
    ctx.arc(center, center, isPrimary ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = centerDotColor;
    ctx.fill();

    // Inner center dot
    ctx.beginPath();
    ctx.arc(center, center, 2, 0, Math.PI * 2);
    ctx.fillStyle = clockFace;
    ctx.fill();
  }, [time, size, center, isPrimary, isLoading, hasError]);

  // Animate loading spinner
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        // Force re-render by updating canvas
        canvas.dispatchEvent(new Event('repaint'));
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Re-render on loading change
  useEffect(() => {
    if (!isLoading) return;

    let animationFrameId: number;
    let isCancelled = false;

    const renderLoop = () => {
      if (isCancelled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const isDarkMode = document.documentElement.classList.contains('dark');
      const clockFace = isDarkMode ? '#1f2937' : '#ffffff';
      const clockBorder = isDarkMode ? '#374151' : '#e5e7eb';
      const centerDotColor = isPrimary ? '#3b82f6' : (isDarkMode ? '#6b7280' : '#9ca3af');

      ctx.beginPath();
      ctx.arc(center, center, center - 8, 0, Math.PI * 2);
      ctx.fillStyle = clockFace;
      ctx.fill();
      ctx.strokeStyle = clockBorder;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);
      const loadingAngle = (Date.now() / 500) % (Math.PI * 2);
      ctx.rotate(loadingAngle);
      ctx.beginPath();
      ctx.arc(0, 0, center - 25, 0, Math.PI * 0.75);
      ctx.strokeStyle = centerDotColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [isLoading, size, center, isPrimary]);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <canvas
        ref={canvasRef}
        className="transition-opacity duration-300"
        style={{ width: size, height: size }}
      />
      <div className="mt-2 text-center">
        <p className={cn(
          'font-medium',
          isPrimary ? 'text-sm' : 'text-xs',
          hasError && 'text-destructive'
        )}>
          {label}
        </p>
        {abbreviation && !hasError && (
          <p className="text-xs text-muted-foreground">
            {abbreviation}
          </p>
        )}
        {hasError && (
          <p className="text-xs text-destructive">
            Offline
          </p>
        )}
      </div>
    </div>
  );
}
