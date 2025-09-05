const express = require('express');
const router = express.Router();

// GET /api/help-center/faq - Get FAQ content
router.get('/faq', async (req, res) => {
  try {
    const faqCategories = [
      {
        id: 'orders',
        title: 'Orders & Payment',
        icon: '📦',
        questions: [
          {
            id: 'how-to-place-order',
            question: 'How do I place an order?',
            answer: 'Browse products, add them to cart, and proceed to checkout. Fill in shipping details and confirm your order. Payment will be processed and you\'ll receive a confirmation.'
          },
          {
            id: 'payment-methods',
            question: 'What payment methods do you accept?',
            answer: 'We currently accept Cash on Delivery (COD). Credit/Debit cards and UPI payments will be available soon.'
          },
          {
            id: 'order-cancellation',
            question: 'Can I cancel my order?',
            answer: 'Yes, you can cancel your order before it\'s shipped. Go to Account > Orders and click Cancel. Cancelled orders will restore the product stock automatically.'
          },
          {
            id: 'order-tracking',
            question: 'How can I track my order?',
            answer: 'You can track your order status in your Account section under Orders. You\'ll also receive notifications when your order status changes.'
          }
        ]
      },
      {
        id: 'products',
        title: 'Products & Stock',
        icon: '🎨',
        questions: [
          {
            id: 'product-authenticity',
            question: 'Are all products authentic handmade items?',
            answer: 'Yes, all products are created by verified artisans. Each product page shows the artisan\'s details and craft information.'
          },
          {
            id: 'stock-updates',
            question: 'How often is stock updated?',
            answer: 'Stock is updated in real-time. When you see "X left in stock", this reflects the current available quantity. Stock is deducted immediately when orders are placed.'
          },
          {
            id: 'product-customization',
            question: 'Can products be customized?',
            answer: 'Some products offer customization options. Look for the "Customizable" badge on product pages and contact the artisan directly for custom requests.'
          },
          {
            id: 'bulk-orders',
            question: 'Do you accept bulk orders?',
            answer: 'Yes, for bulk orders (10+ pieces), please contact the artisan directly through their profile page to discuss quantities and pricing.'
          }
        ]
      },
      {
        id: 'account',
        title: 'Account & Profile',
        icon: '👤',
        questions: [
          {
            id: 'create-account',
            question: 'How do I create an account?',
            answer: 'Click on "Sign Up" in the header, fill in your details, and verify your email. You can then access your account, wishlist, and order history.'
          },
          {
            id: 'update-profile',
            question: 'How do I update my profile information?',
            answer: 'Go to Account > Profile Settings to update your name, phone, address, and preferences. Changes are saved automatically.'
          },
          {
            id: 'wishlist-usage',
            question: 'How does the wishlist work?',
            answer: 'Click the heart icon on any product to add it to your wishlist. Access your saved items in Account > Wishlist and move them to cart when ready to purchase.'
          },
          {
            id: 'address-management',
            question: 'Can I save multiple addresses?',
            answer: 'Yes, you can save multiple delivery addresses in Account > Addresses. Set one as default for faster checkout.'
          }
        ]
      },
      {
        id: 'shipping',
        title: 'Shipping & Delivery',
        icon: '🚚',
        questions: [
          {
            id: 'shipping-cost',
            question: 'What are the shipping charges?',
            answer: 'Shipping is ₹100 for orders below ₹2000. Orders above ₹2000 get free shipping across India.'
          },
          {
            id: 'delivery-time',
            question: 'How long does delivery take?',
            answer: 'Standard delivery takes 5-7 business days. Handmade products may take additional 1-3 days for crafting before shipping.'
          },
          {
            id: 'delivery-locations',
            question: 'Where do you deliver?',
            answer: 'We deliver across India. Some remote locations may have extended delivery times. Check availability during checkout.'
          },
          {
            id: 'delivery-issues',
            question: 'What if there are delivery issues?',
            answer: 'Contact our support team immediately. We\'ll track your package and resolve delivery issues quickly.'
          }
        ]
      },
      {
        id: 'artisans',
        title: 'Artisans & Quality',
        icon: '🎭',
        questions: [
          {
            id: 'artisan-verification',
            question: 'How are artisans verified?',
            answer: 'All artisans go through a verification process including identity verification, craft skill assessment, and quality standards review.'
          },
          {
            id: 'quality-assurance',
            question: 'What about quality assurance?',
            answer: 'Each product is reviewed for quality before listing. We also collect customer reviews to maintain quality standards.'
          },
          {
            id: 'contact-artisan',
            question: 'Can I contact artisans directly?',
            answer: 'Yes, visit the artisan\'s profile page to see their contact information and send messages about custom orders or questions.'
          },
          {
            id: 'artisan-support',
            question: 'How do you support artisans?',
            answer: 'We provide artisans with a platform to showcase their work, handle payments, provide analytics, and offer marketing support.'
          }
        ]
      }
    ];

    res.json({
      success: true,
      faq: faqCategories
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching FAQ', error: error.message });
  }
});

// GET /api/help-center/contact - Get contact information
router.get('/contact', async (req, res) => {
  try {
    const contactInfo = {
      customerSupport: {
        email: 'support@kaarigari.com',
        phone: '+91-98765-43210',
        whatsapp: '+91-98765-43210',
        hours: 'Mon-Sat: 9:00 AM - 6:00 PM IST'
      },
      businessInquiries: {
        email: 'business@kaarigari.com',
        phone: '+91-98765-43211'
      },
      artisanSupport: {
        email: 'artisan@kaarigari.com',
        phone: '+91-98765-43212'
      },
      address: {
        name: 'Kaarigari Marketplace',
        street: '123 Artisan Plaza',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      },
      socialMedia: {
        facebook: 'https://facebook.com/kaarigari',
        instagram: 'https://instagram.com/kaarigari',
        twitter: 'https://twitter.com/kaarigari',
        youtube: 'https://youtube.com/kaarigari'
      },
      policies: [
        {
          title: 'Privacy Policy',
          url: '/privacy-policy',
          description: 'How we collect and use your information'
        },
        {
          title: 'Terms of Service',
          url: '/terms-of-service',
          description: 'Terms and conditions for using our platform'
        },
        {
          title: 'Return Policy',
          url: '/return-policy',
          description: 'Guidelines for returns and refunds'
        },
        {
          title: 'Artisan Guidelines',
          url: '/artisan-guidelines',
          description: 'Guidelines for artisans selling on our platform'
        }
      ]
    };

    res.json({
      success: true,
      contact: contactInfo
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching contact info', error: error.message });
  }
});

// GET /api/help-center/guides - Get user guides
router.get('/guides', async (req, res) => {
  try {
    const guides = [
      {
        id: 'getting-started',
        title: 'Getting Started Guide',
        description: 'New to Kaarigari? Learn how to navigate and make your first purchase',
        category: 'Basics',
        readTime: '5 min',
        steps: [
          {
            step: 1,
            title: 'Create Your Account',
            description: 'Sign up with your email and complete your profile',
            image: '/guides/signup.jpg'
          },
          {
            step: 2,
            title: 'Browse Products',
            description: 'Explore handmade products by category or search for specific items',
            image: '/guides/browse.jpg'
          },
          {
            step: 3,
            title: 'Add to Cart & Checkout',
            description: 'Select products, add to cart, and proceed with secure checkout',
            image: '/guides/checkout.jpg'
          },
          {
            step: 4,
            title: 'Track Your Order',
            description: 'Monitor your order status and delivery progress',
            image: '/guides/tracking.jpg'
          }
        ]
      },
      {
        id: 'account-management',
        title: 'Managing Your Account',
        description: 'Learn how to manage your profile, addresses, and preferences',
        category: 'Account',
        readTime: '3 min',
        steps: [
          {
            step: 1,
            title: 'Access Account Settings',
            description: 'Click on your profile icon and select Account',
            image: '/guides/account-access.jpg'
          },
          {
            step: 2,
            title: 'Update Profile Information',
            description: 'Edit your personal details, contact information, and preferences',
            image: '/guides/profile-edit.jpg'
          },
          {
            step: 3,
            title: 'Manage Addresses',
            description: 'Add, edit, or delete delivery addresses',
            image: '/guides/addresses.jpg'
          },
          {
            step: 4,
            title: 'Review Order History',
            description: 'View past orders, track deliveries, and leave reviews',
            image: '/guides/orders.jpg'
          }
        ]
      },
      {
        id: 'wishlist-guide',
        title: 'Using Your Wishlist',
        description: 'Save products for later and manage your wishlist effectively',
        category: 'Features',
        readTime: '2 min',
        steps: [
          {
            step: 1,
            title: 'Adding Items',
            description: 'Click the heart icon on any product to save it to your wishlist',
            image: '/guides/add-wishlist.jpg'
          },
          {
            step: 2,
            title: 'Viewing Your Wishlist',
            description: 'Access your saved items from Account > Wishlist',
            image: '/guides/view-wishlist.jpg'
          },
          {
            step: 3,
            title: 'Managing Items',
            description: 'Remove items or move them to cart when ready to purchase',
            image: '/guides/manage-wishlist.jpg'
          }
        ]
      }
    ];

    res.json({
      success: true,
      guides
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching guides', error: error.message });
  }
});

module.exports = router;
