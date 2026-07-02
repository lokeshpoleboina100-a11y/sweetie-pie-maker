import { useEffect, useRef } from 'react';

/**
 * PremiumBackground — animated gradient + floating glow blobs + particle field.
 * Palette: #0B1020 → #1A1F3C base with #6C63FF / #00D4FF / #FF4D9D / #8B5CF6 glows.
 * Uses a single canvas + rAF; capped particle count for 60fps on mobile.
 */
export default function PremiumBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouse = (e: MouseEvent) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
    };
    window.addEventListener('mousemove', onMouse);

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    const blobs = [
      { hue: 250, r: 380, sx: 0.2, sy: 0.3, ax: 0.6, ay: 0.5, ph: 0 },       // violet
      { hue: 190, r: 340, sx: 0.8, sy: 0.25, ax: 0.4, ay: 0.7, ph: 1.3 },    // cyan
      { hue: 325, r: 300, sx: 0.55, sy: 0.75, ax: 0.5, ay: 0.4, ph: 2.4 },   // pink
      { hue: 265, r: 360, sx: 0.15, sy: 0.8, ax: 0.7, ay: 0.55, ph: 3.6 },   // indigo
      { hue: 210, r: 320, sx: 0.9, sy: 0.85, ax: 0.35, ay: 0.6, ph: 4.7 },   // deep blue
    ];

    const particleCount = Math.min(70, Math.floor((w() * h()) / 22000));
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * w(),
      y: Math.random() * h(),
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.6 + 0.4,
      o: Math.random() * 0.5 + 0.2,
    }));

    let t = 0;
    const draw = () => {
      t += 0.005;
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;

      // base gradient (deep navy → indigo)
      const bg = ctx.createLinearGradient(0, 0, w(), h());
      bg.addColorStop(0, '#0B1020');
      bg.addColorStop(1, '#1A1F3C');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w(), h());

      // floating blobs with parallax
      ctx.globalCompositeOperation = 'lighter';
      for (const b of blobs) {
        const cx = w() * b.sx + Math.cos(t * 0.6 + b.ph) * w() * 0.08 * b.ax
          + (mouse.x - w() / 2) * 0.02;
        const cy = h() * b.sy + Math.sin(t * 0.5 + b.ph) * h() * 0.08 * b.ay
          + (mouse.y - h() / 2) * 0.02;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
        grad.addColorStop(0, `hsla(${b.hue}, 90%, 60%, 0.32)`);
        grad.addColorStop(0.55, `hsla(${b.hue}, 90%, 55%, 0.08)`);
        grad.addColorStop(1, `hsla(${b.hue}, 90%, 55%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w()) p.vx *= -1;
        if (p.y < 0 || p.y > h()) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${p.o})`;
        ctx.fill();
      }

      // subtle connective lines
      const maxD = 120;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.hypot(dx, dy);
          if (d < maxD) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(140, 170, 255, ${0.08 * (1 - d / maxD)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden
      />
      {/* subtle grain / vignette overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(108,99,255,0.12), transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(255,77,157,0.10), transparent 55%)',
        }}
        aria-hidden
      />
    </>
  );
}
