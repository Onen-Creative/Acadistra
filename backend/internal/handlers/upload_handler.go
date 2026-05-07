package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/utils"
)

type UploadHandler struct{}

func NewUploadHandler() *UploadHandler {
	return &UploadHandler{}
}

func (h *UploadHandler) UploadLogo(c *gin.Context) {
	file, err := c.FormFile("logo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Get file extension
	ext := ".png"
	if len(file.Filename) > 4 {
		ext = file.Filename[len(file.Filename)-4:]
	}

	// Ensure directory exists
	os.MkdirAll("public/logos", 0755)

	// Save to public/logos directory
	filename := uuid.New().String() + ext
	path := "public/logos/" + filename
	if err := c.SaveUploadedFile(file, path); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"logo_url": "/logos/" + filename})
}

// UploadStudentPhoto handles student photo upload with optimization
func (h *UploadHandler) UploadStudentPhoto(c *gin.Context) {
	// Set longer timeout for image processing
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 10<<20) // 10MB max
	
	file, err := c.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Validate file type
	if !strings.HasSuffix(strings.ToLower(file.Filename), ".jpg") &&
		!strings.HasSuffix(strings.ToLower(file.Filename), ".jpeg") &&
		!strings.HasSuffix(strings.ToLower(file.Filename), ".png") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only JPG, JPEG, and PNG files are allowed"})
		return
	}

	// Validate file size (max 10MB original)
	if file.Size > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size must be less than 10MB"})
		return
	}

	// Generate unique filename first
	filename := uuid.New().String()
	photoPath := filepath.Join("public", "photos", filename+".jpg")
	thumbPath := filepath.Join("public", "photos", "thumbs", filename+".jpg")

	// Ensure directories exist
	os.MkdirAll(filepath.Dir(photoPath), 0755)
	os.MkdirAll(filepath.Dir(thumbPath), 0755)

	// For small files (< 1MB), skip optimization to speed up
	if file.Size < 1024*1024 {
		// Just save the original file
		if err := c.SaveUploadedFile(file, photoPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save photo"})
			return
		}
		
		// Create a simple thumbnail
		src, err := file.Open()
		if err == nil {
			thumbnail, err := utils.CreateThumbnail(src, 150)
			if err == nil {
				os.WriteFile(thumbPath, thumbnail, 0644)
			}
			src.Close()
		}
		
		c.JSON(http.StatusOK, gin.H{
			"photo_url":      fmt.Sprintf("/photos/%s.jpg", filename),
			"thumbnail_url":  fmt.Sprintf("/photos/thumbs/%s.jpg", filename),
			"original_size":  file.Size,
			"optimized_size": file.Size,
			"saved_percent":  "0.0%",
		})
		return
	}

	// For larger files, do optimization
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}
	defer src.Close()

	// Optimize image (resize to 400x400 max, compress)
	optimized, err := utils.OptimizeStudentPhoto(src, 400)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process image"})
		return
	}

	// Create thumbnail
	src.Seek(0, 0) // Reset file pointer
	thumbnail, err := utils.CreateThumbnail(src, 150)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create thumbnail"})
		return
	}

	// Save optimized photo
	if err := os.WriteFile(photoPath, optimized, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save photo"})
		return
	}

	// Save thumbnail
	if err := os.WriteFile(thumbPath, thumbnail, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save thumbnail"})
		return
	}

	// Calculate saved space
	originalSize := file.Size
	optimizedSize := int64(len(optimized))
	savedPercent := float64(originalSize-optimizedSize) / float64(originalSize) * 100

	c.JSON(http.StatusOK, gin.H{
		"photo_url":      fmt.Sprintf("/photos/%s.jpg", filename),
		"thumbnail_url":  fmt.Sprintf("/photos/thumbs/%s.jpg", filename),
		"original_size":  originalSize,
		"optimized_size": optimizedSize,
		"saved_percent":  fmt.Sprintf("%.1f%%", savedPercent),
	})
}
