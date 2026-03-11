import { Link } from 'react-router-dom';
import { Headphones, ArrowLeft } from 'lucide-react';

const NotFound = () => (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
    <div className="absolute inset-0 gradient-mesh" />
    <div className="relative z-10 text-center animate-fade-in">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Headphones className="h-8 w-8 text-primary" />
      </div>
      <h1 className="font-heading text-6xl font-bold tracking-tight text-foreground">404</h1>
      <p className="mt-3 text-lg text-muted-foreground">The page you're looking for doesn't exist</p>
      <Link
        to="/login"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-primary-glow"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>
    </div>
  </div>
);

export default NotFound;
