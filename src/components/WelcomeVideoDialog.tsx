import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface WelcomeVideoDialogProps {
  open: boolean;
  onContinue: () => void;
  videoId: string;
}

export function WelcomeVideoDialog({ open, onContinue, videoId }: WelcomeVideoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onContinue()}>
      <DialogContent className="max-w-4xl glass-card border-2 gradient-border p-6">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent">
            Welcome to AnnadataConnect! 🎉
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Watch this quick 2-minute guide to learn how to make the most of our platform
          </DialogDescription>
        </DialogHeader>

        {/* Video Container */}
        <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xl border border-primary/20 my-4">
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            title="Welcome to AnnadataConnect"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <Button
            onClick={onContinue}
            size="lg"
            className="shadow-lg hover:shadow-xl glow-effect transform hover:scale-105 transition-all"
          >
            Continue to Dashboard
          </Button>
          <Button
            onClick={onContinue}
            variant="ghost"
            size="lg"
            className="transform hover:scale-105 transition-all"
          >
            Skip for now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
