import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, RefreshCw, AlertCircle, Globe, Check, X } from 'lucide-react';
import axios from 'axios';

type LogEntry = {
  timestamp: string;
  ip?: string;
  method?: string;
  path?: string;
  status?: number;
  responseTime?: number;
  userAgent?: string;
  referer?: string;
  raw?: string;
  message?: string;
  stack?: string;
  parseError?: boolean;
};

type Domain = {
  domain: string;
  types: string[];
};

type DomainsResponse = {
  domains: Domain[];
};

type LogsResponse = {
  logs: LogEntry[];
};

export function DomainMonitor() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [logType, setLogType] = useState<'access' | 'error'>('access');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Load domains on initial render
  useEffect(() => {
    fetchDomains();
  }, []);

  // Load logs when domain, type or refresh is triggered
  useEffect(() => {
    if (selectedDomain) {
      fetchLogs(selectedDomain, logType);
    }
  }, [selectedDomain, logType, refreshTrigger]);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const response = await axios.get<DomainsResponse>('/api/monitoring/domains');
      setDomains(response.data.domains);

      // Select first domain by default if available
      if (response.data.domains.length > 0 && !selectedDomain) {
        setSelectedDomain(response.data.domains[0].domain);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching domains:', err);
      setError('Failed to load domains. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (domain: string, type: 'access' | 'error') => {
    if (!domain) return;

    try {
      setLoading(true);
      const response = await axios.get<LogsResponse>(`/api/monitoring/domains/${domain}/${type}`, {
        params: { limit: 100 }
      });
      setLogs(response.data.logs);
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${type} logs for ${domain}:`, err);
      setError(`Failed to load ${type} logs for ${domain}.`);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const renderStatusBadge = (status?: number) => {
    if (!status) return null;

    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';

    if (status >= 200 && status < 300) {
      variant = 'default'; // Success: Green
    } else if (status >= 300 && status < 400) {
      variant = 'secondary'; // Redirect: Blue
    } else if (status >= 400) {
      variant = 'destructive'; // Error: Red
    }

    return <Badge variant={variant}>{status}</Badge>;
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Domain Monitoring
        </CardTitle>
        <CardDescription>
          Monitor access and error logs for custom domains
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select
                value={selectedDomain}
                onValueChange={setSelectedDomain}
                disabled={loading || domains.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((domain) => (
                    <SelectItem key={domain.domain} value={domain.domain}>
                      {domain.domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs value={logType} onValueChange={(value) => setLogType(value as 'access' | 'error')}>
              <TabsList className="grid w-full sm:w-[200px] grid-cols-2">
                <TabsTrigger value="access">Access</TabsTrigger>
                <TabsTrigger value="error">Errors</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleRefresh}
              disabled={loading || !selectedDomain}
              title="Refresh logs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {selectedDomain ? (
            <ScrollArea className="h-[400px] w-full rounded-md border">
              {logs.length > 0 ? (
                <div className="p-4 space-y-4">
                  {logs.map((log, index) => (
                    <div key={index} className="border rounded-md p-3 text-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        {renderStatusBadge(log.status)}
                      </div>

                      {logType === 'access' ? (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{log.method}</Badge>
                            <span className="font-mono text-sm truncate">{log.path}</span>
                          </div>

                          {log.responseTime && (
                            <div className="text-xs text-muted-foreground">
                              Response time: {log.responseTime}ms
                            </div>
                          )}

                          {log.referer && (
                            <div className="text-xs text-muted-foreground truncate">
                              Referer: {log.referer}
                            </div>
                          )}

                          {log.ip && (
                            <div className="text-xs text-muted-foreground">
                              IP: {log.ip}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-sm mb-2 font-medium">
                            {log.message || "Error"}
                          </div>

                          {log.stack && (
                            <div className="text-xs font-mono whitespace-pre-wrap overflow-x-auto text-muted-foreground mt-2">
                              {log.stack}
                            </div>
                          )}
                        </>
                      )}

                      {log.parseError && (
                        <div className="text-xs text-amber-600 mt-1">
                          Raw log entry: {log.raw}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  {loading ? 'Loading logs...' : 'No logs found for this domain.'}
                </div>
              )}
            </ScrollArea>
          ) : (
            <div className="p-8 text-center border rounded-md text-muted-foreground">
              Select a domain to view logs
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {selectedDomain && logs.length > 0 ? `Showing ${logs.length} ${logType} log entries` : ''}
        </div>

        {selectedDomain && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://${selectedDomain}`, '_blank')}
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Visit
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default DomainMonitor;