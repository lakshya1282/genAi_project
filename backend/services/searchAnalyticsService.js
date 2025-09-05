const mongoose = require('mongoose');

// Schema for search analytics
const searchAnalyticsSchema = new mongoose.Schema({
  query: { type: String, required: true },
  parsedQuery: { type: Object }, // AI parsed query structure
  resultCount: { type: Number, default: 0 },
  clickedResults: [{ type: String }], // Product IDs that were clicked
  userId: { type: String }, // User ID if logged in
  userType: { type: String }, // 'customer', 'artisan', 'anonymous'
  sessionId: { type: String },
  searchMode: { type: String, enum: ['ai', 'basic'], default: 'ai' },
  aiConfidence: { type: Number }, // AI parsing confidence score
  responseTime: { type: Number }, // Search processing time in ms
  successful: { type: Boolean, default: true }, // Whether search returned results
  timestamp: { type: Date, default: Date.now },
  userAgent: { type: String },
  ipAddress: { type: String },
  refinements: [{ type: String }], // Follow-up searches in same session
  conversionEvents: [{ // Track if search led to actions
    type: { type: String }, // 'view', 'cart', 'purchase'
    productId: { type: String },
    timestamp: { type: Date, default: Date.now }
  }]
});

const SearchAnalytics = mongoose.model('SearchAnalytics', searchAnalyticsSchema);

class SearchAnalyticsService {
  /**
   * Log a search event
   */
  async logSearch({
    query,
    parsedQuery,
    resultCount,
    userId,
    userType = 'anonymous',
    sessionId,
    searchMode = 'ai',
    aiConfidence,
    responseTime,
    successful = true,
    userAgent,
    ipAddress
  }) {
    try {
      const searchLog = new SearchAnalytics({
        query: query.toLowerCase().trim(),
        parsedQuery,
        resultCount,
        userId,
        userType,
        sessionId,
        searchMode,
        aiConfidence,
        responseTime,
        successful,
        userAgent,
        ipAddress
      });

      await searchLog.save();
      
      return searchLog._id;
    } catch (error) {
      console.error('Error logging search:', error);
      return null;
    }
  }

  /**
   * Log user interaction with search results
   */
  async logInteraction(searchId, productId, interactionType = 'click') {
    try {
      await SearchAnalytics.findByIdAndUpdate(searchId, {
        $push: { clickedResults: productId }
      });
    } catch (error) {
      console.error('Error logging interaction:', error);
    }
  }

  /**
   * Log conversion events (view, cart add, purchase)
   */
  async logConversion(searchId, productId, conversionType) {
    try {
      await SearchAnalytics.findByIdAndUpdate(searchId, {
        $push: { 
          conversionEvents: {
            type: conversionType,
            productId,
            timestamp: new Date()
          }
        }
      });
    } catch (error) {
      console.error('Error logging conversion:', error);
    }
  }

  /**
   * Get search analytics dashboard data
   */
  async getAnalyticsDashboard(timeRange = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const analytics = await SearchAnalytics.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalSearches: { $sum: 1 },
            successfulSearches: { $sum: { $cond: ['$successful', 1, 0] } },
            averageResults: { $avg: '$resultCount' },
            averageConfidence: { $avg: '$aiConfidence' },
            averageResponseTime: { $avg: '$responseTime' },
            aiSearches: { $sum: { $cond: [{ $eq: ['$searchMode', 'ai'] }, 1, 0] } },
            basicSearches: { $sum: { $cond: [{ $eq: ['$searchMode', 'basic'] }, 1, 0] } }
          }
        }
      ]);

      // Get top queries
      const topQueries = await SearchAnalytics.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: '$query', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Get search trends by hour
      const searchTrends = await SearchAnalytics.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: { $hour: '$timestamp' },
            searches: { $sum: 1 },
            successRate: { $avg: { $cond: ['$successful', 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Get category distribution from parsed queries
      const categoryDistribution = await SearchAnalytics.aggregate([
        { $match: { timestamp: { $gte: startDate }, 'parsedQuery.category': { $exists: true } } },
        { $group: { _id: '$parsedQuery.category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      return {
        summary: analytics[0] || {
          totalSearches: 0,
          successfulSearches: 0,
          averageResults: 0,
          averageConfidence: 0,
          averageResponseTime: 0,
          aiSearches: 0,
          basicSearches: 0
        },
        topQueries: topQueries.map(q => ({ query: q._id, count: q.count })),
        searchTrends: searchTrends.map(t => ({ hour: t._id, searches: t.searches, successRate: t.successRate })),
        categoryDistribution: categoryDistribution.map(c => ({ category: c._id, count: c.count }))
      };
    } catch (error) {
      console.error('Error getting analytics dashboard:', error);
      return null;
    }
  }

  /**
   * Get poor performing queries that need attention
   */
  async getPoorPerformingQueries(limit = 10) {
    try {
      const poorQueries = await SearchAnalytics.aggregate([
        {
          $group: {
            _id: '$query',
            totalSearches: { $sum: 1 },
            successfulSearches: { $sum: { $cond: ['$successful', 1, 0] } },
            averageResults: { $avg: '$resultCount' },
            averageConfidence: { $avg: '$aiConfidence' }
          }
        },
        {
          $project: {
            query: '$_id',
            totalSearches: 1,
            successRate: { $divide: ['$successfulSearches', '$totalSearches'] },
            averageResults: 1,
            averageConfidence: 1,
            score: {
              $add: [
                { $multiply: [{ $divide: ['$successfulSearches', '$totalSearches'] }, 40] },
                { $multiply: ['$averageResults', 2] },
                { $multiply: ['$averageConfidence', 60] }
              ]
            }
          }
        },
        { $match: { totalSearches: { $gte: 3 } } }, // Only queries with at least 3 searches
        { $sort: { score: 1 } }, // Lowest scores first
        { $limit: limit }
      ]);

      return poorQueries.map(q => ({
        query: q.query,
        totalSearches: q.totalSearches,
        successRate: q.successRate,
        averageResults: q.averageResults,
        averageConfidence: q.averageConfidence,
        performanceScore: q.score
      }));
    } catch (error) {
      console.error('Error getting poor performing queries:', error);
      return [];
    }
  }

  /**
   * Get search recommendations based on analytics
   */
  async getSearchRecommendations() {
    try {
      const recommendations = [];
      
      // Get analytics for last 30 days
      const analytics = await this.getAnalyticsDashboard(30);
      const poorQueries = await this.getPoorPerformingQueries(5);

      if (analytics) {
        // Check success rate
        const successRate = analytics.summary.successfulSearches / analytics.summary.totalSearches;
        if (successRate < 0.8) {
          recommendations.push({
            type: 'improvement',
            priority: 'high',
            message: `Search success rate is ${(successRate * 100).toFixed(1)}%. Consider improving product tagging and descriptions.`,
            action: 'improve_product_data'
          });
        }

        // Check AI confidence
        if (analytics.summary.averageConfidence < 0.7) {
          recommendations.push({
            type: 'improvement',
            priority: 'medium',
            message: `AI parsing confidence is low (${(analytics.summary.averageConfidence * 100).toFixed(1)}%). Consider training improvements.`,
            action: 'improve_ai_parsing'
          });
        }

        // Check response time
        if (analytics.summary.averageResponseTime > 2000) {
          recommendations.push({
            type: 'performance',
            priority: 'medium',
            message: `Average search response time is ${analytics.summary.averageResponseTime}ms. Consider optimization.`,
            action: 'optimize_performance'
          });
        }
      }

      // Add recommendations for poor queries
      if (poorQueries.length > 0) {
        recommendations.push({
          type: 'content',
          priority: 'medium',
          message: `${poorQueries.length} queries are performing poorly. Consider adding relevant products.`,
          action: 'improve_content',
          details: poorQueries.map(q => q.query)
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting search recommendations:', error);
      return [];
    }
  }

  /**
   * Get similar successful searches for failed queries
   */
  async getSimilarSuccessfulSearches(failedQuery, limit = 5) {
    try {
      const successfulSearches = await SearchAnalytics.find({
        successful: true,
        resultCount: { $gte: 1 }
      }).limit(1000).select('query resultCount');

      // Simple text similarity - in production, use embeddings
      const similarities = successfulSearches.map(search => ({
        query: search.query,
        resultCount: search.resultCount,
        similarity: this.calculateTextSimilarity(failedQuery, search.query)
      }));

      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting similar searches:', error);
      return [];
    }
  }

  /**
   * Simple text similarity calculation (Jaccard similarity)
   */
  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(' '));
    const words2 = new Set(text2.toLowerCase().split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Clean old analytics data
   */
  async cleanOldData(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await SearchAnalytics.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      console.log(`Cleaned ${result.deletedCount} old search analytics records`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning old analytics data:', error);
      return 0;
    }
  }

  /**
   * Export search data for analysis
   */
  async exportSearchData(startDate, endDate, format = 'json') {
    try {
      const searchData = await SearchAnalytics.find({
        timestamp: { $gte: startDate, $lte: endDate }
      }).lean();

      if (format === 'csv') {
        // Convert to CSV format
        const csvHeader = 'timestamp,query,searchMode,resultCount,aiConfidence,successful,userType\n';
        const csvRows = searchData.map(record => 
          `${record.timestamp},${record.query},${record.searchMode},${record.resultCount},${record.aiConfidence},${record.successful},${record.userType}`
        ).join('\n');
        
        return csvHeader + csvRows;
      }

      return searchData;
    } catch (error) {
      console.error('Error exporting search data:', error);
      return null;
    }
  }
}

module.exports = new SearchAnalyticsService();
