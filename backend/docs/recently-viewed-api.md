# Enhanced Recently Viewed API

## Overview
The recently viewed functionality has been enhanced to provide rich product information, pagination support, and comprehensive management features for the customer account section.

## Endpoints

### 1. Get Recently Viewed Products
**GET** `/api/customer/recently-viewed`

Retrieves paginated list of recently viewed products with detailed information.

#### Query Parameters
- `limit` (optional): Number of items per page (default: 10, max: 50)
- `page` (optional): Page number (default: 1)

#### Request Headers
```
Authorization: Bearer <customer_jwt_token>
```

#### Response
```json
{
  "success": true,
  "recentlyViewed": [
    {
      "id": "product_id",
      "name": "Handcrafted Ceramic Vase",
      "price": 1250,
      "originalPrice": 1500,
      "discount": 17,
      "images": ["image1.jpg", "image2.jpg"],
      "mainImage": "image1.jpg",
      "category": "Home Decor",
      "subcategory": "Vases",
      "quantityAvailable": 5,
      "isActive": true,
      "rating": 4.5,
      "reviewCount": 23,
      "tags": ["handmade", "ceramic", "decorative"],
      "description": "Beautiful handcrafted ceramic vase made with traditional techniques...",
      "artisan": {
        "id": "artisan_id",
        "name": "Ramesh Kumar",
        "businessName": "Kumar Ceramics",
        "location": "Jaipur, Rajasthan",
        "profileImage": "profile.jpg"
      },
      "viewedAt": "2024-01-15T10:30:00Z",
      "isInStock": true,
      "hasDiscount": true,
      "formattedPrice": "₹1,250",
      "formattedOriginalPrice": "₹1,500",
      "viewedAgo": "2 hours ago"
    }
  ],
  "pagination": {
    "current": 1,
    "total": 3,
    "totalCount": 25,
    "hasMore": true
  },
  "summary": {
    "totalItems": 25,
    "itemsInPage": 10,
    "lastViewedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Features
- **Detailed Product Information**: Complete product details including images, pricing, ratings
- **Artisan Details**: Business information and profile
- **Smart Formatting**: Currency symbols, time-ago formatting
- **Stock Status**: Real-time availability information
- **Pagination**: Efficient handling of large lists
- **Null Filtering**: Automatically excludes deleted products

### 2. Add Product to Recently Viewed
**POST** `/api/customer/recently-viewed`

Adds a product to the user's recently viewed list.

#### Request Body
```json
{
  "productId": "product_id_here"
}
```

#### Response
```json
{
  "success": true,
  "message": "Product added to recently viewed",
  "totalRecentlyViewed": 15
}
```

#### Behavior
- Moves existing product to top if already in list
- Validates product exists before adding
- Maintains maximum of 50 items per user
- Updates timestamp to current date/time

### 3. Remove Specific Product
**DELETE** `/api/customer/recently-viewed/:productId`

Removes a specific product from recently viewed list.

#### URL Parameters
- `productId`: The ID of the product to remove

#### Response
```json
{
  "success": true,
  "message": "Product removed from recently viewed",
  "totalRecentlyViewed": 14
}
```

### 4. Clear All Recently Viewed
**DELETE** `/api/customer/recently-viewed`

Clears all items from the recently viewed list.

#### Response
```json
{
  "success": true,
  "message": "Recently viewed cleared successfully",
  "clearedCount": 14,
  "totalRecentlyViewed": 0
}
```

## Data Fields Explained

### Product Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique product identifier |
| `name` | String | Product name |
| `price` | Number | Current selling price |
| `originalPrice` | Number | Original price (if discounted) |
| `discount` | Number | Discount percentage |
| `images` | Array | Array of image URLs |
| `mainImage` | String | Primary image URL |
| `category` | String | Product category |
| `subcategory` | String | Product subcategory |
| `quantityAvailable` | Number | Current stock level |
| `isActive` | Boolean | Product availability status |
| `rating` | Number | Average rating (0-5) |
| `reviewCount` | Number | Total number of reviews |
| `tags` | Array | Product tags |
| `description` | String | Truncated description (150 chars) |

### Artisan Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Artisan identifier |
| `name` | String | Artisan's name |
| `businessName` | String | Business/shop name |
| `location` | String | Location information |
| `profileImage` | String | Artisan profile image URL |

### Computed Fields
| Field | Type | Description |
|-------|------|-------------|
| `viewedAt` | Date | When product was last viewed |
| `isInStock` | Boolean | Stock availability (quantity > 0) |
| `hasDiscount` | Boolean | Whether product has discount |
| `formattedPrice` | String | Price with currency symbol |
| `formattedOriginalPrice` | String | Original price with currency (if discounted) |
| `viewedAgo` | String | Human-readable time ago |

## Time Formatting

The `viewedAgo` field uses intelligent time formatting:
- Less than 1 minute: "Just now"
- Less than 1 hour: "X min ago"
- Less than 1 day: "X hr ago"
- Less than 1 week: "X day(s) ago"
- More than 1 week: Formatted date

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### 404 Product Not Found (POST)
```json
{
  "success": false,
  "message": "Product not found"
}
```

### 404 Item Not Found (DELETE specific)
```json
{
  "success": false,
  "message": "Product not found in recently viewed"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Error fetching recently viewed",
  "error": "Detailed error message"
}
```

## Usage Examples

### Get Recent Items (Default)
```bash
curl -X GET "http://localhost:5000/api/customer/recently-viewed" \
  -H "Authorization: Bearer your_jwt_token"
```

### Get with Pagination
```bash
curl -X GET "http://localhost:5000/api/customer/recently-viewed?page=2&limit=5" \
  -H "Authorization: Bearer your_jwt_token"
```

### Add Product
```bash
curl -X POST "http://localhost:5000/api/customer/recently-viewed" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"productId": "product_id_here"}'
```

### Remove Product
```bash
curl -X DELETE "http://localhost:5000/api/customer/recently-viewed/product_id_here" \
  -H "Authorization: Bearer your_jwt_token"
```

### Clear All
```bash
curl -X DELETE "http://localhost:5000/api/customer/recently-viewed" \
  -H "Authorization: Bearer your_jwt_token"
```

## Frontend Integration

### React Example
```jsx
// Fetch recently viewed items
const fetchRecentlyViewed = async (page = 1, limit = 10) => {
  try {
    const response = await fetch(`/api/customer/recently-viewed?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching recently viewed:', error);
  }
};

// Add to recently viewed (call when product is viewed)
const addToRecentlyViewed = async (productId) => {
  try {
    await fetch('/api/customer/recently-viewed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId })
    });
  } catch (error) {
    console.error('Error adding to recently viewed:', error);
  }
};

// Remove from recently viewed
const removeFromRecentlyViewed = async (productId) => {
  try {
    await fetch(`/api/customer/recently-viewed/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
  } catch (error) {
    console.error('Error removing from recently viewed:', error);
  }
};

// Clear all recently viewed
const clearRecentlyViewed = async () => {
  try {
    await fetch('/api/customer/recently-viewed', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
  } catch (error) {
    console.error('Error clearing recently viewed:', error);
  }
};
```

## Performance Considerations

- **Pagination**: Use appropriate limit values to prevent large data transfers
- **Caching**: Consider client-side caching for frequently accessed pages
- **Cleanup**: The system automatically maintains maximum 50 items per user
- **Filtering**: Deleted products are automatically excluded from results

## Security

- All endpoints require customer authentication
- Product validation prevents adding non-existent items
- User isolation ensures customers only access their own data
- Input validation prevents malicious data insertion

## Database Impact

- **Read Operations**: Optimized with population and filtering
- **Write Operations**: Efficient array manipulation with limits
- **Indexing**: Ensure proper indexing on user ID and product references
- **Cleanup**: Consider periodic cleanup of orphaned references
