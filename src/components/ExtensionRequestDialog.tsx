import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, MessageSquare } from 'lucide-react';

interface ExtensionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => Promise<void>;
  extensionMinutes?: number;
  maxExtensions?: number;
  currentExtensions?: number;
}

export function ExtensionRequestDialog({
  open,
  onOpenChange,
  onSubmit,
  extensionMinutes = 5,
  maxExtensions = 2,
  currentExtensions = 0,
}: ExtensionRequestDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(reason);
      setReason('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit extension request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingExtensions = maxExtensions - currentExtensions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Request Time Extension
          </DialogTitle>
          <DialogDescription>
            Request an additional {extensionMinutes} minutes from the donor. 
            You have {remainingExtensions} extension{remainingExtensions !== 1 ? 's' : ''} remaining.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Reason for extension
            </Label>
            <Textarea
              id="reason"
              placeholder="e.g., Traffic delay, Still 10 minutes away..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/200 characters
            </p>
          </div>

          <div className="bg-muted p-3 rounded-md text-sm space-y-1">
            <p className="font-medium">Extension Details:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>+{extensionMinutes} minutes will be added if approved</li>
              <li>Donor will be notified immediately</li>
              <li>Not guaranteed - donor may decline</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Request Extension'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
