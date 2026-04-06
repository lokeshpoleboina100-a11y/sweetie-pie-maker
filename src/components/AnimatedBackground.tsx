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

    const particles: {
      x: number; y: number; vx: number; vy: number; r: number; opacity: number;
    }[] = [];
    const count = Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 10000));

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }

    const shapes = Array.from({ length: 8 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 40 + Math.random() * 80,
      speed: 0.15 + Math.random() * 0.25,
      angle: Math.random() * Math.PI * 2,
      hue: [230, 260, 190, 210, 280, 200, 240, 170][i],
    }));

    let t = 0;

    const draw = () => {
      t += 0.003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Gradient background
      const g1 = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const shift = Math.sin(t) * 10;
      g1.addColorStop(0, `hsl(${225 + shift}, 50%, 6%)`);
      g1.addColorStop(0.4, `hsl(${245 + shift}, 45%, 10%)`);
      g1.addColorStop(1, `hsl(${210 + shift}, 55%, 5%)`);
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Floating glowing shapes
      for (const s of shapes) {
        s.angle += s.speed * 0.008;
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed * 0.6;

        const px = (mouse.x - canvas.width / 2) * 0.008;
        const py = (mouse.y - canvas.height / 2) * 0.008;

        const grad = ctx.createRadialGradient(
          s.x + px, s.y + py, 0,
          s.x + px, s.y + py, s.r
        );
        grad.addColorStop(0, `hsla(${s.hue}, 70%, 55%, 0.12)`);
        grad.addColorStop(1, `hsla(${s.hue}, 70%, 55%, 0)`);
        ctx.beginPath();
        ctx.arc(s.x + px, s.y + py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        if (s.x < -s.r) s.x = canvas.width + s.r;
        if (s.x > canvas.width + s.r) s.x = -s.r;
        if (s.y < -s.r) s.y = canvas.height + s.r;
        if (s.y > canvas.height + s.r) s.y = -s.r;
      }

      // Particles + lines
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(130, 170, 255, ${p.opacity})`;
        ctx.fill();
      }

      const maxDist = 110;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(100, 150, 255, ${0.12 * (1 - dist / maxDist)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Subtle wave
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 3) {
        const y = canvas.height * 0.75 + Math.sin(x * 0.006 + t * 4) * 15 + Math.sin(x * 0.012 + t * 2.5) * 8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(80, 130, 255, 0.04)';
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
