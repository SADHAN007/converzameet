import { useLogoFilter } from '@/hooks/useTheme';
import converzaLogo from '@/assets/converza-logo.png';
import { cn } from '@/lib/utils';

interface ThemedLogoProps {
  className?: string;
  alt?: string;
}

export default function ThemedLogo({ className, alt = 'Converza' }: ThemedLogoProps) {
  const logoFilter = useLogoFilter();

  return (
    <img
      src={converzaLogo}
      alt={alt}
      className={cn('object-contain transition-all duration-300', className)}
      style={{ filter: logoFilter }}
    />
  );
}
