import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Clock, User, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface ContactMessage {
  id: number;
  name: string | null;
  email: string | null;
  subject: string | null;
  message: string;
  createdAt: string;
}

export default function AdminMessages() {
  const { data: messages, isLoading, error } = useQuery({
    queryKey: ["/api/messages"],
  });

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

  const contactMessages = messages || [];

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
                {contactMessages.map((message: ContactMessage) => (
                  <Card key={message.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-lg">{message.subject || 'No Subject'}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span>{message.name || 'Anonymous'}</span>
                            <span className="text-gray-400">•</span>
                            <span>{message.email || 'No email provided'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{format(new Date(message.createdAt), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                      </div>
                      <Separator className="mb-3" />
                      <div className="text-gray-700 leading-relaxed">
                        {message.message}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}