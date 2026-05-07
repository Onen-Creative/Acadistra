#!/bin/bash

# Script to generate service files for all repositories
# This creates wrapper services that match repository interfaces

cd "$(dirname "$0")/.."

echo "Generating services for all repositories..."

# List of repositories (excluding base)
REPOS=(
    "announcement"
    "attendance"
    "audit"
    "budget"
    "enrollment"
    "guardian"
    "inventory"
    "library"
    "notification"
    "school"
    "settings"
    "staff"
    "subject"
    "subject_result"
    "term_dates"
    "user"
)

for repo in "${REPOS[@]}"; do
    SERVICE_FILE="internal/services/${repo}_service_new.go"
    
    # Capitalize first letter for type names
    REPO_TITLE=$(echo "$repo" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2));}1' | sed 's/ //g')
    
    echo "Creating $SERVICE_FILE..."
    
    cat > "$SERVICE_FILE" << EOF
package services

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/repositories"
)

type ${REPO_TITLE}Service struct {
	${repo}Repo repositories.${REPO_TITLE}Repository
}

func New${REPO_TITLE}Service(${repo}Repo repositories.${REPO_TITLE}Repository) *${REPO_TITLE}Service {
	return &${REPO_TITLE}Service{
		${repo}Repo: ${repo}Repo,
	}
}

// Service methods wrap repository methods
// Add business logic here as needed

func (s *${REPO_TITLE}Service) Create(entity interface{}) error {
	return s.${repo}Repo.Create(entity)
}

func (s *${REPO_TITLE}Service) Update(id uuid.UUID, entity interface{}) error {
	return s.${repo}Repo.Update(id, entity)
}

func (s *${REPO_TITLE}Service) Delete(id uuid.UUID) error {
	return s.${repo}Repo.Delete(id)
}

func (s *${REPO_TITLE}Service) FindByID(id uuid.UUID, dest interface{}) error {
	return s.${repo}Repo.FindByID(id, dest)
}

// Add repository-specific methods as needed
EOF

    echo "✓ Created $SERVICE_FILE"
done

echo ""
echo "✅ All services generated successfully!"
echo ""
echo "Note: These are basic wrappers. Add business logic and repository-specific methods as needed."
