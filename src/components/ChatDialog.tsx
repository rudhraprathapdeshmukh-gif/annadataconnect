import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { MessageCircle, X } from 'lucide-react';
import Chat from './Chat';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from './ui/drawer';

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
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const trigger = (
    <Button variant={buttonVariant} size={buttonSize} className="transition-all hover:scale-105 active:scale-95">
      <MessageCircle className="h-4 w-4 mr-2" />
      {buttonText}
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          className="transition-all hover:scale-105 active:scale-95"
          onClick={() => setOpen(true)}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
        <DrawerContent className="h-[95dvh] flex flex-col">
          <DrawerHeader className="flex flex-row items-center justify-between border-b px-4 py-3 flex-shrink-0">
            <DrawerTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-sm">{donationTitle}</span>
                <span className="text-xs text-muted-foreground font-normal truncate">with {otherUserName}</span>
              </div>
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full flex-shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <Chat
              donationId={donationId}
              otherUserId={otherUserId}
              otherUserName={otherUserName}
              donationTitle={donationTitle}
              embedded
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl p-0 animate-scale-in flex flex-col" style={{ height: '80dvh', maxHeight: '80dvh' }}>
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
