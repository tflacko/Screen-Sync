'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '@/styles/ParticleCanvas.module.css';

interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number;
  r: number; cherry: boolean;
}

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false);

  // Decide once, on the client, whether the canvas should run at all.
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const small = window.innerWidth < 768;
    setEnabled(!reduceMotion && !coarse && !small);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true })!;

    let W = 0, H = 0;
    let mx = 0, my = 0;
    let animId = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    // Lighter particle budget than the marketing site.
    const COUNT = Math.min(48, Math.floor((window.innerWidth * window.innerHeight) / 26000));
    const LINK_DIST = 120;
    const particles: Particle[] = [];

    function init() {
      W = canvas!.offsetWidth;
      H = canvas!.offsetHeight;
      canvas!.width = Math.floor(W * dpr);
      canvas!.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mx = W / 2;
      my = H / 2;
    }

    function spawn(): Particle {
      return {
        x: (Math.random() - 0.5) * 1400,
        y: (Math.random() - 0.5) * 900,
        z: Math.random() * 800 + 100,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.5,
        cherry: Math.random() < 0.18,
      };
    }
    for (let i = 0; i < COUNT; i++) particles.push(spawn());

    function project(p: Particle) {
      const rotX = (my / H - 0.5) * 0.5;
      const rotY = (mx / W - 0.5) * 0.6;
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const y1 = p.y * cosX - p.z * sinX;
      const z1 = p.y * sinX + p.z * cosX;
      const x2 = p.x * cosY + z1 * sinY;
      const z2 = -p.x * sinY + z1 * cosY;
      const fov = 600;
      const scale = fov / (fov + z2);
      return { sx: W / 2 + x2 * scale, sy: H / 2 + y1 * scale, scale };
    }

    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);

      const proj = particles.map((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x > 700 || p.x < -700) p.vx *= -1;
        if (p.y > 450 || p.y < -450) p.vy *= -1;
        return project(p);
      });

      // Connecting lines
      for (let i = 0; i < proj.length; i++) {
        for (let j = i + 1; j < proj.length; j++) {
          const dx = proj[i].sx - proj[j].sx;
          const dy = proj[i].sy - proj[j].sy;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DIST) {
            ctx.beginPath();
            ctx.moveTo(proj[i].sx, proj[i].sy);
            ctx.lineTo(proj[j].sx, proj[j].sy);
            ctx.strokeStyle = `rgba(234,227,211,${(1 - dist / LINK_DIST) * 0.1})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Particles
      for (let i = 0; i < proj.length; i++) {
        const { sx, sy, scale } = proj[i];
        ctx.beginPath();
        ctx.arc(sx, sy, particles[i].r * scale * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = particles[i].cherry
          ? `rgba(194,58,82,${0.45 + scale * 0.4})`
          : `rgba(234,227,211,${0.22 + scale * 0.32})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    const onResize = () => init();
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    const onVisibility = () => {
      running = document.visibilityState === 'visible';
      if (running) { cancelAnimationFrame(animId); animId = requestAnimationFrame(draw); }
    };

    init();
    draw();
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden />;
}
