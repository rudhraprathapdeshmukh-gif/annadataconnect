import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Send, Loader2, MapPin, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { calculateDistance } from '@/lib/geoUtils';

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
  messageId,
  lat, 
  lon, 
  locationName,
  isOwnMessage,
  pickupLocation 
}: { 
  messageId: string;
  lat: number; 
  lon: number; 
  locationName?: string | null;
  isOwnMessage: boolean;
  pickupLocation?: {
    latitude: number | null;
    longitude: number | null;
    address: string;
  } | null;
}) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
  const staticMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01},${lat-0.01},${lon+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lon}`;
  
  // Calculate distance if pickup coordinates exist
  const distance = pickupLocation?.latitude && pickupLocation?.longitude
    ? calculateDistance(lat, lon, pickupLocation.latitude, pickupLocation.longitude)
    : null;
  
  return (
    <>
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
        
        {/* Map Preview */}
        <div className="rounded-lg overflow-hidden border-2 border-background/20 relative group">
          <iframe
            width="100%"
            height="150"
            frameBorder="0"
            scrolling="no"
            src={staticMapUrl}
            title="Location preview"
            className="w-full"
          />
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setIsDialogOpen(true)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        
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

      {/* Full Map Dialog */}
      <Dialog key={messageId} open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Location Map</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col gap-4 h-full">
            {locationName && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Shared Location:</p>
                <p className="text-sm text-muted-foreground">{locationName}</p>
              </div>
            )}
            
            {/* Distance to Pickup Location */}
            {pickupLocation ? (
              distance !== null ? (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Distance to Pickup Location</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{pickupLocation.address}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-primary">{distance} km</p>
                      <p className="text-xs text-muted-foreground">
                        {distance < 1 ? `${Math.round(distance * 1000)}m away` : 'away'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted border border-border rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Pickup Location</p>
                      <p className="text-xs text-muted-foreground">{pickupLocation.address}</p>
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Distance unavailable (GPS coordinates not stored)
                      </p>
                    </div>
                  </div>
                </div>
              )
            ) : null}
            
            <div className="flex-1 rounded-lg overflow-hidden border">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                src={staticMapUrl}
                title="Full location map"
                className="w-full h-full"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => window.open(googleMapsUrl, '_blank')}
              >
                Open in Google Maps
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${lat}, ${lon}`);
                  toast.success('Coordinates copied');
                }}
              >
                Copy Coordinates
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

interface ChatProps {
  donationId: string;
  otherUserId: string;
  otherUserName: string;
  donationTitle: string;
}

export default function Chat({ donationId, otherUserId, otherUserName, donationTitle }: ChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [donationLocation, setDonationLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
    address: string;
  } | null>(null);

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

  // Geocode address to get coordinates
  const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'AnnadataConnect'
          }
        }
      );
      
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  // Fetch donation location
  useEffect(() => {
    const fetchDonationLocation = async () => {
      const { data, error } = await supabase
        .from('food_donations')
        .select('latitude, longitude, pickup_location')
        .eq('id', donationId)
        .maybeSingle();
        
      if (!error && data) {
        let lat = data.latitude;
        let lon = data.longitude;
        
        // If coordinates are null, try to geocode the address
        if (!lat || !lon) {
          const coords = await geocodeAddress(data.pickup_location);
          if (coords) {
            lat = coords.lat;
            lon = coords.lon;
          }
        }
        
        setDonationLocation({
          latitude: lat,
          longitude: lon,
          address: data.pickup_location
        });
      }
    };
    
    fetchDonationLocation();
  }, [donationId]);

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

  // Real-time subscription
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!user || !newMessage.trim() || sending) return;

    setSending(true);
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
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AnnadataConnect'
          }
        }
      );
      
      const data = await response.json();
      return data.display_name || null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const sendLocation = async (lat: number, lon: number) => {
    if (!user || sending) return;

    setSending(true);
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
      setSending(false);
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
    <Card className="w-full h-[500px] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="text-lg">
          Chat about: {donationTitle}
        </CardTitle>
        <p className="text-sm text-muted-foreground">with {otherUserName}</p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
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
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.sender_id === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
              {msg.message_type === 'location' && msg.latitude && msg.longitude ? (
                <LocationMessage 
                  messageId={msg.id}
                  lat={msg.latitude} 
                  lon={msg.longitude} 
                  locationName={msg.location_name}
                  isOwnMessage={msg.sender_id === user?.id}
                  pickupLocation={donationLocation}
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
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={getLocation}
              disabled={sending || isGettingLocation}
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
              onChange={(e) => setNewMessage(e.target.value)}
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
