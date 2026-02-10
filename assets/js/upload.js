class VideoUploader {
  constructor() {
    this.isSubmitting = false
    this.folders = []
    this.init()
  }

  async init() {
    await this.loadExistingFolders()
    this.setupEventListeners()
    this.setupFormValidation()
    this.setupFolderSelection()
  }

  async loadExistingFolders() {
    try {
      const response = await fetch("data/videos.json")
      if (response.ok) {
        const data = await response.json()
        const folderSet = new Set()
        data.videos.forEach((video) => {
          if (video.folder) {
            folderSet.add(video.folder)
          }
        })
        this.folders = Array.from(folderSet).sort()
      }
    } catch (error) {
      console.error("Error loading folders:", error)
      this.folders = ["General", "Tutorials", "Entertainment"]
    }
  }

  setupFolderSelection() {
    const folderSection = document.querySelector(".folder-section")
    if (!folderSection) return

    const folderOptions = this.folders.map((folder) => `<option value="${folder}">${folder}</option>`).join("")

    folderSection.innerHTML = `
      <label for="folderSelect" class="form-label">
        Folder
        <span class="required">*</span>
      </label>
      <div class="folder-input-group">
        <select id="folderSelect" class="form-select" required>
          <option value="">Select a folder</option>
          ${folderOptions}
          <option value="__new__">+ Create New Folder</option>
        </select>
        <input 
          type="text" 
          id="newFolderInput" 
          class="form-input" 
          placeholder="Enter new folder name"
          style="display: none;"
          maxlength="50"
        >
      </div>
      <div class="form-help">Choose an existing folder or create a new one</div>
    `

    // Handle folder selection
    const folderSelect = document.getElementById("folderSelect")
    const newFolderInput = document.getElementById("newFolderInput")

    folderSelect?.addEventListener("change", (e) => {
      if (e.target.value === "__new__") {
        newFolderInput.style.display = "block"
        newFolderInput.focus()
        newFolderInput.required = true
      } else {
        newFolderInput.style.display = "none"
        newFolderInput.required = false
        newFolderInput.value = ""
      }
    })
  }

  setupEventListeners() {
    const form = document.getElementById("uploadForm")
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault()
        this.handleSubmit()
      })
    }

    // Real-time URL validation
    const driveUrlInput = document.getElementById("driveUrl")
    if (driveUrlInput) {
      driveUrlInput.addEventListener("input", (e) => {
        this.validateDriveUrl(e.target.value)
        this.autoGenerateYouTubeThumbnail(e.target.value)
      })

      driveUrlInput.addEventListener("blur", (e) => {
        this.processDriveUrl(e.target.value)
      })
    }

    // Auto-generate thumbnail from Drive URL
    const thumbnailInput = document.getElementById("thumbnailUrl")
    if (thumbnailInput && driveUrlInput) {
      driveUrlInput.addEventListener("change", () => {
        this.autoGenerateThumbnail(driveUrlInput.value, thumbnailInput)
        this.autoGenerateYouTubeThumbnail(driveUrlInput.value)
      })
    }

    // Form auto-save (draft functionality)
    this.setupAutoSave()
  }

  setupFormValidation() {
    const inputs = document.querySelectorAll(".form-input, .form-textarea, .form-select")
    inputs.forEach((input) => {
      input.addEventListener("blur", () => {
        this.validateField(input)
      })

      input.addEventListener("input", () => {
        this.clearFieldError(input)
      })
    })
  }

  setupAutoSave() {
    const form = document.getElementById("uploadForm")
    if (!form) return

    // Load saved draft
    this.loadDraft()

    // Save draft on input
    const inputs = form.querySelectorAll("input, textarea, select")
    inputs.forEach((input) => {
      input.addEventListener("input", () => {
        this.saveDraft()
      })
    })
  }

  validateDriveUrl(url) {
    const driveUrlInput = document.getElementById("driveUrl")
    const helpText = driveUrlInput?.parentNode.querySelector(".form-help")

    if (!url) {
      this.updateHelpText(
        helpText,
        "Paste the shareable link from Google Drive, YouTube, or direct video URL",
        "neutral",
      )
      return false
    }

    if (this.isValidGoogleDriveUrl(url)) {
      this.updateHelpText(helpText, "✓ Valid Google Drive URL", "success")
      return true
    } else if (this.isValidYouTubeUrl(url)) {
      this.updateHelpText(helpText, "✓ Valid YouTube URL", "success")
      return true
    } else if (this.isValidDirectVideoUrl(url)) {
      this.updateHelpText(helpText, "✓ Valid video URL", "success")
      return true
    } else {
      this.updateHelpText(helpText, "⚠ Please enter a valid Google Drive, YouTube, or direct video URL", "error")
      return false
    }
  }

  updateHelpText(element, text, type) {
    if (!element) return

    element.textContent = text
    element.className = `form-help form-help-${type}`
  }

  async processDriveUrl(url) {
    if (!this.isValidGoogleDriveUrl(url)) return

    try {
      // Extract file ID from Google Drive URL
      const fileId = this.extractGoogleDriveFileId(url)
      if (!fileId) return

      this.showProcessingIndicator(true)

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Auto-fill thumbnail if not provided
      const thumbnailInput = document.getElementById("thumbnailUrl")
      if (thumbnailInput && !thumbnailInput.value) {
        const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h300`
        thumbnailInput.value = thumbnailUrl
      }

      this.showProcessingIndicator(false)
      this.showNotification("Drive URL processed successfully!", "success")
    } catch (error) {
      console.error("Error processing Drive URL:", error)
      this.showProcessingIndicator(false)
      this.showNotification("Failed to process Drive URL", "error")
    }
  }

  autoGenerateThumbnail(driveUrl, thumbnailInput) {
    if (!this.isValidGoogleDriveUrl(driveUrl) || thumbnailInput.value) return

    const fileId = this.extractGoogleDriveFileId(driveUrl)
    if (fileId) {
      thumbnailInput.value = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h300`
    }
  }

  autoGenerateYouTubeThumbnail(url) {
    const thumbnailInput = document.getElementById("thumbnailUrl")
    if (!thumbnailInput || thumbnailInput.value) return // Don't override existing thumbnail

    if (this.isValidYouTubeUrl(url)) {
      const videoId = this.extractYouTubeVideoId(url)
      if (videoId) {
        thumbnailInput.value = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        // Show success feedback
        const helpText = thumbnailInput.parentNode.querySelector(".form-help")
        if (helpText) {
          this.updateHelpText(helpText, "✓ YouTube thumbnail automatically set", "success")
        }
      }
    }
  }

  async handleSubmit() {
    if (this.isSubmitting) return

    const formData = this.getFormData()
    if (!this.validateForm(formData)) {
      return
    }

    this.isSubmitting = true
    this.updateSubmitButton(true)

    try {
      await this.showUploadInstructions(formData)
      this.clearDraft()
    } catch (error) {
      console.error("Error processing upload:", error)
      this.showNotification("Failed to process upload. Please try again.", "error")
    } finally {
      this.isSubmitting = false
      this.updateSubmitButton(false)
    }
  }

  async showUploadInstructions(data) {
    const convertedUrl = this.convertToEmbedUrl(data.driveUrl)

    const video = {
      id: this.generateVideoId(),
      title: data.title,
      description: data.description || "",
      thumbnail: data.thumbnailUrl || this.getDefaultThumbnail(),
      videoUrl: convertedUrl,
      driveUrl: convertedUrl, // Use converted URL here too
      dateAdded: new Date().toISOString(),
      folder: data.folder,
    }

    const jsonString = JSON.stringify(video, null, 2)

    // Create modal with instructions
    const modal = document.createElement("div")
    modal.className = "upload-modal"
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Video Ready to Add!</h3>
        <p>Copy the JSON below and add it to your <code>data/videos.json</code> file:</p>
        <div class="json-code">
          <pre><code>${jsonString}</code></pre>
        </div>
        <div class="modal-actions">
          <button class="copy-btn" id="copyJsonBtn">
            📋 Copy JSON
          </button>
          <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">
            Close
          </button>
        </div>
        <p class="modal-note">Add this object to the "videos" array in your JSON file. The page will automatically refresh to show new videos.</p>
      </div>
    `

    document.body.appendChild(modal)

    const copyBtn = modal.querySelector("#copyJsonBtn")
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(jsonString)
        copyBtn.innerHTML = "✅ Copied!"
        copyBtn.style.backgroundColor = "#10b981"
        setTimeout(() => {
          copyBtn.innerHTML = "📋 Copy JSON"
          copyBtn.style.backgroundColor = ""
        }, 2000)
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement("textarea")
        textArea.value = jsonString
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)

        copyBtn.innerHTML = "✅ Copied!"
        copyBtn.style.backgroundColor = "#10b981"
        setTimeout(() => {
          copyBtn.innerHTML = "📋 Copy JSON"
          copyBtn.style.backgroundColor = ""
        }, 2000)
      }
    })

    // Add click to close
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove()
      }
    })
  }

  getFormData() {
    const folderSelect = document.getElementById("folderSelect")
    const newFolderInput = document.getElementById("newFolderInput")

    let folder = folderSelect?.value || ""
    if (folder === "__new__") {
      folder = newFolderInput?.value.trim() || ""
    }

    return {
      driveUrl: document.getElementById("driveUrl")?.value.trim() || "",
      title: document.getElementById("videoTitle")?.value.trim() || "",
      description: document.getElementById("videoDescription")?.value.trim() || "",
      thumbnailUrl: document.getElementById("thumbnailUrl")?.value.trim() || "",
      folder: folder,
    }
  }

  validateForm(data) {
    let isValid = true
    const errors = []

    // Validate Drive URL
    if (!data.driveUrl) {
      this.showFieldError("driveUrl", "Video URL is required")
      errors.push("Video URL is required")
      isValid = false
    } else if (!this.validateDriveUrl(data.driveUrl)) {
      this.showFieldError("driveUrl", "Please enter a valid video URL")
      errors.push("Invalid video URL")
      isValid = false
    }

    // Validate title
    if (!data.title) {
      this.showFieldError("videoTitle", "Title is required")
      errors.push("Title is required")
      isValid = false
    } else if (data.title.length < 3) {
      this.showFieldError("videoTitle", "Title must be at least 3 characters long")
      errors.push("Title too short")
      isValid = false
    } else if (data.title.length > 100) {
      this.showFieldError("videoTitle", "Title must be less than 100 characters")
      errors.push("Title too long")
      isValid = false
    }

    if (!data.folder) {
      this.showFieldError("folderSelect", "Please select or create a folder")
      errors.push("Folder is required")
      isValid = false
    }

    // Validate description (optional but with limits)
    if (data.description && data.description.length > 500) {
      this.showFieldError("videoDescription", "Description must be less than 500 characters")
      errors.push("Description too long")
      isValid = false
    }

    // Validate thumbnail URL (optional but must be valid if provided)
    if (data.thumbnailUrl && !this.isValidImageUrl(data.thumbnailUrl)) {
      this.showFieldError("thumbnailUrl", "Please enter a valid image URL")
      errors.push("Invalid thumbnail URL")
      isValid = false
    }

    if (!isValid) {
      this.showNotification(`Please fix the following errors: ${errors.join(", ")}`, "error")
    }

    return isValid
  }

  convertToEmbedUrl(url) {
    if (this.isValidGoogleDriveUrl(url)) {
      const fileId = this.extractGoogleDriveFileId(url)
      return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url
    }

    if (this.isValidYouTubeUrl(url)) {
      // Convert YouTube watch URL to embed URL
      const videoId = this.extractYouTubeVideoId(url)
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url
    }

    return url
  }

  generateVideoId() {
    return `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  getDefaultThumbnail() {
    return "assets/images/placeholder.png"
  }

  // URL validation methods
  isValidGoogleDriveUrl(url) {
    return url && url.includes("drive.google.com") && url.includes("/file/d/")
  }

  isValidYouTubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
    return youtubeRegex.test(url)
  }

  isValidDirectVideoUrl(url) {
    if (!url) return false
    try {
      new URL(url)
      const videoExtensions = [".mp4", ".webm", ".ogg", ".avi", ".mov", ".wmv", ".flv", ".mkv"]
      return videoExtensions.some((ext) => url.toLowerCase().includes(ext))
    } catch {
      return false
    }
  }

  isValidImageUrl(url) {
    if (!url) return true // Optional field
    try {
      new URL(url)
      const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]
      return imageExtensions.some((ext) => url.toLowerCase().includes(ext)) || url.includes("thumbnail")
    } catch {
      return false
    }
  }

  extractGoogleDriveFileId(url) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }

  extractYouTubeVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // UI Helper methods
  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId)
    if (!field) return

    // Remove existing error
    this.clearFieldError(field)

    // Add error styling
    field.classList.add("field-error")

    // Add error message
    const errorElement = document.createElement("div")
    errorElement.className = "field-error-message"
    errorElement.textContent = message
    field.parentNode.appendChild(errorElement)
  }

  clearFieldError(field) {
    field.classList.remove("field-error")
    const errorMessage = field.parentNode.querySelector(".field-error-message")
    if (errorMessage) {
      errorMessage.remove()
    }
  }

  validateField(field) {
    const value = field.value.trim()
    const fieldId = field.id

    switch (fieldId) {
      case "driveUrl":
        if (value && !this.validateDriveUrl(value)) {
          this.showFieldError(fieldId, "Please enter a valid video URL")
          return false
        }
        break
      case "videoTitle":
        if (value && value.length < 3) {
          this.showFieldError(fieldId, "Title must be at least 3 characters long")
          return false
        }
        break
      case "thumbnailUrl":
        if (value && !this.isValidImageUrl(value)) {
          this.showFieldError(fieldId, "Please enter a valid image URL")
          return false
        }
        break
      case "folderSelect":
        if (!value || value === "") {
          this.showFieldError(fieldId, "Please select a folder")
          return false
        }
        break
    }

    this.clearFieldError(field)
    return true
  }

  updateSubmitButton(isLoading) {
    const button = document.querySelector(".submit-btn")
    if (!button) return

    if (isLoading) {
      button.disabled = true
      button.innerHTML = `
        <div class="loading-spinner-small"></div>
        Processing...
      `
    } else {
      button.disabled = false
      button.innerHTML = "Add Video"
    }
  }

  showProcessingIndicator(show) {
    const driveUrlInput = document.getElementById("driveUrl")
    if (!driveUrlInput) return

    if (show) {
      driveUrlInput.classList.add("processing")
    } else {
      driveUrlInput.classList.remove("processing")
    }
  }

  showNotification(message, type = "success") {
    // Remove existing notification
    const existingNotification = document.querySelector(".notification")
    if (existingNotification) {
      existingNotification.remove()
    }

    // Create notification
    const notification = document.createElement("div")
    notification.className = `notification notification-${type}`
    notification.textContent = message

    // Add to page
    document.body.appendChild(notification)

    // Animate in
    setTimeout(() => {
      notification.classList.add("show")
    }, 100)

    // Remove after delay
    setTimeout(
      () => {
        notification.classList.remove("show")
        setTimeout(() => {
          notification.remove()
        }, 300)
      },
      type === "error" ? 5000 : 3000,
    )
  }

  // Draft functionality
  saveDraft() {
    const formData = this.getFormData()
    localStorage.setItem("videoDraft", JSON.stringify(formData))
  }

  loadDraft() {
    const draft = localStorage.getItem("videoDraft")
    if (!draft) return

    try {
      const data = JSON.parse(draft)

      // Fill form with draft data
      if (data.driveUrl) document.getElementById("driveUrl").value = data.driveUrl
      if (data.title) document.getElementById("videoTitle").value = data.title
      if (data.description) document.getElementById("videoDescription").value = data.description
      if (data.thumbnailUrl) document.getElementById("thumbnailUrl").value = data.thumbnailUrl
      if (data.folder) {
        const folderSelect = document.getElementById("folderSelect")
        if (folderSelect) {
          folderSelect.value = data.folder
        }
      }

      // Show draft indicator
      this.showNotification("Draft restored", "info")
    } catch (error) {
      console.error("Error loading draft:", error)
    }
  }

  clearDraft() {
    localStorage.removeItem("videoDraft")
  }
}

// Initialize uploader when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new VideoUploader()
})

// Add keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + Enter to submit form
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault()
    const form = document.getElementById("uploadForm")
    if (form) {
      form.dispatchEvent(new Event("submit"))
    }
  }

  // Escape to go back
  if (e.key === "Escape") {
    window.location.href = "index.html"
  }
})