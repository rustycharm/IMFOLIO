import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAppleAlbums, fetchApplePhotos } from '@/lib/applePhotosService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Image as ImageIcon, FolderOpen } from 'lucide-react';

type Album = {
  id: string;
  title: string;
  photoCount: number;
  coverPhotoId: string | null;
  createdAt: string | null;
};

type AlbumSelectorProps = {
  onAlbumsSelected: (albums: string[]) => void;
};

export default function AlbumSelector({ onAlbumsSelected }: AlbumSelectorProps) {
  const [selectedAlbums, setSelectedAlbums] = useState<string[]>([]);

  // Fetch albums from Apple Photos
  const { data: albums, isLoading, error } = useQuery({
    queryKey: ['/api/apple/albums'],
    queryFn: async () => {
      const result = await fetchAppleAlbums();
      return result as Album[];
    }
  });

  // Handle album selection
  const toggleAlbum = (albumId: string) => {
    setSelectedAlbums(prevSelected => {
      if (prevSelected.includes(albumId)) {
        return prevSelected.filter(id => id !== albumId);
      } else {
        return [...prevSelected, albumId];
      }
    });
  };

  // Update parent component when selection changes
  useEffect(() => {
    onAlbumsSelected(selectedAlbums);
  }, [selectedAlbums, onAlbumsSelected]);

  // Handle "Select All" functionality
  const selectAll = () => {
    if (albums) {
      setSelectedAlbums(albums.map(album => album.id));
    }
  };

  // Handle "Clear Selection" functionality
  const clearSelection = () => {
    setSelectedAlbums([]);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-center text-muted-foreground">Loading your Apple Photos albums...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center max-w-md">
          <p className="text-red-500 font-medium">Error loading albums</p>
          <p className="text-muted-foreground mt-2">
            We couldn't load your Apple Photos albums. Please ensure you've granted permission to access your photos.
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">Try Again</Button>
        </div>
      </div>
    );
  }

  if (!albums || albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FolderOpen className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-center text-muted-foreground">No albums found in your Apple Photos library.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">Your Albums</h3>
          <p className="text-sm text-muted-foreground">
            Select which albums to sync with IMFOLIO
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={clearSelection}>
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {albums.map(album => (
          <Card 
            key={album.id} 
            className={`cursor-pointer transition-all ${
              selectedAlbums.includes(album.id) ? 'border-primary ring-1 ring-primary' : ''
            }`}
            onClick={() => toggleAlbum(album.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="bg-muted flex items-center justify-center h-12 w-12 rounded">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id={`album-${album.id}`}
                      checked={selectedAlbums.includes(album.id)}
                      onCheckedChange={() => toggleAlbum(album.id)}
                      className="h-4 w-4"
                    />
                    <Label 
                      htmlFor={`album-${album.id}`} 
                      className="font-medium truncate cursor-pointer flex-1"
                    >
                      {album.title}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {album.photoCount} photos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedAlbums.length > 0 && (
        <div className="pt-4">
          <Separator className="my-4" />
          <p className="text-sm font-medium">
            {selectedAlbums.length} album{selectedAlbums.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  );
}