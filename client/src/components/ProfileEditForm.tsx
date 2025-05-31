import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ProfileFormData {
  username: string;
  firstName: string;
  lastName: string;
  tagline: string;
  bio: string;
  portfolioUrlType: string;
}

interface ProfileEditFormProps {
  formData: ProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}

const ProfileEditForm = ({ 
  formData, 
  setFormData, 
  onSave, 
  onCancel,
  isPending 
}: ProfileEditFormProps) => {

  return (
    <div className="mt-6 space-y-4 border p-4 rounded-md bg-gray-50">
      <h4 className="font-medium">Edit Profile</h4>

      <div className="space-y-2 mb-4">
        <Label htmlFor="username">Username</Label>
        <Input 
          id="username" 
          type="text"
          value={formData.username} 
          onChange={(e) => setFormData({...formData, username: e.target.value})}
          spellCheck="false"
          autoComplete="off"
          dir="ltr"
        />
        <p className="text-xs text-gray-500">Your unique username for logging in and URL personalization</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input 
            id="firstName" 
            value={formData.firstName} 
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input 
            id="lastName" 
            value={formData.lastName} 
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Portfolio URL Format</Label>
        <RadioGroup 
          value={formData.portfolioUrlType} 
          onValueChange={(value) => setFormData({...formData, portfolioUrlType: value})}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="username" id="url-username" />
            <Label htmlFor="url-username" className="cursor-pointer">
              Use Username: <span className="text-blue-600 font-mono">/{(formData.username || 'your-username').toLowerCase()}</span>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fullname_dash" id="url-fullname-dash" />
            <Label htmlFor="url-fullname-dash" className="cursor-pointer">
              Use Name with Dash: <span className="text-blue-600 font-mono">/{((formData.firstName || '') + '-' + (formData.lastName || '')).toLowerCase().replace(/\s+/g, '') || 'rusty-charm'}</span>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fullname_dot" id="url-fullname-dot" />
            <Label htmlFor="url-fullname-dot" className="cursor-pointer">
              Use Name with Period: <span className="text-blue-600 font-mono">/{((formData.firstName || '') + '.' + (formData.lastName || '')).toLowerCase().replace(/\s+/g, '') || 'rusty.charm'}</span>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="replit_id" id="url-replit" />
            <Label htmlFor="url-replit" className="cursor-pointer">
              Use Replit ID: <span className="text-blue-600 font-mono">/43075889</span>
            </Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-gray-500">Choose how your portfolio URL appears to visitors</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tagline">Portfolio Tagline</Label>
        <Input 
          id="tagline" 
          value={formData.tagline} 
          onChange={(e) => setFormData({...formData, tagline: e.target.value})}
          placeholder="CAPTURING MOMENTS IN TIME"
        />
        <p className="text-xs text-gray-500">This tagline appears prominently on your portfolio homepage</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">About Me</Label>
        <textarea 
          id="bio" 
          value={formData.bio} 
          onChange={(e) => setFormData({...formData, bio: e.target.value})}
          placeholder="Tell visitors about yourself and your photography..."
          className="w-full min-h-[100px] p-2 border rounded-md"
          rows={4}
        />
        <p className="text-xs text-gray-500">This text appears in the About section of your portfolio</p>
      </div>

      <div className="flex space-x-2 pt-4">
        <Button 
          onClick={onSave}
          disabled={isPending}
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default ProfileEditForm;