package repositories

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BaseRepository defines common database operations
type BaseRepository interface {
	Create(entity interface{}) error
	Update(entity interface{}) error
	Delete(id uuid.UUID) error
	FindByID(id uuid.UUID, entity interface{}) error
	FindAll(entities interface{}, conditions ...interface{}) error
	Count(model interface{}, conditions ...interface{}) (int64, error)
}

// baseRepository implements BaseRepository
type baseRepository struct {
	db *gorm.DB
}

// NewBaseRepository creates a new base repository
func NewBaseRepository(db *gorm.DB) BaseRepository {
	return &baseRepository{db: db}
}

func (r *baseRepository) Create(entity interface{}) error {
	return r.db.Create(entity).Error
}

func (r *baseRepository) Update(entity interface{}) error {
	return r.db.Save(entity).Error
}

func (r *baseRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(id).Error
}

func (r *baseRepository) FindByID(id uuid.UUID, entity interface{}) error {
	return r.db.First(entity, "id = ?", id).Error
}

func (r *baseRepository) FindAll(entities interface{}, conditions ...interface{}) error {
	query := r.db
	if len(conditions) > 0 {
		query = query.Where(conditions[0], conditions[1:]...)
	}
	return query.Find(entities).Error
}

func (r *baseRepository) Count(model interface{}, conditions ...interface{}) (int64, error) {
	var count int64
	query := r.db.Model(model)
	if len(conditions) > 0 {
		query = query.Where(conditions[0], conditions[1:]...)
	}
	err := query.Count(&count).Error
	return count, err
}
