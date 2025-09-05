# Artisan Product Management System - Setup Guide

## Overview
This guide covers the enhanced product management system for artisans, including product creation, editing, deletion, image upload, and comprehensive dashboard functionality.

## Features Implemented

### ✅ Complete Product Management
- **Add New Products**: Full form with all fields from Product model
- **Edit Products**: Modify existing product details
- **Delete Products**: Remove products with confirmation
- **Toggle Status**: Activate/deactivate products
- **Image Upload**: Support for multiple product images (up to 10)
- **Stock Management**: Track inventory and low stock alerts
- **Product Analytics**: View performance metrics

### ✅ Dashboard Features
- **Product Statistics**: Total products, views, likes, average price
- **Product Listing**: Grid view with management actions
- **Quick Actions**: Easy access to common tasks
- **AI Recommendations**: Smart suggestions for improvement

### ✅ Enhanced Form Features
- **Image Preview**: See uploaded images before saving
- **Comprehensive Fields**: All Product model fields supported
- **Validation**: Client and server-side validation
- **Responsive Design**: Works on all device sizes

## Setup Instructions

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already done)
npm install

# Start the React development server
npm start
```

### 3. Testing the System

#### Option A: Manual Testing
1. **Register as an Artisan**:
   - Go to `http://localhost:3000/register`
   - Register with artisan credentials
   - Login and navigate to dashboard

2. **Test Product Management**:
   - Click "Add New Product" button
   - Fill in the comprehensive form
   - Upload product images
   - Save and verify the product appears in the list

3. **Test Product Actions**:
   - Edit existing products
   - Toggle product status (active/inactive)
   - Delete products with confirmation

#### Option B: Automated Testing
```bash
# Run the test script from project root
node test-product-dashboard.js
```

## API Endpoints Used

### Product Management
- `POST /api/artisan/products` - Create new product
- `GET /api/artisan/products` - List artisan's products
- `GET /api/artisan/products/:id` - Get single product
- `PUT /api/artisan/products/:id` - Update product
- `DELETE /api/artisan/products/:id` - Delete product
- `PATCH /api/artisan/products/:id/toggle-status` - Toggle status

### Dashboard Data
- `GET /api/artisan/products/dashboard/summary` - Dashboard statistics
- `GET /api/artisan/products/form-data/options` - Form field options

### File Upload
- Supports multipart/form-data for image uploads
- Images stored in `backend/uploads/products/`
- Maximum 10 images per product, 5MB each

## Key Components

### Frontend Components
- **ArtisanDashboard.js**: Main dashboard with product management
- **Dashboard.css**: Comprehensive styling for all features

### Backend Components
- **artisanProducts.js**: Complete CRUD API routes
- **Product.js**: Enhanced product model with all fields
- **Middleware**: JWT authentication for artisan-specific access

## Authentication Flow
1. Artisan registers/logs in
2. JWT token stored in localStorage
3. Token included in API requests via Authorization header
4. Server validates token and extracts artisan ID
5. All operations scoped to authenticated artisan

## File Upload Handling
- **Frontend**: FormData with multipart/form-data
- **Backend**: Multer middleware for file processing
- **Storage**: Local filesystem with organized naming
- **Security**: File type validation, size limits

## Error Handling
- **Client-side**: Form validation, user feedback via toast notifications
- **Server-side**: Comprehensive error responses with proper status codes
- **Network**: Graceful handling of connection issues

## Security Features
- **JWT Authentication**: Secure artisan identification
- **Input Validation**: Sanitization and validation on all inputs
- **File Upload Security**: Type and size restrictions
- **CORS Configuration**: Proper cross-origin resource sharing

## Performance Optimizations
- **Pagination**: Server-side pagination for product lists
- **Image Optimization**: Size limits and format restrictions
- **Lazy Loading**: Efficient data fetching strategies
- **Caching**: Client-side state management

## Troubleshooting

### Common Issues

1. **"Access denied" errors**:
   - Ensure you're logged in as an artisan
   - Check localStorage for 'artisan_token'
   - Verify token hasn't expired

2. **Image upload failures**:
   - Check file size (max 5MB per image)
   - Verify file type (JPG, PNG, WEBP only)
   - Ensure uploads directory exists

3. **Form validation errors**:
   - Fill all required fields (name, description, price, category)
   - Ensure positive numeric values for price and stock

4. **API connection issues**:
   - Verify backend server is running on port 5000
   - Check CORS configuration
   - Ensure MongoDB connection is active

### Testing Commands
```bash
# Test backend health
curl http://localhost:5000/api/health

# Test artisan authentication
curl -X POST http://localhost:5000/api/artisans/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Run automated tests
node test-product-dashboard.js
```

## Next Steps
- **AI Integration**: Connect with AI assistant for product enhancement
- **Analytics**: Advanced product performance tracking
- **Inventory Alerts**: Email/SMS notifications for low stock
- **Bulk Operations**: Import/export product data
- **SEO Optimization**: Meta tags and structured data

## Support
For issues or questions:
1. Check the console for error messages
2. Review the API response status codes
3. Verify all dependencies are installed
4. Ensure both frontend and backend servers are running

The system is now fully functional with comprehensive product management capabilities for artisans!
