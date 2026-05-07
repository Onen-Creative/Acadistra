package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/config"
	"github.com/school-system/backend/internal/repositories"
	"github.com/school-system/backend/internal/services"
	"gorm.io/gorm"
)

// Dependencies holds all dependencies needed for route setup
type Dependencies struct {
	DB                  *gorm.DB
	Config              *config.Config
	AuthService         *services.AuthService
	MonitoringService   *services.SystemMonitoringService
	EmailService        *services.EmailService
	PayrollService      *services.PayrollService
	SMSService          *services.SMSService
	NotificationService *services.NotificationService
	SocketServer        http.Handler
}

// Service factory helpers — centralise wiring so routes stay clean

func newAnnouncementService(deps *Dependencies) *services.AnnouncementService {
	return services.NewAnnouncementService(
		repositories.NewAnnouncementRepository(deps.DB),
		deps.EmailService,
	)
}

func newAttendanceService(deps *Dependencies) *services.AttendanceService {
	return services.NewAttendanceService(
		repositories.NewAttendanceRepository(deps.DB),
		deps.DB,
		deps.EmailService,
	)
}

func newClassService(deps *Dependencies) *services.ClassService {
	return services.NewClassService(
		repositories.NewClassRepository(deps.DB),
		deps.DB,
	)
}

func newStudentService(deps *Dependencies) *services.StudentService {
	return services.NewStudentService(
		repositories.NewStudentRepository(deps.DB),
		deps.DB,
	)
}

func newUserService(deps *Dependencies) *services.UserService {
	return services.NewUserService(
		repositories.NewUserRepository(deps.DB),
		deps.DB,
		deps.AuthService,
		deps.EmailService,
	)
}

func newGuardianService(deps *Dependencies) *services.GuardianService {
	return services.NewGuardianService(
		repositories.NewGuardianRepository(deps.DB),
		deps.DB,
	)
}

func newLessonService(deps *Dependencies) *services.LessonService {
	return services.NewLessonService(
		repositories.NewLessonRepository(deps.DB),
		deps.DB,
	)
}

func newTeacherService(deps *Dependencies) *services.TeacherService {
	return services.NewTeacherService(
		repositories.NewTeacherRepository(deps.DB),
		deps.DB,
		deps.AuthService,
	)
}

func newParentService(deps *Dependencies) *services.ParentService {
	return services.NewParentService(
		repositories.NewParentRepository(deps.DB),
		deps.DB,
	)
}

func newSchoolService(deps *Dependencies) *services.SchoolService {
	return services.NewSchoolService(
		repositories.NewSchoolRepository(deps.DB),
		deps.DB,
	)
}

func newUserAssignmentService(deps *Dependencies) *services.UserAssignmentService {
	return services.NewUserAssignmentService(repositories.NewUserAssignmentRepository(deps.DB), deps.DB)
}

func newSubjectService(deps *Dependencies) *services.SubjectService {
	return services.NewSubjectService(
		repositories.NewSubjectRepository(deps.DB),
		deps.DB,
	)
}

func newFeesService(deps *Dependencies) *services.FeesService {
	return services.NewFeesService(repositories.NewFeesRepository(deps.DB), deps.DB, deps.EmailService)
}

func newFinanceService(deps *Dependencies) *services.FinanceService {
	return services.NewFinanceService(repositories.NewFinanceRepository(deps.DB), deps.DB)
}

func newResultService(deps *Dependencies) *services.ResultService {
	return services.NewResultService(
		repositories.NewResultRepository(deps.DB),
		deps.DB,
		deps.EmailService,
	)
}

func newRegistrationService(deps *Dependencies) *services.RegistrationService {
	return services.NewRegistrationService(
		repositories.NewRegistrationRepository(deps.DB),
		deps.DB,
		deps.EmailService,
	)
}

func newReportsService(deps *Dependencies) *services.ReportsService {
	return services.NewReportsService(repositories.NewReportsRepository(deps.DB))
}

// SetupRoutes configures all application routes
func SetupRoutes(r *gin.Engine, deps *Dependencies) {
	v1 := r.Group("/api/v1")

	// Public routes (health, setup, password reset)
	setupPublicRoutes(r, deps)

	// Auth routes
	setupAuthRoutes(v1, deps)

	// Protected routes
	setupProtectedRoutes(v1, deps)
}

func newInventoryService(deps *Dependencies) *services.InventoryService {
	repo := repositories.NewInventoryRepository(deps.DB)
	return services.NewInventoryService(repo)
}

func newLibraryService(deps *Dependencies) *services.LibraryService {
	return services.NewLibraryService(repositories.NewLibraryRepository(deps.DB), deps.DB)
}

func newClinicService(deps *Dependencies) *services.ClinicService {
	return services.NewClinicService(deps.DB, deps.EmailService)
}

func newPayrollService(deps *Dependencies) *services.PayrollService {
	return services.NewPayrollService(repositories.NewPayrollRepository(deps.DB), deps.DB)
}

func newBulkMarksImportService(deps *Dependencies) *services.BulkMarksImportService {
	// Initialize ResultService for grade calculation
	resultRepo := repositories.NewResultRepository(deps.DB)
	resultService := services.NewResultService(resultRepo, deps.DB, deps.EmailService)
	
	return services.NewBulkMarksImportService(
		repositories.NewBulkMarksImportRepository(deps.DB),
		resultService,
	)
}

func newBulkImportXLSXService(deps *Dependencies) *services.BulkImportXLSXService {
	return services.NewBulkImportXLSXService(repositories.NewBulkImportXLSXRepository(deps.DB), deps.DB)
}

func newMarksImportService(deps *Dependencies) *services.MarksImportService {
	return services.NewMarksImportService(repositories.NewMarksImportRepository(deps.DB))
}

func newStudentExportService(deps *Dependencies) *services.StudentExportService {
	return services.NewStudentExportService(repositories.NewStudentExportRepository(deps.DB))
}

func newTeacherExportService(deps *Dependencies) *services.TeacherExportService {
	return services.NewTeacherExportService(repositories.NewTeacherExportRepository(deps.DB))
}

func newAuditService(deps *Dependencies) *services.AuditService {
	return services.NewAuditService(repositories.NewAuditRepository(deps.DB))
}

func newUserNotificationService(deps *Dependencies) *services.UserNotificationService {
	return services.NewUserNotificationService(repositories.NewUserNotificationRepository(deps.DB))
}

func newWebVitalsService(deps *Dependencies) *services.WebVitalsService {
	return services.NewWebVitalsService(repositories.NewWebVitalsRepository(deps.DB))
}

func newStandardFeeTypeService(deps *Dependencies) *services.StandardFeeTypeService {
	return services.NewStandardFeeTypeService(deps.DB)
}

func newPasswordResetService(deps *Dependencies) *services.PasswordResetService {
	return services.NewPasswordResetService(
		repositories.NewPasswordResetRepository(deps.DB),
		deps.EmailService,
		deps.AuthService,
	)
}

func newIntegrationActivityService(deps *Dependencies) *services.IntegrationActivityService {
	return services.NewIntegrationActivityService(repositories.NewIntegrationActivityRepository(deps.DB))
}

func newPaymentConfigService(deps *Dependencies) *services.PaymentConfigService {
	return services.NewPaymentConfigService(repositories.NewPaymentConfigRepository(deps.DB))
}

func newSettingsService(deps *Dependencies) *services.SettingsService {
	return services.NewSettingsService(repositories.NewSettingsRepository(deps.DB))
}

func newSystemReportsService(deps *Dependencies) *services.SystemReportsService {
	return services.NewSystemReportsService(repositories.NewSystemReportsRepository(deps.DB))
}

func newAnalyticsService(deps *Dependencies) *services.AnalyticsService {
	return services.NewAnalyticsService(deps.DB)
}

// Phase 3 refactored services

func newBulkExamMarksImportService(deps *Dependencies) *services.BulkExamMarksImportService {
	return services.NewBulkExamMarksImportService(
		repositories.NewBulkExamMarksImportRepository(deps.DB),
		services.NewGradeCalculationService(deps.DB),
	)
}

func newBulkAOIMarksImportService(deps *Dependencies) *services.BulkAOIMarksImportService {
	return services.NewBulkAOIMarksImportService(
		repositories.NewBulkAOIMarksImportRepository(deps.DB),
		services.NewGradeCalculationService(deps.DB),
	)
}

func newMarksExportService(deps *Dependencies) *services.MarksExportService {
	return services.NewMarksExportService(repositories.NewMarksExportRepository(deps.DB))
}

func newBudgetRequisitionService(deps *Dependencies) *services.BudgetRequisitionService {
	return services.NewBudgetRequisitionService(
		repositories.NewBudgetRepository(deps.DB),
		deps.EmailService,
		deps.DB,
	)
}

func newClassRankingService(deps *Dependencies) *services.ClassRankingService {
	return services.NewClassRankingService(repositories.NewClassRankingRepository(deps.DB))
}
