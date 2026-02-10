
class VideoPlayer {
  constructor() {
    this.currentVideo = null
    this.videoId = null
    this.init()
  }

  async init() {
    this.videoId = this.getVideoIdFromUrl()
    if (!this.videoId) {
      this.showError("No video ID provided")
      return
    }

    await this.loadVideo()
    this.setupEventListeners()
  }

  getVideoIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get("id")
  }

  async loadVideo() {
    try {
      const response = await fetch("data/videos.json")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      // Find the video
      this.currentVideo = data.videos.find((video) => video.id === this.videoId)

      if (!this.currentVideo) {
        this.showError("Video not found")
        return
      }

      this.renderVideo()
    } catch (error) {
      console.error("Error loading video:", error)
      this.showError("Failed to load video")
    }
  }

  renderVideo() {
    // Update page title
    document.title = `${this.currentVideo.title} - Film Catalog`

    // Render video info
    const titleElement = document.getElementById("videoTitle")
    const descriptionElement = document.getElementById("videoDescription")
    const dateElement = document.getElementById("videoDate")
    const sourceElement = document.getElementById("videoSource")

    if (titleElement) {
      titleElement.textContent = this.currentVideo.title
    }

    if (descriptionElement) {
      const description = this.currentVideo.description || ""
      descriptionElement.innerHTML = description.replace(/\n/g, "<br>")
    }

    if (dateElement && this.currentVideo.dateAdded) {
      dateElement.textContent = this.formatDate(this.currentVideo.dateAdded)
    }

    if (sourceElement) {
      sourceElement.textContent = this.getVideoSource(this.currentVideo)
    }

    const folderElement = document.getElementById("videoFolder")
    if (folderElement && this.currentVideo.folder) {
      folderElement.textContent = `Folder: ${this.currentVideo.folder}`
      folderElement.style.display = "block"
    }

    // Render video player
    this.renderVideoPlayer()
  }

  renderVideoPlayer() {
    const playerContainer = document.getElementById("videoPlayer")
    if (!playerContainer) return

    const videoUrl = this.currentVideo.videoUrl || this.currentVideo.driveUrl

    if (this.isGoogleDriveUrl(videoUrl)) {
      // Handle Google Drive URLs
      const embedUrl = this.convertGoogleDriveUrl(videoUrl)
      playerContainer.innerHTML = `
        <iframe
          src="${embedUrl}"
          frameborder="0"
          allowfullscreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          class="video-iframe"
        ></iframe>
      `
    } else if (this.isYouTubeUrl(videoUrl)) {
      // Handle YouTube URLs
      playerContainer.innerHTML = `
        <iframe
          src="${videoUrl}"
          frameborder="0"
          allowfullscreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          class="video-iframe"
        ></iframe>
      `
    } else if (this.isDirectVideoUrl(videoUrl)) {
      // Handle direct video URLs
      playerContainer.innerHTML = `
        <video
          controls
          preload="metadata"
          class="video-element"
        >
          <source src="${videoUrl}" type="video/mp4">
          <source src="${videoUrl}" type="video/webm">
          <source src="${videoUrl}" type="video/ogg">
          Your browser does not support the video tag.
        </video>
      `
    } else {
      // Fallback for unknown URLs
      playerContainer.innerHTML = `
        <div class="video-error">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <h3>Unable to load video</h3>
          <p>The video format is not supported or the URL is invalid.</p>
          <a href="${videoUrl}" target="_blank" class="external-link">Open in new tab</a>
        </div>
      `
    }

    // Add loading animation
    playerContainer.classList.add("fade-in")
  }

  isGoogleDriveUrl(url) {
    return url && url.includes("drive.google.com")
  }

  isYouTubeUrl(url) {
    return url && (url.includes("youtube.com") || url.includes("youtu.be"))
  }

  isDirectVideoUrl(url) {
    if (!url) return false
    const videoExtensions = [".mp4", ".webm", ".ogg", ".avi", ".mov", ".wmv", ".flv", ".mkv"]
    return videoExtensions.some((ext) => url.toLowerCase().includes(ext))
  }

  convertGoogleDriveUrl(url) {
    // Convert Google Drive share URL to embed URL
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (fileIdMatch) {
      const fileId = fileIdMatch[1]
      return `https://drive.google.com/file/d/${fileId}/preview`
    }
    return url
  }

  setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Escape to go back
      if (e.key === "Escape") {
        this.goBack()
      }
    })

    // Handle browser back button
    window.addEventListener("popstate", () => {
      this.goBack()
    })
  }

  goBack() {
    // Add fade out animation
    document.body.style.opacity = "0.8"
    setTimeout(() => {
      window.location.href = "index.html"
    }, 150)
  }

  showError(message) {
    const playerContainer = document.getElementById("videoPlayer")
    const titleElement = document.getElementById("videoTitle")
    const descriptionElement = document.getElementById("videoDescription")

    if (titleElement) {
      titleElement.textContent = "Error"
    }

    if (descriptionElement) {
      descriptionElement.textContent = message
    }

    if (playerContainer) {
      playerContainer.innerHTML = `
        <div class="video-error">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <h3>Oops! Something went wrong</h3>
          <p>${message}</p>
          <button class="retry-button" onclick="location.reload()">Try Again</button>
          <a href="index.html" class="back-link">Back to Catalog</a>
        </div>
      `
    }
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

  getVideoSource(video) {
    const videoUrl = video.videoUrl || video.driveUrl
    if (videoUrl?.includes("drive.google.com")) return "Google Drive"
    if (videoUrl?.includes("youtube.com") || videoUrl?.includes("youtu.be")) return "YouTube"
    return "Direct Video"
  }
}

// Initialize video player when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new VideoPlayer()
})

// Add fullscreen functionality
document.addEventListener("DOMContentLoaded", () => {
  const playerContainer = document.getElementById("videoPlayer")

  if (playerContainer) {
    // Add fullscreen button
    const fullscreenBtn = document.createElement("button")
    fullscreenBtn.className = "fullscreen-btn"
    fullscreenBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
      </svg>
    `
    fullscreenBtn.title = "Fullscreen"

    fullscreenBtn.addEventListener("click", () => {
      if (playerContainer.requestFullscreen) {
        playerContainer.requestFullscreen()
      } else if (playerContainer.webkitRequestFullscreen) {
        playerContainer.webkitRequestFullscreen()
      } else if (playerContainer.msRequestFullscreen) {
        playerContainer.msRequestFullscreen()
      }
    })

    // Add button to player container
    playerContainer.style.position = "relative"
    playerContainer.appendChild(fullscreenBtn)
  }
})
