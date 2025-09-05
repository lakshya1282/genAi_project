import React, { useState, useRef, useEffect } from 'react';
import { 
  FaSearchPlus, 
  FaSearchMinus, 
  FaTimes, 
  FaChevronLeft, 
  FaChevronRight,
  FaExpand,
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaDownload
} from 'react-icons/fa';
import './ProductGallery.css';

const ProductGallery = ({ 
  images = [], 
  videos = [], 
  productName = '',
  is360View = false,
  className = '' 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  const allMedia = [...images.map(img => ({ type: 'image', url: img })), 
                   ...videos.map(vid => ({ type: 'video', url: vid }))];

  const currentMedia = allMedia[currentIndex] || { type: 'image', url: '' };

  // Reset zoom when changing images
  useEffect(() => {
    setZoomLevel(1);
    setZoomPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isLightboxOpen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          navigateImage('prev');
          break;
        case 'ArrowRight':
          navigateImage('next');
          break;
        case 'Escape':
          closeLightbox();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
        case '0':
          resetZoom();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isLightboxOpen, currentIndex, zoomLevel]);

  const navigateImage = (direction) => {
    if (allMedia.length === 0) return;
    
    if (direction === 'next') {
      setCurrentIndex((prev) => (prev + 1) % allMedia.length);
    } else {
      setCurrentIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
    }
  };

  const openLightbox = (index = currentIndex) => {
    setCurrentIndex(index);
    setIsLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setZoomLevel(1);
    setZoomPosition({ x: 0, y: 0 });
    setIsDragging(false);
    document.body.style.overflow = 'unset';
  };

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 5));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 1));
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setZoomPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (zoomLevel <= 1) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - zoomPosition.x,
      y: e.clientY - zoomPosition.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoomLevel <= 1) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Calculate boundaries to prevent dragging out of view
    const container = containerRef.current;
    const image = imageRef.current;
    
    if (container && image) {
      const containerRect = container.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      
      const maxX = Math.max(0, (imageRect.width - containerRect.width) / 2);
      const maxY = Math.max(0, (imageRect.height - containerRect.height) / 2);
      
      setZoomPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    if (!isLightboxOpen) return;
    
    e.preventDefault();
    
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const downloadImage = () => {
    if (currentMedia.type === 'image') {
      const link = document.createElement('a');
      link.href = currentMedia.url;
      link.download = `${productName}-${currentIndex + 1}.jpg`;
      link.click();
    }
  };

  if (allMedia.length === 0) {
    return (
      <div className={`product-gallery ${className} no-images`}>
        <div className="no-image-placeholder">
          <div className="placeholder-content">
            <span>No images available</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`product-gallery ${className}`}>
      {/* Main Image Display */}
      <div className="main-image-container">
        {currentMedia.type === 'image' ? (
          <img
            src={currentMedia.url}
            alt={`${productName} - Image ${currentIndex + 1}`}
            className="main-image"
            onClick={() => openLightbox(currentIndex)}
            loading="lazy"
          />
        ) : (
          <video
            src={currentMedia.url}
            className="main-video"
            controls
            onClick={() => openLightbox(currentIndex)}
            poster={images[0]}
          />
        )}
        
        <div className="image-overlay">
          <button
            className="zoom-btn"
            onClick={() => openLightbox(currentIndex)}
            title="Click to zoom"
          >
            <FaSearchPlus />
          </button>
          
          {allMedia.length > 1 && (
            <>
              <button
                className="nav-btn prev"
                onClick={() => navigateImage('prev')}
                disabled={currentIndex === 0}
              >
                <FaChevronLeft />
              </button>
              <button
                className="nav-btn next"
                onClick={() => navigateImage('next')}
                disabled={currentIndex === allMedia.length - 1}
              >
                <FaChevronRight />
              </button>
            </>
          )}
          
          <div className="image-counter">
            {currentIndex + 1} / {allMedia.length}
          </div>
        </div>
      </div>

      {/* Thumbnail Navigation */}
      {allMedia.length > 1 && (
        <div className="thumbnail-container">
          <div className="thumbnails">
            {allMedia.map((media, index) => (
              <div
                key={index}
                className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
              >
                {media.type === 'image' ? (
                  <img
                    src={media.url}
                    alt={`Thumbnail ${index + 1}`}
                    loading="lazy"
                  />
                ) : (
                  <div className="video-thumbnail">
                    <img
                      src={images[0] || media.url}
                      alt={`Video thumbnail ${index + 1}`}
                      loading="lazy"
                    />
                    <div className="video-indicator">
                      <FaPlay />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
            {/* Lightbox Header */}
            <div className="lightbox-header">
              <div className="lightbox-info">
                <span>{productName} - {currentIndex + 1} of {allMedia.length}</span>
              </div>
              <div className="lightbox-controls">
                {currentMedia.type === 'image' && (
                  <>
                    <button onClick={zoomOut} disabled={zoomLevel <= 1} title="Zoom Out">
                      <FaSearchMinus />
                    </button>
                    <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
                    <button onClick={zoomIn} disabled={zoomLevel >= 5} title="Zoom In">
                      <FaSearchPlus />
                    </button>
                    <button onClick={downloadImage} title="Download Image">
                      <FaDownload />
                    </button>
                  </>
                )}
                <button onClick={closeLightbox} title="Close">
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* Media Content */}
            <div 
              className="lightbox-content"
              ref={containerRef}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {currentMedia.type === 'image' ? (
                <img
                  ref={imageRef}
                  src={currentMedia.url}
                  alt={`${productName} - Image ${currentIndex + 1}`}
                  className="lightbox-image"
                  style={{
                    transform: `scale(${zoomLevel}) translate(${zoomPosition.x / zoomLevel}px, ${zoomPosition.y / zoomLevel}px)`,
                    cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                  }}
                  draggable={false}
                />
              ) : (
                <div className="lightbox-video-container">
                  <video
                    ref={videoRef}
                    src={currentMedia.url}
                    className="lightbox-video"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onVolumeChange={() => setIsMuted(videoRef.current?.muted || false)}
                  />
                  <div className="video-controls-overlay">
                    <button onClick={togglePlayPause} className="play-pause-btn">
                      {isPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                    <button onClick={toggleMute} className="mute-btn">
                      {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Arrows */}
            {allMedia.length > 1 && (
              <>
                <button
                  className="lightbox-nav prev"
                  onClick={() => navigateImage('prev')}
                  disabled={currentIndex === 0}
                >
                  <FaChevronLeft />
                </button>
                <button
                  className="lightbox-nav next"
                  onClick={() => navigateImage('next')}
                  disabled={currentIndex === allMedia.length - 1}
                >
                  <FaChevronRight />
                </button>
              </>
            )}

            {/* Thumbnail Strip */}
            {allMedia.length > 1 && (
              <div className="lightbox-thumbnails">
                {allMedia.map((media, index) => (
                  <div
                    key={index}
                    className={`lightbox-thumbnail ${index === currentIndex ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(index)}
                  >
                    {media.type === 'image' ? (
                      <img src={media.url} alt={`Thumbnail ${index + 1}`} />
                    ) : (
                      <div className="video-thumb">
                        <img src={images[0] || media.url} alt={`Video ${index + 1}`} />
                        <FaPlay className="play-icon" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
