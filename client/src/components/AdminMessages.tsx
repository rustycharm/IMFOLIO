import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Clock, User, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface ContactMessage {
  id: number;
  userId: string;
  content: string;
  createdAt: string;
}

interface ParsedMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
  timestamp: string;
  source: string;
}

export default function AdminMessages() {
  const { data: messages, isLoading, error } = useQuery({
    queryKey: ["/api/messages"],
  });

  const parseMessageContent = (content: string): ParsedMessage | null => {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Contact Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Loading messages...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Contact Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">Failed to load messages</div>
        </CardContent>
      </Card>
    );
  }

  const contactMessages = messages?.filter((msg: ContactMessage) => {
    const parsed = parseMessageContent(msg.content);
    return parsed?.source === 'contact_form';
  }) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Contact Messages
          </CardTitle>
          <CardDescription>
            Messages received through the portfolio contact form
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Total Messages</span>
              <Badge variant="secondary">{contactMessages.length}</Badge>
            </div>
          </div>

          {contactMessages.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
              <p className="text-gray-500">Contact form submissions will appear here</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {contactMessages.map((message: ContactMessage) => {
                  const parsed = parseMessageContent(message.content);
                  if (!parsed) return null;

                  return (
                    <Card key={message.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="text-lg font-semibold">{parsed.subject}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {parsed.name}
                              </div>
                              <div className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {parsed.email}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {format(new Date(message.createdAt), 'MMM d, yyyy h:mm a')}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">New</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <Separator />
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                              {parsed.message}
                            </p>
                          </div>
                          <div className="flex justify-end">
                            <a
                              href={`mailto:${parsed.email}?subject=Re: ${parsed.subject}&body=Hi ${parsed.name},%0D%0A%0D%0AThank you for your message...`}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Mail className="w-4 h-4" />
                              Reply
                            </a>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}