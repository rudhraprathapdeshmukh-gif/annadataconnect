import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Send, Loader2, MapPin, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: 'text' | 'location';
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  created_at: string;
  read: boolean;
}

// Memoized LocationMessage component to prevent re-rendering
const LocationMessage = React.memo(({ 
  lat, 
  lon, 
  locationName,
  isOwnMessage 
}: { 
  lat: number; 
  lon: number; 
  locationName?: string | null;
  isOwnMessage: boolean;
}) => {
  const [showFullMap, setShowFullMap] = React.useState(false);
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
  const staticMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01},${lat-0.01},${lon+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lon}`;
  
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Shared Location</p>
          {locationName && (
            <p className="text-xs opacity-80 mt-1">{locationName}</p>
          )}
          <p className="text-xs opacity-70 mt-1">
            {lat.toFixed(6)}, {lon.toFixed(6)}
          </p>
        </div>
      </div>
      
      {/* Clickable placeholder */}
      <div 
        className="rounded-lg overflow-hidden border-2 border-background/20 bg-muted/50 hover:bg-muted transition-colors cursor-pointer p-4 flex flex-col items-center justify-center gap-2 min-h-[120px]"
        onClick={() => setShowFullMap(prev => !prev)}
      >
        <MapPin className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-center">
          {showFullMap ? 'Hide map' : 'Click to view map'}
        </p>
        <p className="text-xs text-muted-foreground text-center">
          {lat.toFixed(4)}, {lon.toFixed(4)}
        </p>
      </div>

      {/* Inline full map – stays inside the chat bubble */}
      {showFullMap && (
        <div className="rounded-lg overflow-hidden border h-40 sm:h-56">
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            src={staticMapUrl}
            title="Location map"
            className="w-full h-full"
          />
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(googleMapsUrl, '_blank')}
          className="text-xs"
        >
          Open in Google Maps
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(`${lat}, ${lon}`);
            toast.success('Coordinates copied');
          }}
          className="text-xs"
        >
          Copy Coordinates
        </Button>
      </div>
    </div>
  );
});

interface ChatProps {
  donationId: string;
  otherUserId: string;
  otherUserName: string;
  donationTitle: string;
}

// Typing Indicator Component
const TypingIndicator = React.memo(({ userName }: { userName: string }) => (
  <div className="flex items-center gap-2 px-4 py-2 animate-fade-in">
    <span className="text-sm text-muted-foreground">{userName} is typing</span>
    <div className="flex gap-1">
      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
    </div>
  </div>
));

export default function Chat({ donationId, otherUserId, otherUserName, donationTitle }: ChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<any>(null);

  // Fetch existing messages
  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('donation_id', donationId)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      } else {
        setMessages((data as Message[]) || []);
      }
      setLoading(false);
    };

    fetchMessages();
  }, [user, donationId]);

  // Mark messages as read
  useEffect(() => {
    if (!user || messages.length === 0) return;

    const markAsRead = async () => {
      const unreadMessages = messages.filter(
        msg => msg.receiver_id === user.id && !msg.read
      );

      if (unreadMessages.length === 0) return;

      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .in('id', unreadMessages.map(msg => msg.id));

      if (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    markAsRead();
  }, [messages, user]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`chat_${donationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `donation_id=eq.${donationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Only add if it's relevant to this conversation
          if (
            (newMsg.sender_id === user.id && newMsg.receiver_id === otherUserId) ||
            (newMsg.sender_id === otherUserId && newMsg.receiver_id === user.id)
          ) {
            setMessages(prev => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, donationId, otherUserId]);

  // Presence channel for typing indicator
  useEffect(() => {
    if (!user) return;

    const presenceChannel = supabase
      .channel(`typing_${donationId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        // Check if other user is typing
        const otherUserPresence = Object.values(state).flat().find(
          (presence: any) => presence.user_id === otherUserId && presence.is_typing
        );
        setOtherUserTyping(!!otherUserPresence);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            is_typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(presenceChannel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user, donationId, otherUserId]);

  // Detect manual scrolling
  const handleScroll = () => {
    if (!scrollViewportRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current;
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
    
    setAutoScroll(isAtBottom);
  };

  // Auto-scroll to bottom only when enabled
  useEffect(() => {
    if (autoScroll && scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Safety mechanism: reset sending state after 10 seconds
  useEffect(() => {
    if (sending) {
      const timeout = setTimeout(() => {
        setSending(false);
        setIsGettingLocation(false);
        console.warn('Force-reset sending state due to timeout');
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [sending]);

  const handleTyping = () => {
    if (!user || !presenceChannelRef.current) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update presence to show typing
    presenceChannelRef.current.track({
      user_id: user.id,
      is_typing: true,
      online_at: new Date().toISOString(),
    });

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.track({
          user_id: user.id,
          is_typing: false,
          online_at: new Date().toISOString(),
        });
      }
    }, 2000);
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim() || sending) return;

    setSending(true);
    
    // Reset typing state immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({
        user_id: user.id,
        is_typing: false,
        online_at: new Date().toISOString(),
      });
    }

    try {
      const { error } = await supabase.from('messages').insert({
        donation_id: donationId,
        sender_id: user.id,
        receiver_id: otherUserId,
        message: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AnnadataConnect'
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.display_name || null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null; // Always return null on error, don't throw
    }
  };

  const sendLocation = async (lat: number, lon: number) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }
    
    setIsGettingLocation(false); // Reset this immediately
    
    try {
      const locationName = await reverseGeocode(lat, lon);
      
      const { error } = await supabase.from('messages').insert({
        donation_id: donationId,
        sender_id: user.id,
        receiver_id: otherUserId,
        message: locationName || `Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        message_type: 'location',
        latitude: lat,
        longitude: lon,
        location_name: locationName,
      });

      if (error) throw error;
      
      toast.success('Location shared successfully');
    } catch (error) {
      console.error('Error sending location:', error);
      toast.error('Failed to share location');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendLocation(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setIsGettingLocation(false);
        switch(error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location access denied. Please enable location permissions.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information unavailable.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out.');
            break;
          default:
            toast.error('Failed to get location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };


  if (loading) {
    return (
      <Card className="w-full h-[500px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="w-full h-[500px] flex flex-col overflow-hidden">
      <CardHeader className="border-b">
        <CardTitle className="text-lg">
          Chat about: {donationTitle}
        </CardTitle>
        <p className="text-sm text-muted-foreground">with {otherUserName}</p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0 relative">
        <ScrollArea className="flex-1 p-4">
          <div 
            ref={scrollViewportRef}
            onScroll={handleScroll}
            className="space-y-4"
          >
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender_id === user?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 overflow-hidden ${
                      msg.sender_id === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.message_type === 'location' && msg.latitude && msg.longitude ? (
                      <LocationMessage 
                        lat={msg.latitude} 
                        lon={msg.longitude} 
                        locationName={msg.location_name}
                        isOwnMessage={msg.sender_id === user?.id}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    )}
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender_id === user?.id
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        {/* Scroll to bottom button */}
        {!autoScroll && (
          <Button
            size="sm"
            className="absolute bottom-20 right-4 rounded-full shadow-lg z-10"
            onClick={() => {
              if (scrollViewportRef.current) {
                scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
                setAutoScroll(true);
              }
            }}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
        
        <div className="border-t p-4">
          {otherUserTyping && <TypingIndicator userName={otherUserName} />}
          {sending && (
            <p className="text-xs text-muted-foreground mb-2">
              Sending message...
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={getLocation}
              disabled={isGettingLocation}
              title="Share location"
            >
              {isGettingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </Button>
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              disabled={sending}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
