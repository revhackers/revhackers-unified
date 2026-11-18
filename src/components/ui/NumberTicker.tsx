/**
 * NumberTicker, animação de contagem numérica inspirada no magicui/NumberTicker.
 * Implementado com Framer Motion (já na stack), sem dependência adicional.
 *
 * Uso:
 *   <NumberTicker value={47} suffix="+" duration={1.5} />
 *   <NumberTicker value={48} prefix="R$" suffix="M+" duration={2} />
 */
import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

interface NumberTickerProps {
  /** Valor numérico final */
  value: number;
  /** Sufixo exibido após o número (ex: "+", "M+", "%") */
  suffix?: string;
  /** Prefixo exibido antes do número (ex: "R$") */
  prefix?: string;
  /** Duração da animação em segundos */
  duration?: number;
  /** Classe CSS adicional */
  className?: string;
  /** Número de casas decimais */
  decimals?: number;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function NumberTicker({
  value,
  suffix = '',
  prefix = '',
  duration = 1.8,
  className = '',
  decimals = 0,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [current, setCurrent] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!inView) return;

    const startAnimation = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      setCurrent(Math.round(eased * value * Math.pow(10, decimals)) / Math.pow(10, decimals));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(startAnimation);
      } else {
        setCurrent(value);
      }
    };

    animationRef.current = requestAnimationFrame(startAnimation);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      startTimeRef.current = null;
    };
  }, [inView, value, duration, decimals]);

  const formatted = decimals > 0
    ? current.toFixed(decimals)
    : Math.floor(current).toString();

  return (
    <span ref={ref} className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

export default NumberTicker;
