import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Mail, Clock, User, MessageSquare, Eye, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface LocalEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  timestamp: string;
  status: 'pending' | 'delivered' | 'failed';
}

export default function LocalEmailViewer() {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  
  const { data: emails, isLoading, error } = useQuery({
    queryKey: ["/api/admin/emails"],
    refetchInterval: 5000, // Refresh every 5 seconds for new emails
  });

  const { data: selectedEmailData } = useQuery({
    queryKey: ["/api/admin/emails", selectedEmail],
    enabled: !!selectedEmail,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Local Email Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Loading emails...</div>
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
            Local Email Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">Failed to load emails</div>
        </CardContent>
      </Card>
    );
  }

  const emailList = emails || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Local Email Service
          </CardTitle>
          <CardDescription>
            Built-in email system for contact form notifications - no external services needed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Total Emails</span>
              <Badge variant="secondary">{emailList.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                Self-Hosted
              </Badge>
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                Free Forever
              </Badge>
            </div>
          </div>

          {emailList.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No emails yet</h3>
              <p className="text-gray-500">Contact form submissions will appear here instantly</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Email List */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Inbox ({emailList.length})</h3>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {emailList.map((email: LocalEmail) => (
                      <Card 
                        key={email.id} 
                        className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                          selectedEmail === email.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedEmail(email.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold truncate">{email.subject}</h4>
                              <p className="text-xs text-gray-600 truncate">{email.from}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <Badge 
                                variant={email.status === 'delivered' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {email.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {format(new Date(email.timestamp), 'MMM d, h:mm a')}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Email Viewer */}
              <div>
                {selectedEmail && selectedEmailData ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Email Details</h3>
                      <Button
                        size="sm"
                        onClick={() => {
                          const email = selectedEmailData;
                          const fromMatch = email.from.match(/<(.+)>/);
                          const fromEmail = fromMatch ? fromMatch[1] : email.from;
                          const mailto = `mailto:${fromEmail}?subject=Re: ${email.subject.replace('Contact Form: ', '')}`;
                          window.open(mailto, '_blank');
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Reply
                      </Button>
                    </div>
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="space-y-2">
                          <h4 className="text-lg font-semibold">{selectedEmailData.subject}</h4>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>From: {selectedEmailData.from}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>To: {selectedEmailData.to}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{format(new Date(selectedEmailData.timestamp), 'PPP p')}</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <Separator />
                      
                      <CardContent className="pt-4">
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: selectedEmailData.html }}
                        />
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[500px] text-gray-500">
                    <div className="text-center">
                      <Eye className="w-8 h-8 mx-auto mb-2" />
                      <p>Select an email to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}