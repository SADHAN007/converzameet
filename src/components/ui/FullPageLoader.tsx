import LogoLoader from './LogoLoader';

interface FullPageLoaderProps {
  text?: string;
}

export default function FullPageLoader({ text = 'Loading...' }: FullPageLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <LogoLoader size="lg" text={text} />
    </div>
  );
}
