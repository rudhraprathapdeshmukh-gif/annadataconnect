import { useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from './ui/drawer';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function HelpChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! 👋 I\'m here to help you with Annadataconnect. Ask me anything about donating food, requesting donations, or using the platform!',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('help-chatbot', {
        body: { message: inputMessage }
      });

      if (error) throw error;

      if (data?.reply) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      toast.error('Failed to get response. Please try again.');
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or contact support if the issue persists.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const ChatMessages = () => (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  const ChatInput = () => (
    <div className="border-t p-4">
      <div className="flex gap-2">
        <Input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question..."
          disabled={isLoading}
          className="flex-1 h-11"
        />
        <Button
          onClick={sendMessage}
          disabled={!inputMessage.trim() || isLoading}
          size="icon"
          className="h-11 w-11 shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg z-[999] hover:scale-110 transition-transform"
          size="icon"
        >
          <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
        </Button>
      )}

      {isOpen && isMobile ? (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent className="h-[90vh] flex flex-col">
            <DrawerHeader className="flex flex-row items-center justify-between border-b pb-4">
              <DrawerTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Help Assistant
              </DrawerTitle>
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                >
                  <X className="h-5 w-5" />
                </Button>
              </DrawerClose>
            </DrawerHeader>
            <div className="flex-1 flex flex-col min-h-0">
              <ChatMessages />
              <ChatInput />
            </div>
          </DrawerContent>
        </Drawer>
      ) : isOpen ? (
        <Card className="fixed bottom-4 right-4 left-4 md:left-auto md:bottom-6 md:right-6 w-full md:w-96 h-[calc(100vh-8rem)] md:h-[500px] shadow-2xl z-[999] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Help Assistant
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-9 w-9 md:h-8 md:w-8"
            >
              <X className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <ChatMessages />
            <ChatInput />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
