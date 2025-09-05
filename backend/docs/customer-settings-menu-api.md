# Enhanced Customer Settings Menu API

## Overview
This endpoint provides a comprehensive settings menu structure for logged-in customers, replacing the basic logout button with an enhanced account interface.

## Endpoint Details

**URL:** `GET /api/customer/settings-menu`  
**Authentication:** Bearer token (customer only)  
**Content-Type:** `application/json`

## Request Headers
```
Authorization: Bearer <customer_jwt_token>
```

## Response Structure

The endpoint returns a structured menu object with the following sections:

### User Information
- User's name, email, profile image
- Account creation date

### Main Menu Sections
1. **Profile Settings** - Update personal information
2. **Orders** - View order history and track deliveries  
3. **Wishlist** - Manage saved products (shows count badge)
4. **Coupons** - View and use discount coupons (shows active count)
5. **Help Centre** - Support and FAQ access
6. **Recently Viewed** - Recently browsed products (shows count)
7. **Language** - Change preferred language (shows current language)

### Account Settings Section
Sub-menu with detailed account management options:
- Edit Profile
- Saved Addresses (shows address count)
- Language Settings  
- Notification Preferences
- Privacy Settings
- Security Settings (2FA, newsletter)

### My Activity Section
- Posted Reviews (shows review count badge)

### Logout Section
- Sign out functionality

### Quick Actions
Shortcuts to frequently used actions:
- Edit Profile
- View Orders  
- Manage Addresses

## Sample Response

```json
{
  "success": true,
  "settingsMenu": {
    "userInfo": {
      "name": "John Doe",
      "email": "john@example.com", 
      "profileImage": "/uploads/profile/john.jpg",
      "memberSince": "2024-01-15T10:30:00Z"
    },
    "menuSections": [
      {
        "id": "profile_settings",
        "title": "Profile Settings",
        "description": "Update your personal information",
        "icon": "👤",
        "endpoint": "/api/customer/profile",
        "badge": null,
        "priority": 1
      },
      {
        "id": "orders", 
        "title": "Orders",
        "description": "View your order history and track deliveries",
        "icon": "📦",
        "endpoint": "/api/customer/orders",
        "badge": null,
        "priority": 2
      },
      {
        "id": "wishlist",
        "title": "Wishlist", 
        "description": "Manage your saved products",
        "icon": "❤️",
        "endpoint": "/api/customer/wishlist",
        "badge": "5",
        "priority": 3
      },
      {
        "id": "coupons",
        "title": "Coupons",
        "description": "View and use your discount coupons", 
        "icon": "🎫",
        "endpoint": "/api/coupons/my-coupons",
        "badge": "2",
        "priority": 4
      },
      {
        "id": "help_centre",
        "title": "Help Centre",
        "description": "Get support and find answers to your questions",
        "icon": "❓", 
        "endpoint": "/api/help-center/faq",
        "badge": null,
        "priority": 5
      },
      {
        "id": "recently_viewed",
        "title": "Recently Viewed",
        "description": "Products you recently looked at",
        "icon": "👁️",
        "endpoint": "/api/customer/recently-viewed", 
        "badge": "8",
        "priority": 6
      },
      {
        "id": "language",
        "title": "Language",
        "description": "Change your preferred language",
        "icon": "🌐",
        "endpoint": "/api/customer/language",
        "badge": "EN", 
        "priority": 7,
        "currentValue": "en",
        "options": [
          { "code": "en", "name": "English", "nativeName": "English" },
          { "code": "hi", "name": "Hindi", "nativeName": "हिन्दी" }
        ]
      }
    ],
    "accountSettingsSection": {
      "id": "account_settings",
      "title": "Account Settings", 
      "description": "Manage your account preferences and security",
      "icon": "⚙️",
      "priority": 8,
      "subsections": [
        {
          "id": "edit_profile",
          "title": "Edit Profile",
          "description": "Update personal information and profile picture",
          "endpoint": "/api/customer/profile",
          "icon": "✏️"
        },
        {
          "id": "saved_addresses",
          "title": "Saved Addresses", 
          "description": "Manage your delivery addresses",
          "endpoint": "/api/customer/addresses",
          "icon": "📍",
          "badge": "3"
        }
      ]
    },
    "myActivitySection": {
      "id": "my_activity",
      "title": "My Activity",
      "description": "View your reviews and interactions", 
      "icon": "📝",
      "priority": 9,
      "subsections": [
        {
          "id": "posted_reviews",
          "title": "Posted Reviews",
          "description": "Reviews you have written for products",
          "endpoint": "/api/customer/my-reviews",
          "icon": "⭐", 
          "badge": "12"
        }
      ]
    },
    "logoutSection": {
      "id": "logout",
      "title": "Logout",
      "description": "Sign out of your account",
      "icon": "🚪",
      "priority": 10,
      "action": "logout" 
    },
    "quickActions": [
      {
        "id": "edit_profile_quick",
        "title": "Edit Profile", 
        "endpoint": "/api/customer/profile",
        "icon": "✏️"
      },
      {
        "id": "view_orders_quick",
        "title": "View Orders",
        "endpoint": "/api/customer/orders",
        "icon": "📦"
      },
      {
        "id": "manage_addresses_quick",
        "title": "Manage Addresses",
        "endpoint": "/api/customer/addresses", 
        "icon": "📍"
      }
    ]
  },
  "metadata": {
    "lastUpdated": "2024-09-04T10:30:00Z",
    "menuVersion": "1.0",
    "userType": "customer",
    "totalMenuItems": 15
  }
}
```

## Features

### Dynamic Badges
- **Wishlist**: Shows item count if items exist
- **Coupons**: Shows active (unused, non-expired) coupon count  
- **Recently Viewed**: Shows recently viewed product count
- **Language**: Shows current language code (e.g., "EN", "HI")
- **Posted Reviews**: Shows total review count
- **Saved Addresses**: Shows saved address count

### Language Support
The language section includes full language options with:
- Language code (e.g., 'en', 'hi')
- English name (e.g., 'English', 'Hindi') 
- Native name (e.g., 'English', 'हिन्दी')

### Menu Ordering
Items are ordered according to the rules:
1. Profile Settings
2. Orders
3. Wishlist
4. Coupons  
5. Help Centre
6. Recently Viewed
7. Language
8. Account Settings (subsection)
9. My Activity (subsection)
10. Logout

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### 404 User Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Error fetching settings menu",
  "error": "Detailed error message"
}
```

## Usage Notes

- The endpoint requires a valid customer JWT token
- Badges are dynamically calculated based on actual user data
- The menu structure follows the exact specification from the user rules
- All referenced endpoints are existing and functional within the system
- Icons use emoji characters for better visual representation
- The response includes metadata for versioning and debugging

## Frontend Integration

This endpoint is designed to replace the simple logout button with a comprehensive account menu. Frontend implementations should:

1. Call this endpoint when user clicks the account area
2. Render the menu sections in the specified order
3. Show badges when present 
4. Handle the logout action separately from other menu items
5. Use the quick actions for common shortcuts
