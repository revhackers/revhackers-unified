import { useEffect, useState } from 'react';

const CHARS = '!<>-_\\\\/[]{}-=+*^?#________';

interface ScrambleTextProps {
  /** O texto a ser revelado via decodificação */
  text: string;
  /** Duração da animação em milissegundos */
  duration?: number;
  /** Gatilho para iniciar a animação (ex: inView) */
  trigger?: boolean;
  /** Atraso antes de começar a animação (ms) */
  delay?: number;
  /** Classes adicionais para o container span */
  className?: string;
}

export function ScrambleText({
  text,
  duration = 800,
  trigger = true,
  delay = 0,
  className = '',
}: ScrambleTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!trigger) {
      setStarted(false);
      setDisplayText('');
      return;
    }

    const timeout = setTimeout(() => {
      setStarted(true);
    }, delay);

    return () => clearTimeout(timeout);
  }, [trigger, delay]);

  useEffect(() => {
    if (!started) return;

    let frame: number;
    let startTime: number | null = null;
    const length = text.length;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Usamos easeOutQuart para desacelerar as letras no final
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      const revealCount = Math.floor(length * easeProgress);
      
      let scrambled = text.substring(0, revealCount);
      
      for (let i = revealCount; i < length; i++) {
        if (text[i] === ' ' || text[i] === '\n') {
          scrambled += text[i];
        } else {
          scrambled += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }
      
      setDisplayText(scrambled);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        setDisplayText(text); // Garantia final
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [text, duration, started]);

  if (!trigger && delay === 0) {
    return <span className={className} style={{ opacity: 0 }}>{text}</span>;
  }

  // Pre-wrap garante que espaços preservados não colapsem
  return (
    <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {started ? displayText : <span style={{ opacity: 0 }}>{text}</span>}
    </span>
  );
}
