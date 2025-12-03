import { Bell, X, Trash2, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Dialog, DialogContent } from './ui/dialog';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Chat from './Chat';

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications();
  
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatData, setChatData] = useState<{
    donationId: string;
    otherUserId: string;
    otherUserName: string;
    donationTitle: string;
  } | null>(null);

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.type === 'message_received' && notification.related_id) {
      try {
        const { data: message } = await supabase
          .from('messages')
          .select('donation_id, sender_id')
          .eq('id', notification.related_id)
          .single();

        if (!message) return;

        const { data: donation } = await supabase
          .from('food_donations')
          .select('title, status, deleted_at')
          .eq('id', message.donation_id)
          .maybeSingle();

        // Check if donation doesn't exist or has been deleted
        if (!donation || donation.deleted_at) {
          toast.info('This donation has been deleted. Chat is no longer available.');
          return;
        }

        // Check if donation is completed - don't open chat
        if (donation.status === 'completed') {
          toast.info('This donation has been completed. Chat is no longer available.');
          return;
        }

        const otherUserName = notification.title.replace('New Message from ', '');

        setChatData({
          donationId: message.donation_id,
          otherUserId: message.sender_id,
          otherUserName,
          donationTitle: donation?.title || 'Donation',
        });
        setChatOpen(true);
      } catch (error) {
        console.error('Error opening chat:', error);
        toast.error('Failed to open chat');
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {unreadCount > 0 && (
                  <DropdownMenuItem onClick={markAllAsRead}>
                    Mark all as read
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => setShowDeleteAllDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {permission !== 'granted' && (
          <div className="p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground mb-2">
              Enable push notifications to get alerts even when the app is closed
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={requestPermission}
              className="w-full"
            >
              Enable Notifications
            </Button>
          </div>
        )}

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    !notification.read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    )}
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Confirmation dialog for removing all notifications */}
        <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove all notifications?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all {notifications.length} notification{notifications.length !== 1 ? 's' : ''}. 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  deleteAllNotifications();
                  setShowDeleteAllDialog(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PopoverContent>

      {/* Chat Dialog for message notifications */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 animate-scale-in">
          {chatData && (
            <Chat
              donationId={chatData.donationId}
              otherUserId={chatData.otherUserId}
              otherUserName={chatData.otherUserName}
              donationTitle={chatData.donationTitle}
            />
          )}
        </DialogContent>
      </Dialog>
    </Popover>
  );
}
