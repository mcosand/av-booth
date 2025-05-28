import { useRef, useEffect, type CSSProperties } from 'react';

interface CameraViewProps {
  ip: string;
  style?: CSSProperties;
}

export function CameraView(props: CameraViewProps) {
  const ref = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const timer = setInterval(() => {
      if (ref.current) {
        ref.current.src = `http://${props.ip}/action_snapshot?ts=${new Date().getTime()}`;
      }
    }, 200);
    return () => clearInterval(timer);
  }, [props.ip]);

  return (<img ref={ref} style={{ width: 320, height: 180, ...props.style }} />);
}