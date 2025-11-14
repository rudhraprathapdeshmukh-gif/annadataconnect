import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { MessageCircle } from 'lucide-react';
import Chat from './Chat';

interface ChatDialogProps {
  donationId: string;
  otherUserId: string;
  otherUserName: string;
  donationTitle: string;
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  buttonText?: string;
}

export default function ChatDialog({
  donationId,
  otherUserId,
  otherUserName,
  donationTitle,
  buttonVariant = 'outline',
  buttonSize = 'default',
  buttonText = 'Message',
}: ChatDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className="transition-all hover:scale-105 active:scale-95">
          <MessageCircle className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 animate-scale-in">
        <Chat
          donationId={donationId}
          otherUserId={otherUserId}
          otherUserName={otherUserName}
          donationTitle={donationTitle}
        />
      </DialogContent>
    </Dialog>
  );
}
