// Main catalog functionality with enhanced search and animations
class VideoCatalog {
  constructor() {
    this.videos = []
    this.filteredVideos = []
    this.isLoading = false
    this.currentSort = "newest"
    this.currentFolder = "all"
    this.searchSuggestions = []
    this.folders = []
    this.init()
  }

  async init() {
    this.showLoading(true)
    await this.loadVideos()
    this.setupEventListeners()
    this.setupAdvancedSearch()
    this.renderVideos()
    this.showLoading(false)
    this.setupLazyLoading()
    this.setupAnimationSystem()

    setInterval(() => {
      this.refreshVideos()
    }, 30000)
  }

  async loadVideos() {
    try {
      const response = await fetch("data/videos.json?t=" + Date.now()) // Cache busting
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      this.videos = data.videos.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
      this.filteredVideos = [...this.videos]

      this.extractFolders()
      this.updateFolderDropdown()
      this.generateSearchSuggestions()
    } catch (error) {
      console.error("Error loading videos:", error)
      this.videos = []
      this.filteredVideos = []
      this.showError("Failed to load videos. Please refresh the page.")
    }
  }

  async refreshVideos() {
    try {
      const response = await fetch("data/videos.json?t=" + Date.now())
      if (response.ok) {
        const data = await response.json()
        const newVideoCount = data.videos.length
        const currentVideoCount = this.videos.length

        if (newVideoCount !== currentVideoCount) {
          this.videos = data.videos.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
          this.extractFolders()
          this.updateFolderDropdown()
          this.applySortAndFilter()
          this.showNotification(`${newVideoCount - currentVideoCount} new video(s) added!`, "success")
        }
      }
    } catch (error) {
      console.error("Error refreshing videos:", error)
    }
  }

  extractFolders() {
    const folderSet = new Set()
    this.videos.forEach((video) => {
      if (video.folder) {
        folderSet.add(video.folder)
      }
    })
    this.folders = Array.from(folderSet).sort()
  }

  updateFolderDropdown() {
    const folderSelect = document.getElementById("folderSelect")
    if (!folderSelect) return

    const currentValue = folderSelect.value
    folderSelect.innerHTML = `
      <option value="all">All Videos</option>
      ${this.folders.map((folder) => `<option value="${folder}">${folder}</option>`).join("")}
    `

    // Restore previous selection if it still exists
    if (this.folders.includes(currentValue) || currentValue === "all") {
      folderSelect.value = currentValue
    }
  }

  setupEventListeners() {
    // Enhanced search functionality with debouncing
    const searchInput = document.getElementById("searchInput")
    if (searchInput) {
      let debounceTimer
      searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          this.performSearch(e.target.value)
        }, 300)
      })

      // Clear search on escape
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          searchInput.value = ""
          this.performSearch("")
        }
        // Handle arrow keys for suggestions
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          this.handleSuggestionNavigation(e)
        }
        if (e.key === "Enter") {
          this.handleSuggestionSelect(e)
        }
      })

      // Show suggestions on focus
      searchInput.addEventListener("focus", () => {
        this.showSearchSuggestions()
      })

      // Hide suggestions on blur (with delay for clicks)
      searchInput.addEventListener("blur", () => {
        setTimeout(() => this.hideSearchSuggestions(), 200)
      })
    }

    // FAB click handler with animation
    const fab = document.getElementById("addVideoFab")
    if (fab) {
      fab.addEventListener("click", () => {
        this.animateElementOut(document.body, () => {
          window.location.href = "upload.html"
        })
      })
    }

    // Handle browser back/forward
    window.addEventListener("popstate", () => {
      this.loadVideos().then(() => this.renderVideos())
    })

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Ctrl/Cmd + K for search focus
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        searchInput?.focus()
      }
    })
  }

  setupAdvancedSearch() {
    const searchSection = document.querySelector(".search-section")
    if (!searchSection) return

    const advancedControls = document.createElement("div")
    advancedControls.className = "search-controls"
    advancedControls.innerHTML = `
      <div class="search-filters">
        <select id="sortSelect" class="search-select">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="title">Title A-Z</option>
          <option value="title-desc">Title Z-A</option>
        </select>
        
        <select id="folderSelect" class="search-select">
          <option value="all">All Videos</option>
          ${this.folders.map((folder) => `<option value="${folder}">${folder}</option>`).join("")}
        </select>
        
        <button id="clearFilters" class="clear-filters-btn" title="Clear all filters">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="search-suggestions" id="searchSuggestions" style="display: none;"></div>
    `

    searchSection.appendChild(advancedControls)

    const sortSelect = document.getElementById("sortSelect")
    const folderSelect = document.getElementById("folderSelect")
    const clearFilters = document.getElementById("clearFilters")

    if (sortSelect) {
      // Use both change and input events for better mobile support
      sortSelect.addEventListener("change", (e) => {
        this.currentSort = e.target.value
        this.applySortAndFilter()
      })
      sortSelect.addEventListener("input", (e) => {
        this.currentSort = e.target.value
        this.applySortAndFilter()
      })
      // Add touch events for mobile
      sortSelect.addEventListener("touchend", (e) => {
        setTimeout(() => {
          this.currentSort = e.target.value
          this.applySortAndFilter()
        }, 100)
      })
    }

    if (folderSelect) {
      // Use both change and input events for better mobile support
      folderSelect.addEventListener("change", (e) => {
        this.currentFolder = e.target.value
        this.applySortAndFilter()
      })
      folderSelect.addEventListener("input", (e) => {
        this.currentFolder = e.target.value
        this.applySortAndFilter()
      })
      // Add touch events for mobile
      folderSelect.addEventListener("touchend", (e) => {
        setTimeout(() => {
          this.currentFolder = e.target.value
          this.applySortAndFilter()
        }, 100)
      })
    }

    if (clearFilters) {
      clearFilters.addEventListener("click", () => {
        this.clearAllFilters()
      })
      clearFilters.addEventListener("touchend", (e) => {
        e.preventDefault()
        this.clearAllFilters()
      })
    }
  }

  generateSearchSuggestions() {
    const suggestions = new Set()

    this.videos.forEach((video) => {
      // Add title words
      video.title.split(" ").forEach((word) => {
        if (word.length > 2) {
          suggestions.add(word.toLowerCase())
        }
      })

      // Add description words
      video.description.split(" ").forEach((word) => {
        if (word.length > 3) {
          suggestions.add(word.toLowerCase())
        }
      })

      if (video.folder) {
        suggestions.add(video.folder.toLowerCase())
      }
    })

    this.searchSuggestions = Array.from(suggestions).slice(0, 10)
  }

  performSearch(searchTerm) {
    const term = searchTerm.toLowerCase().trim()

    if (!term) {
      this.filteredVideos = [...this.videos]
    } else {
      this.filteredVideos = this.videos.filter((video) => {
        const titleMatch = video.title.toLowerCase().includes(term)
        const descriptionMatch = video.description.toLowerCase().includes(term)
        const folderMatch = video.folder && video.folder.toLowerCase().includes(term)
        const exactMatch = video.title.toLowerCase() === term || video.description.toLowerCase() === term

        // Boost exact matches
        if (exactMatch) {
          video._searchScore = 100
        } else if (titleMatch) {
          video._searchScore = 50
        } else if (folderMatch) {
          video._searchScore = 40
        } else if (descriptionMatch) {
          video._searchScore = 25
        } else {
          video._searchScore = 0
        }

        return titleMatch || descriptionMatch || folderMatch
      })

      // Sort by search relevance
      this.filteredVideos.sort((a, b) => (b._searchScore || 0) - (a._searchScore || 0))
    }

    this.applySortAndFilter()
    this.updateSearchResults(term)
  }

  applySortAndFilter() {
    let videos = [...this.videos]

    // Apply search filter first if there's a search term
    const searchInput = document.getElementById("searchInput")
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : ""

    if (searchTerm) {
      videos = videos.filter((video) => {
        const titleMatch = video.title.toLowerCase().includes(searchTerm)
        const descriptionMatch = video.description.toLowerCase().includes(searchTerm)
        const folderMatch = video.folder && video.folder.toLowerCase().includes(searchTerm)
        return titleMatch || descriptionMatch || folderMatch
      })
    }

    // Apply folder filter
    if (this.currentFolder !== "all") {
      videos = videos.filter((video) => video.folder === this.currentFolder)
    }

    // Apply sort
    switch (this.currentSort) {
      case "oldest":
        videos.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded))
        break
      case "title":
        videos.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "title-desc":
        videos.sort((a, b) => b.title.localeCompare(a.title))
        break
      case "newest":
      default:
        videos.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
        break
    }

    this.filteredVideos = videos
    this.renderVideos()
  }

  showSearchSuggestions() {
    const searchInput = document.getElementById("searchInput")
    const suggestionsContainer = document.getElementById("searchSuggestions")

    if (!searchInput || !suggestionsContainer || !this.searchSuggestions.length) return

    const currentValue = searchInput.value.toLowerCase()
    const matchingSuggestions = this.searchSuggestions
      .filter((suggestion) => suggestion.includes(currentValue) && suggestion !== currentValue)
      .slice(0, 5)

    if (matchingSuggestions.length === 0) {
      suggestionsContainer.style.display = "none"
      return
    }

    suggestionsContainer.innerHTML = matchingSuggestions
      .map(
        (suggestion) => `
        <div class="search-suggestion" data-suggestion="${suggestion}">
          ${this.highlightMatch(suggestion, currentValue)}
        </div>
      `,
      )
      .join("")

    suggestionsContainer.style.display = "block"

    // Add click handlers
    suggestionsContainer.querySelectorAll(".search-suggestion").forEach((item) => {
      item.addEventListener("click", () => {
        searchInput.value = item.dataset.suggestion
        this.performSearch(item.dataset.suggestion)
        this.hideSearchSuggestions()
      })
    })
  }

  hideSearchSuggestions() {
    const suggestionsContainer = document.getElementById("searchSuggestions")
    if (suggestionsContainer) {
      suggestionsContainer.style.display = "none"
    }
  }

  highlightMatch(text, match) {
    if (!match) return text
    const regex = new RegExp(`(${match})`, "gi")
    return text.replace(regex, "<strong>$1</strong>")
  }

  clearAllFilters() {
    const searchInput = document.getElementById("searchInput")
    const sortSelect = document.getElementById("sortSelect")
    const folderSelect = document.getElementById("folderSelect")

    if (searchInput) searchInput.value = ""
    if (sortSelect) sortSelect.value = "newest"
    if (folderSelect) folderSelect.value = "all"

    this.currentSort = "newest"
    this.currentFolder = "all"
    this.performSearch("")
  }

  updateSearchResults(searchTerm) {
    const grid = document.getElementById("catalogGrid")
    if (searchTerm && this.filteredVideos.length === 0) {
      grid.innerHTML = `
        <div class="no-results fade-in">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <h3>No videos found</h3>
          <p>Try adjusting your search terms or filters</p>
          <button class="cta-button" onclick="window.videoCatalogInstance.clearAllFilters()">Clear Filters</button>
        </div>
      `
    }
  }

  renderVideos() {
    const grid = document.getElementById("catalogGrid")
    if (!grid) return

    if (this.filteredVideos.length === 0 && this.videos.length === 0) {
      grid.innerHTML = `
        <div class="empty-state fade-in">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <h3>No videos yet</h3>
          <p>Add your first video to get started</p>
          <button class="cta-button" onclick="window.location.href='upload.html'">Add Video</button>
        </div>
      `
      return
    }

    // Create video cards with enhanced animations
    grid.innerHTML = this.filteredVideos
      .map(
        (video, index) => `
        <div class="video-card" data-video-id="${video.id}" data-animation-delay="${index * 0.1}">
          <div class="video-thumbnail-container">
            <img 
              src="${video.thumbnail}" 
              alt="${this.escapeHtml(video.title)}"
              class="video-thumbnail"
              loading="lazy"
              onerror="window.handleThumbnailError(this)"
            >
            <div class="video-overlay">
              <svg class="play-icon" width="48" height="48" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21"></polygon>
              </svg>
            </div>
            ${video.folder ? `<div class="folder-badge">${video.folder}</div>` : ""}
          </div>
          <div class="video-card-content">
            <h3 class="video-card-title">${this.escapeHtml(video.title)}</h3>
            <p class="video-card-description">${this.escapeHtml(video.description)}</p>
            <div class="video-card-meta">
              <span class="video-date">${this.formatDate(video.dateAdded)}</span>
              <span class="video-source">${this.getVideoSource(video)}</span>
            </div>
          </div>
        </div>
      `,
      )
      .join("")

    // Add click handlers and enhanced animations
    this.addVideoCardHandlers()
    this.animateCardsIn()
  }

  addVideoCardHandlers() {
    const cards = document.querySelectorAll(".video-card")
    cards.forEach((card) => {
      const videoId = card.dataset.videoId

      card.addEventListener("click", () => {
        this.openVideoWithAnimation(videoId)
      })

      // Enhanced hover effects with smooth animations
      card.addEventListener("mouseenter", () => {
        this.animateCardHover(card, true)
      })

      card.addEventListener("mouseleave", () => {
        this.animateCardHover(card, false)
      })
    })
  }

  animateCardsIn() {
    const cards = document.querySelectorAll(".video-card")

    // Use Intersection Observer for better performance
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const card = entry.target
            const delay = Number.parseFloat(card.dataset.animationDelay) * 1000

            setTimeout(() => {
              card.classList.add("animate-in")
            }, delay)

            observer.unobserve(card)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
      },
    )

    cards.forEach((card) => observer.observe(card))
  }

  animateCardHover(card, isHovering) {
    const thumbnail = card.querySelector(".video-thumbnail")
    const overlay = card.querySelector(".video-overlay")

    if (isHovering) {
      card.style.transform = "translateY(-8px) scale(1.02)"
      card.style.boxShadow = "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)"
      if (thumbnail) thumbnail.style.transform = "scale(1.1)"
      if (overlay) overlay.style.opacity = "1"
    } else {
      card.style.transform = "translateY(0) scale(1)"
      card.style.boxShadow = ""
      if (thumbnail) thumbnail.style.transform = "scale(1)"
      if (overlay) overlay.style.opacity = "0"
    }
  }

  openVideoWithAnimation(videoId) {
    this.animateElementOut(document.body, () => {
      window.location.href = `video.html?id=${videoId}`
    })
  }

  animateElementOut(element, callback) {
    element.style.transition = "opacity 0.3s ease-out, transform 0.3s ease-out"
    element.style.opacity = "0.7"
    element.style.transform = "scale(0.98)"

    setTimeout(() => {
      callback()
    }, 300)
  }

  setupAnimationSystem() {
    // Add CSS custom properties for dynamic animations
    document.documentElement.style.setProperty("--animation-duration", "0.3s")
    document.documentElement.style.setProperty("--animation-easing", "cubic-bezier(0.4, 0, 0.2, 1)")

    // Setup scroll-triggered animations
    this.setupScrollAnimations()

    // Setup performance monitoring
    this.setupPerformanceOptimizations()
  }

  setupScrollAnimations() {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.updateScrollAnimations()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
  }

  updateScrollAnimations() {
    const scrolled = window.pageYOffset
    const rate = scrolled * -0.5

    // Parallax effect for header
    const header = document.querySelector(".header")
    if (header && scrolled > 0) {
      header.style.transform = `translateY(${rate}px)`
      header.style.opacity = Math.max(0.8, 1 - scrolled / 200)
    }
  }

  setupPerformanceOptimizations() {
    // Debounce resize events
    let resizeTimer
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        this.handleResize()
      }, 250)
    })

    // Preload next page resources
    this.preloadResources()
  }

  preloadResources() {
    // Preload video page
    const videoPageLink = document.createElement("link")
    videoPageLink.rel = "prefetch"
    videoPageLink.href = "video.html"
    document.head.appendChild(videoPageLink)

    // Preload upload page
    const uploadPageLink = document.createElement("link")
    uploadPageLink.rel = "prefetch"
    uploadPageLink.href = "upload.html"
    document.head.appendChild(uploadPageLink)
  }

  handleResize() {
    // Recalculate animations on resize
    const cards = document.querySelectorAll(".video-card")
    cards.forEach((card) => {
      card.style.transition = "none"
      setTimeout(() => {
        card.style.transition = ""
      }, 100)
    })
  }

  setupLazyLoading() {
    // Enhanced lazy loading with intersection observer
    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target

            // Add loading animation
            img.style.opacity = "0.5"
            img.style.transition = "opacity 0.5s ease-in-out"

            // Create a new image to test loading
            const tempImg = new Image()

            tempImg.onload = () => {
              img.src = tempImg.src
              img.style.opacity = "1"
              img.style.filter = "none"
              img.classList.add("loaded")
            }

            tempImg.onerror = () => {
              // If the original thumbnail fails, trigger our error handler
              this.handleThumbnailError(img)
            }

            // Start loading
            tempImg.src = img.dataset.src || img.src

            imageObserver.unobserve(img)
          }
        })
      },
      {
        rootMargin: "50px", // Reduced for faster loading
        threshold: 0.1,
      },
    )

    // Observe all lazy images
    const lazyImages = document.querySelectorAll('img[loading="lazy"]')
    lazyImages.forEach((img) => imageObserver.observe(img))
  }

  getVideoSource(video) {
    if (video.driveUrl?.includes("drive.google.com")) return "Google Drive"
    if (video.driveUrl?.includes("youtube.com") || video.driveUrl?.includes("youtu.be")) return "YouTube"
    return "Video"
  }

  handleThumbnailError(img) {
    // Try different fallback strategies
    if (!img.dataset.fallbackAttempted) {
      img.dataset.fallbackAttempted = "1"

      // First fallback: try to extract thumbnail from Google Drive URL
      const videoCard = img.closest(".video-card")
      if (videoCard) {
        const videoId = videoCard.dataset.videoId
        const video = this.videos.find((v) => v.id === videoId)

        if (video && video.driveUrl && video.driveUrl.includes("drive.google.com")) {
          // Extract file ID and try different thumbnail format
          const fileIdMatch = video.driveUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
          if (fileIdMatch) {
            const fileId = fileIdMatch[1]
            img.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h300`
            return
          }
        }
      }
    } else if (img.dataset.fallbackAttempted === "1") {
      img.dataset.fallbackAttempted = "2"
      // Second fallback: try a different Google Drive thumbnail format
      const videoCard = img.closest(".video-card")
      if (videoCard) {
        const videoId = videoCard.dataset.videoId
        const video = this.videos.find((v) => v.id === videoId)

        if (video && video.driveUrl && video.driveUrl.includes("drive.google.com")) {
          const fileIdMatch = video.driveUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
          if (fileIdMatch) {
            const fileId = fileIdMatch[1]
            img.src = `https://lh3.googleusercontent.com/d/${fileId}=w400-h300`
            return
          }
        }
      }
    }

    // Final fallback: use placeholder
    img.src = "assets/images/placeholder.png"
    img.onerror = null // Prevent infinite loop

    // Add a subtle loading indicator
    img.style.opacity = "0.7"
    img.style.filter = "grayscale(0.3)"
  }

  showNotification(message, type = "success") {
    const existingNotification = document.querySelector(".notification")
    if (existingNotification) {
      existingNotification.remove()
    }

    const notification = document.createElement("div")
    notification.className = `notification notification-${type}`
    notification.textContent = message

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.classList.add("show")
    }, 100)

    setTimeout(() => {
      notification.classList.remove("show")
      setTimeout(() => {
        notification.remove()
      }, 300)
    }, 3000)
  }

  formatDate(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`
    return date.toLocaleDateString()
  }

  showLoading(show) {
    const grid = document.getElementById("catalogGrid")
    if (!grid) return

    if (show) {
      grid.innerHTML = `
        <div class="loading">
          <div class="loading-spinner"></div>
          <p>Loading videos...</p>
        </div>
      `
    }
  }

  showError(message) {
    const grid = document.getElementById("catalogGrid")
    if (!grid) return

    grid.innerHTML = `
      <div class="error-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <h3>Oops! Something went wrong</h3>
        <p>${message}</p>
        <button class="retry-button" onclick="location.reload()">Try Again</button>
      </div>
    `
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }
}

// Global function for thumbnail error handling
window.handleThumbnailError = (img) => {
  const catalog = window.videoCatalogInstance
  if (catalog) {
    catalog.handleThumbnailError(img)
  }
}

// Initialize the catalog when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.videoCatalogInstance = new VideoCatalog()
})

// Add smooth scroll utility with easing
function smoothScrollTo(element, options = {}) {
  const defaultOptions = {
    behavior: "smooth",
    block: "start",
    inline: "nearest",
  }

  element.scrollIntoView({ ...defaultOptions, ...options })
}

// Enhanced performance monitoring
if ("requestIdleCallback" in window) {
  requestIdleCallback(() => {
    // Preload critical resources during idle time
    const catalog = window.videoCatalogInstance
    if (catalog) {
      catalog.preloadResources()
    }
  })
}