import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let mouse = { x: 0, y: 0 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouse);

    // Particles
    const particles: {
      x: number; y: number; vx: number; vy: number; r: number; opacity: number;
    }[] = [];
    const count = Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 12000));

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }

    // Floating shapes
    const shapes = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 30 + Math.random() * 60,
      speed: 0.2 + Math.random() * 0.3,
      angle: Math.random() * Math.PI * 2,
      hue: [220, 260, 190, 25, 300, 170][i],
    }));

    let t = 0;

    const draw = () => {
      t += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Gradient background
      const g1 = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const hueShift = Math.sin(t) * 15;
      g1.addColorStop(0, `hsl(${225 + hueShift}, 45%, 8%)`);
      g1.addColorStop(0.5, `hsl(${260 + hueShift}, 40%, 12%)`);
      g1.addColorStop(1, `hsl(${200 + hueShift}, 50%, 6%)`);
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Floating glowing shapes
      for (const s of shapes) {
        s.angle += s.speed * 0.01;
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed * 0.7;

        // Parallax with mouse
        const px = (mouse.x - canvas.width / 2) * 0.01;
        const py = (mouse.y - canvas.height / 2) * 0.01;

        const grad = ctx.createRadialGradient(
          s.x + px, s.y + py, 0,
          s.x + px, s.y + py, s.r
        );
        grad.addColorStop(0, `hsla(${s.hue}, 80%, 60%, 0.15)`);
        grad.addColorStop(1, `hsla(${s.hue}, 80%, 60%, 0)`);
        ctx.beginPath();
        ctx.arc(s.x + px, s.y + py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Wrap around
        if (s.x < -s.r) s.x = canvas.width + s.r;
        if (s.x > canvas.width + s.r) s.x = -s.r;
        if (s.y < -s.r) s.y = canvas.height + s.r;
        if (s.y > canvas.height + s.r) s.y = -s.r;
      }

      // Particles + connecting lines
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150, 180, 255, ${p.opacity})`;
        ctx.fill();
      }

      // Lines between nearby particles
      const maxDist = 120;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(130, 170, 255, ${0.15 * (1 - dist / maxDist)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Mesh wave effect
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 4) {
        const y = canvas.height * 0.7 + Math.sin(x * 0.008 + t * 3) * 20 + Math.sin(x * 0.015 + t * 2) * 10;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(100, 160, 255, 0.06)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
