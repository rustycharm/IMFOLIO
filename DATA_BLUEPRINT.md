# 🗂️ IMFOLIO DATA BLUEPRINT
## Comprehensive Schema Reference & Field Mapping Guide

> **Purpose**: Single source of truth for all database schemas, field formats, and frontend-backend mappings to prevent data structure mismatches.

---

## 📊 **DATABASE ARCHITECTURE OVERVIEW**

### **Core Principles**
- **Primary Keys**: Replit User IDs (strings) throughout system
- **Field Naming**: Database uses `snake_case`, Frontend uses `camelCase`
- **Default Privacy**: All user content defaults to `private` (false), requires explicit user action to make public
- **Authentication**: Replit Auth for user management, separate profiles table for customizable data

---

## 🗄️ **COMPLETE SCHEMA DEFINITIONS**

### **1. USERS TABLE** (Replit Auth - DO NOT MODIFY)
```sql
TABLE: users
PURPOSE: Replit authentication and core user data
MODIFICATION: Read-only (managed by Replit Auth)
```

| Field | Database | Frontend | Type | Required | Default | Description |
|-------|----------|----------|------|----------|---------|-------------|
| id | `id` | `id` | varchar(PK) | ✅ | - | Replit User ID (string) |
| email | `email` | `email` | varchar | ❌ | null | User email from Replit |
| firstName | `first_name` | `firstName` | varchar | ❌ | null | Name from Replit Auth |
| lastName | `last_name` | `lastName` | varchar | ❌ | null | Name from Replit Auth |
| profileImageUrl | `profile_image_url` | `profileImageUrl` | varchar | ❌ | null | Avatar from Replit |
| role | `role` | `role` | varchar | ✅ | "user" | "admin" or "user" |
| createdAt | `created_at` | `createdAt` | timestamp | ✅ | NOW() | Account creation |
| updatedAt | `updated_at` | `updatedAt` | timestamp | ✅ | NOW() | Last update |

### **2. PROFILES TABLE** (User Customizable Data)
```sql
TABLE: profiles  
PURPOSE: User-editable profile information separate from auth
PRIVACY: User controls visibility via isPublic field
```

| Field | Database | Frontend | Type | Required | Default | Description |
|-------|----------|----------|------|----------|---------|-------------|
| id | `id` | `id` | serial(PK) | ✅ | AUTO | Profile ID |
| userId | `user_id` | `userId` | varchar(FK) | ✅ | - | Links to users.id |
| username | `username` | `username` | varchar | ❌ | null | Custom username |
| firstName | `first_name` | `firstName` | varchar | ❌ | null | User's chosen first name |
| lastName | `last_name` | `lastName` | varchar | ❌ | null | User's chosen last name |
| tagline | `tagline` | `tagline` | text | ❌ | null | Short description |
| bio | `bio` | `bio` | text | ❌ | null | Longer biography |
| website | `website` | `website` | text | ❌ | null | Personal website URL |
| instagram | `instagram` | `instagram` | text | ❌ | null | Instagram handle/URL |
| facebook | `facebook` | `facebook` | text | ❌ | null | Facebook URL |
| twitter | `twitter` | `twitter` | text | ❌ | null | Twitter handle/URL |
| portfolioUrlType | `portfolio_url_type` | `portfolioUrlType` | text | ✅ | "username" | URL format preference |
| isPublic | `is_public` | `isPublic` | boolean | ✅ | true | Profile visibility |
| createdAt | `created_at` | `createdAt` | timestamp | ✅ | NOW() | Profile creation |
| updatedAt | `updated_at` | `updatedAt` | timestamp | ✅ | NOW() | Last update |

**Portfolio URL Types:**
- `"username"` → `/photographer/username`
- `"fullname_dash"` → `/photographer/first-last`  
- `"fullname_dot"` → `/photographer/first.last`
- `"replit_id"` → `/photographer/43075889`

### **3. PHOTOS TABLE** (Photo Uploads)
```sql
TABLE: photos
PURPOSE: User uploaded photography content
PRIVACY: Defaults to PRIVATE (isPublic: false) - requires user action to make public
STORAGE: Files stored in Object Storage, URLs stored in database
```

| Field | Database | Frontend | Type | Required | Default | Description |
|-------|----------|----------|------|----------|---------|-------------|
| id | `id` | `id` | serial(PK) | ✅ | AUTO | Photo ID |
| userId | `user_id` | `userId` | varchar(FK) | ✅ | - | Owner (users.id) |
| title | `title` | `title` | text | ✅ | - | Photo title |
| description | `description` | `description` | text | ❌ | null | Photo description |
| imageUrl | `image_url` | `imageUrl` | text | ✅ | - | Object storage URL |
| category | `category` | `category` | text | ❌ | null | Photo category |
| tags | `tags` | `tags` | text[] | ❌ | null | Array of tags |
| isPublic | `is_public` | `isPublic` | boolean | ✅ | **false** | Visibility (PRIVATE by default) |
| featured | `featured` | `featured` | boolean | ✅ | false | Featured on portfolio |
| sourceProvider | `source_provider` | `sourceProvider` | text | ❌ | null | Upload source |
| externalId | `external_id` | `externalId` | text | ❌ | null | External service ID |
| metadata | `metadata` | `metadata` | jsonb | ❌ | null | EXIF/file metadata |
| createdAt | `created_at` | `createdAt` | timestamp | ✅ | NOW() | Upload time |
| updatedAt | `updated_at` | `updatedAt` | timestamp | ✅ | NOW() | Last update |

### **4. HERO_IMAGES TABLE** (Banner Images)
```sql
TABLE: hero_images
PURPOSE: Site-wide hero banner images managed by admins
USAGE: Default banners + user selections
```

| Field | Database | Frontend | Type | Required | Default | Description |
|-------|----------|----------|------|----------|---------|-------------|
| id | `id` | `id` | varchar(PK) | ✅ | - | Unique identifier |
| url | `url` | `url` | text | ❌ | null | Image URL |
| name | `name` | `name` | text | ❌ | null | Display name |
| description | `description` | `description` | text | ❌ | null | Description |
| addedBy | `added_by` | `addedBy` | varchar | ❌ | null | Admin who added |
| isActive | `is_active` | `isActive` | boolean | ✅ | true | Available for use |
| isDefault | `is_default` | `isDefault` | boolean | ✅ | false | Site default banner |
| title | `title` | `title` | text | ❌ | null | Image title |
| imageUrl | `image_url` | `imageUrl` | text | ❌ | null | Alternative URL field |
| uploadedAt | `uploaded_at` | `uploadedAt` | timestamp | ❌ | null | Upload timestamp |
| createdAt | `created_at` | `createdAt` | timestamp | ✅ | NOW() | Creation time |
| updatedAt | `updated_at` | `updatedAt` | timestamp | ❌ | null | Last update |
| userId | `user_id` | `userId` | varchar | ❌ | null | Associated user |
| imageType | `image_type` | `imageType` | text | ❌ | null | Image classification |
| dominantColor | `dominant_color` | `dominantColor` | varchar | ❌ | null | Primary color (hex) |
| colorPalette | `color_palette` | `colorPalette` | jsonb | ❌ | null | Color analysis data |
| colorAnalysisComplete | `color_analysis_complete` | `colorAnalysisComplete` | boolean | ✅ | false | Analysis status |
| colorExtractedAt | `color_extracted_at` | `colorExtractedAt` | timestamp | ❌ | null | Analysis timestamp |

### **5. USER_HERO_SELECTIONS TABLE** (User Banner Choices)
```sql
TABLE: user_hero_selections
PURPOSE: Track which hero banner each user has selected
RELATIONSHIP: Links users to their chosen hero images
```

| Field | Database | Frontend | Type | Required | Default | Description |
|-------|----------|----------|------|----------|---------|-------------|
| id | `id` | `id` | serial(PK) | ✅ | AUTO | Selection ID |
| userId | `user_id` | `userId` | varchar(FK) | ✅ | - | User (users.id) |
| heroImageId | `hero_image_id` | `heroImageId` | varchar(FK) | ❌ | null | Chosen hero (hero_images.id) |
| customImageUrl | `custom_image_url` | `customImageUrl` | text | ❌ | null | Custom banner URL |
| customImageTitle | `custom_image_title` | `customImageTitle` | text | ❌ | null | Custom banner title |
| isActive | `is_active` | `isActive` | boolean | ✅ | true | Current selection |
| createdAt | `created_at` | `createdAt` | timestamp | ✅ | NOW() | Selection time |
| updatedAt | `updated_at` | `updatedAt` | timestamp | ✅ | NOW() | Last update |

### **6. SESSIONS TABLE** (Replit Auth - DO NOT MODIFY)
```sql
TABLE: sessions
PURPOSE: Session management for Replit authentication
MODIFICATION: Read-only (managed by Replit Auth)
```

| Field | Database | Frontend | Type | Required | Default | Description |
|-------|----------|----------|------|----------|---------|-------------|
| sid | `sid` | `sid` | varchar(PK) | ✅ | - | Session ID |
| sess | `sess` | `sess` | jsonb | ✅ | - | Session data |
| expire | `expire` | `expire` | timestamp | ✅ | - | Expiration time |

### **7. MESSAGES TABLE** (Contact Forms)
```sql
TABLE: messages
PURPOSE: Store contact form submissions
```

| Field | Database | Frontend | Type | Required | Default | Description |
|-------|----------|----------|------|----------|---------|-------------|
| id | `id` | `id` | serial(PK) | ✅ | AUTO | Message ID |
| userId | `user_id` | `userId` | varchar(FK) | ✅ | - | Sender (users.id) |
| content | `content` | `content` | text | ✅ | - | Message content |
| createdAt | `created_at` | `createdAt` | timestamp | ✅ | NOW() | Send time |

---

## 🔄 **FIELD MAPPING RULES**

### **Database ↔ Frontend Conversion**
```typescript
// Database snake_case → Frontend camelCase
database: "first_name" → frontend: "firstName"
database: "is_public" → frontend: "isPublic"  
database: "portfolio_url_type" → frontend: "portfolioUrlType"
database: "created_at" → frontend: "createdAt"
```

### **API Response Structure**
```typescript
// Server Response Format
interface UserWithProfile {
  // Auth table fields (camelCase in response)
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  
  // Profile table fields (nested or flattened)
  profile?: {
    username: string | null;
    firstName: string | null;  // User's custom name
    lastName: string | null;   // User's custom name
    portfolioUrlType: string;
    isPublic: boolean;
    // ... other profile fields
  }
}
```

---

## 🛠️ **CRITICAL REQUIREMENTS TO IMPLEMENT**

### **Phase 1: Database Schema Fixes**

1. **Fix Photos Default Privacy**
   ```sql
   ALTER TABLE photos ALTER COLUMN is_public SET DEFAULT false;
   ```

2. **Create Storage Tracking Table**
   ```sql
   CREATE TABLE storage_usage (
     id SERIAL PRIMARY KEY,
     user_id VARCHAR REFERENCES users(id) NOT NULL,
     file_key TEXT NOT NULL,
     original_filename TEXT,
     compressed_size BIGINT NOT NULL,
     image_type VARCHAR NOT NULL, -- 'photo', 'hero', 'profile'
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **Add Photo Categories Enhancement**
   ```sql
   -- Ensure photos.category has proper constraints
   ALTER TABLE photos ADD CONSTRAINT valid_category 
   CHECK (category IN ('nature', 'portrait', 'architecture', 'travel', 'street', 'wildlife', 'macro', 'landscape', 'urban', 'abstract'));
   ```

### **Phase 2: API Endpoint Requirements**

1. **Missing Photo Upload Route**
   ```typescript
   POST /api/photos/upload
   // Handles: File upload, compression, storage tracking, privacy defaults
   ```

2. **User Photos Management**
   ```typescript
   GET /api/user/photos         // User's own photos (all)
   GET /api/user/:id/photos     // Public photos only (portfolio view)
   PATCH /api/photos/:id        // Update photo (title, description, isPublic)
   DELETE /api/photos/:id       // Delete photo
   ```

3. **Storage Metrics**
   ```typescript
   GET /api/admin/storage-stats // Total usage, per-user breakdowns
   GET /api/user/storage-usage  // Individual user's storage consumption
   ```

### **Phase 3: Frontend Component Requirements**

1. **Fix PhotoUploader**
   - Connect to real `/api/photos/upload` endpoint
   - Handle proper error responses
   - Default photos to private (isPublic: false)

2. **Build Portfolio Display**
   - Filter for public photos only
   - Respect user's portfolio URL format preference
   - Mobile-first responsive design

3. **Photo Management Interface**
   - Toggle public/private status
   - Edit photo details
   - Category management

---

## 🚨 **COMMON PITFALLS TO AVOID**

### **Data Access Patterns**
```typescript
// ❌ WRONG: Mixing auth and profile data
const userName = user.firstName || profile.firstName;

// ✅ CORRECT: Use profile data for display
const userName = profile.firstName || user.firstName || 'Unknown';

// ❌ WRONG: Assuming field exists at top level  
const urlType = user.portfolioUrlType; // undefined

// ✅ CORRECT: Access nested profile data
const urlType = user.profile?.portfolioUrlType || user.portfolioUrlType;
```

### **Privacy Defaults**
```typescript
// ❌ WRONG: Photos default to public
isPublic: true // Violates privacy-first principle

// ✅ CORRECT: Photos default to private
isPublic: false // Requires explicit user action to share
```

### **Field Name Consistency**
```typescript
// ❌ WRONG: Inconsistent naming
hero_image_id vs heroImageId // Mixed conventions

// ✅ CORRECT: Consistent conversion
database: "hero_image_id" → frontend: "heroImageId"
```

---

## 📋 **VALIDATION SCHEMAS**

### **Photo Upload Validation**
```typescript
const photoUploadSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.enum(['nature', 'portrait', 'architecture', 'travel', 'street', 'wildlife', 'macro', 'landscape', 'urban', 'abstract']).optional(),
  tags: z.array(z.string()).max(10).optional(),
  isPublic: z.boolean().default(false), // PRIVATE by default
});
```

### **Profile Update Validation**
```typescript
const profileUpdateSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  portfolioUrlType: z.enum(['username', 'fullname_dash', 'fullname_dot', 'replit_id']),
  bio: z.string().max(2000).optional(),
  tagline: z.string().max(200).optional(),
  // Social media fields...
});
```

---

## 🎯 **NEXT STEPS FOR IMPLEMENTATION**

1. **Phase 1**: Fix database schema defaults and add storage tracking
2. **Phase 2**: Build missing API endpoints for photo management  
3. **Phase 3**: Update frontend components to match schema properly
4. **Phase 4**: Implement portfolio display with proper privacy controls

This blueprint ensures all future development maintains data consistency and prevents the field mapping issues we've encountered.