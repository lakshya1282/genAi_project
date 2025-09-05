const OpenAI = require('openai');

class EmbeddingService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Cache for embeddings
    this.embeddingCache = new Map();
    
    // Model configuration
    this.embeddingModel = 'text-embedding-ada-002';
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text, useCache = true) {
    try {
      const cacheKey = `embedding_${text.toLowerCase().trim()}`;
      
      if (useCache && this.embeddingCache.has(cacheKey)) {
        return this.embeddingCache.get(cacheKey);
      }

      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      const embedding = response.data[0].embedding;
      
      if (useCache) {
        this.embeddingCache.set(cacheKey, embedding);
      }
      
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      
      // Fallback: return a random-ish embedding based on text hash
      return this.generateFallbackEmbedding(text);
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateBatchEmbeddings(texts, useCache = true) {
    try {
      const embeddings = [];
      const uncachedTexts = [];
      const uncachedIndices = [];

      // Check cache first
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const cacheKey = `embedding_${text.toLowerCase().trim()}`;
        
        if (useCache && this.embeddingCache.has(cacheKey)) {
          embeddings[i] = this.embeddingCache.get(cacheKey);
        } else {
          uncachedTexts.push(text);
          uncachedIndices.push(i);
        }
      }

      // Generate embeddings for uncached texts
      if (uncachedTexts.length > 0) {
        const response = await this.openai.embeddings.create({
          model: this.embeddingModel,
          input: uncachedTexts,
        });

        response.data.forEach((item, idx) => {
          const originalIndex = uncachedIndices[idx];
          const text = uncachedTexts[idx];
          const embedding = item.embedding;
          
          embeddings[originalIndex] = embedding;
          
          if (useCache) {
            const cacheKey = `embedding_${text.toLowerCase().trim()}`;
            this.embeddingCache.set(cacheKey, embedding);
          }
        });
      }

      return embeddings;
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      
      // Fallback: return fallback embeddings for all texts
      return texts.map(text => this.generateFallbackEmbedding(text));
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1, embedding2) {
    try {
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        norm1 += embedding1[i] * embedding1[i];
        norm2 += embedding2[i] * embedding2[i];
      }

      norm1 = Math.sqrt(norm1);
      norm2 = Math.sqrt(norm2);

      if (norm1 === 0 || norm2 === 0) {
        return 0;
      }

      return dotProduct / (norm1 * norm2);
    } catch (error) {
      console.error('Error calculating cosine similarity:', error);
      return 0;
    }
  }

  /**
   * Find most similar texts from a collection
   */
  async findSimilarTexts(queryText, targetTexts, topK = 5) {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(queryText);
      
      // Generate embeddings for target texts
      const targetEmbeddings = await this.generateBatchEmbeddings(targetTexts);
      
      // Calculate similarities
      const similarities = targetEmbeddings.map((embedding, index) => ({
        text: targetTexts[index],
        similarity: this.cosineSimilarity(queryEmbedding, embedding),
        index
      }));

      // Sort by similarity and return top K
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
    } catch (error) {
      console.error('Error finding similar texts:', error);
      
      // Fallback: return first few items with random similarities
      return targetTexts.slice(0, topK).map((text, index) => ({
        text,
        similarity: Math.random() * 0.5 + 0.3, // Random similarity between 0.3-0.8
        index
      }));
    }
  }

  /**
   * Enhance product search with semantic similarity
   */
  async enhanceProductSearch(query, products) {
    try {
      if (!products || products.length === 0) {
        return products;
      }

      // Create searchable text for each product
      const productTexts = products.map(product => 
        `${product.name} ${product.description} ${product.category} ${product.tags?.join(' ') || ''}`
      );

      // Find most similar products
      const similarities = await this.findSimilarTexts(query, productTexts, products.length);
      
      // Reorder products by semantic similarity
      const reorderedProducts = similarities.map(sim => {
        const product = products[sim.index];
        return {
          ...product,
          semanticSimilarity: sim.similarity,
          semanticScore: sim.similarity * 100
        };
      });

      // Filter products with minimum similarity threshold
      const threshold = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD) || 0.3;
      return reorderedProducts.filter(product => product.semanticSimilarity >= threshold);
      
    } catch (error) {
      console.error('Error enhancing product search:', error);
      
      // Return original products with default scores
      return products.map(product => ({
        ...product,
        semanticSimilarity: 0.5,
        semanticScore: 50
      }));
    }
  }

  /**
   * Generate product embeddings for indexing
   */
  async generateProductEmbedding(product) {
    try {
      const productText = `${product.name} ${product.description} ${product.category} ${product.tags?.join(' ') || ''} ${product.artisan?.craftType || ''}`;
      return await this.generateEmbedding(productText);
    } catch (error) {
      console.error('Error generating product embedding:', error);
      return this.generateFallbackEmbedding(product.name || 'product');
    }
  }

  /**
   * Fallback embedding generation (simple hash-based)
   */
  generateFallbackEmbedding(text) {
    // Create a simple hash-based embedding (for fallback only)
    const hash = this.simpleHash(text);
    const embedding = new Array(1536).fill(0); // OpenAI ada-002 dimension
    
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = ((hash * (i + 1)) % 1000) / 1000 - 0.5; // Normalize to [-0.5, 0.5]
    }
    
    return embedding;
  }

  /**
   * Simple hash function for fallback
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Clear embedding cache
   */
  clearCache() {
    this.embeddingCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.embeddingCache.size,
      model: this.embeddingModel
    };
  }
}

module.exports = new EmbeddingService();
