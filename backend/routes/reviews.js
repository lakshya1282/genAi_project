const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// @route   POST /api/reviews
// @desc    Create a new review
// @access  Private (Customer only)
router.post('/', auth, async (req, res) => {
  try {
    console.log('📝 Review submission request received:');
    console.log('- User:', req.user);
    console.log('- Body:', req.body);
    
    const { productId, rating, comment } = req.body;

    // Validation
    if (!productId || !rating || !comment) {
      console.log('❌ Validation failed: missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Product ID, rating, and comment are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    if (comment.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Comment must be 500 characters or less'
      });
    }

    // Check if user is a customer
    if (req.user.userType !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Only customers can leave reviews'
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      productId: productId,
      customerId: req.user.userId
    });

    if (existingReview) {
      console.log('⚠️ User has already reviewed this product');
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Note: We allow reviews for products that might not exist in Product collection
    // This enables demo functionality with sample products

    // Create new review
    console.log('🎆 Creating new review with data:');
    const reviewData = {
      productId,
      customerId: req.user.userId,
      customerName: req.user.name,
      rating,
      comment
    };
    console.log('- Review data:', reviewData);
    
    const newReview = new Review(reviewData);
    console.log('📋 Review object created, attempting to save...');

    const savedReview = await newReview.save();
    console.log('✅ Review saved successfully:', savedReview._id);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review: savedReview
    });

  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating review'
    });
  }
});

// @route   GET /api/reviews/product/:productId
// @desc    Get all reviews for a product
// @access  Public
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const reviews = await Review.getProductReviews(productId);
    const averageData = await Review.getAverageRating(productId);

    res.json({
      success: true,
      reviews,
      averageRating: averageData.averageRating,
      totalReviews: averageData.totalReviews
    });

  } catch (error) {
    console.error('Error fetching product reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reviews'
    });
  }
});

// @route   GET /api/reviews/customer/:customerId
// @desc    Get all reviews by a customer
// @access  Private (Customer only, own reviews)
router.get('/customer/:customerId', auth, async (req, res) => {
  try {
    const { customerId } = req.params;

    // Users can only access their own reviews
    if (req.user.userId !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    const reviews = await Review.getCustomerReviews(customerId);

    res.json({
      success: true,
      reviews
    });

  } catch (error) {
    console.error('Error fetching customer reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reviews'
    });
  }
});

// @route   PUT /api/reviews/:reviewId
// @desc    Update a review
// @access  Private (Customer only, own reviews)
router.put('/:reviewId', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID'
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns this review
    if (review.customerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Validation
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    if (comment && comment.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Comment must be 500 characters or less'
      });
    }

    // Update review
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;

    const updatedReview = await review.save();

    res.json({
      success: true,
      message: 'Review updated successfully',
      review: updatedReview
    });

  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating review'
    });
  }
});

// @route   DELETE /api/reviews/:reviewId
// @desc    Delete a review
// @access  Private (Customer only, own reviews)
router.delete('/:reviewId', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID'
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns this review
    if (review.customerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await Review.findByIdAndDelete(reviewId);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting review'
    });
  }
});

module.exports = router;
