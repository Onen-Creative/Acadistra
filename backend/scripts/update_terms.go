package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	godotenv.Load("../.env")

	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		host := os.Getenv("DB_HOST")
		if host == "" {
			host = "localhost"
		}
		port := os.Getenv("DB_PORT")
		if port == "" {
			port = "5432"
		}
		user := os.Getenv("DB_USER")
		if user == "" {
			user = "postgres"
		}
		password := os.Getenv("DB_PASSWORD")
		if password == "" {
			password = "postgres"
		}
		dbname := os.Getenv("DB_NAME")
		if dbname == "" {
			dbname = "school_system_db"
		}
		dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable", host, user, password, dbname, port)
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Check current term values in classes
	var classes []struct {
		ID   string
		Name string
		Term string
		Year int
	}
	db.Raw("SELECT id, name, term, year FROM classes LIMIT 5").Scan(&classes)
	
	fmt.Println("Current classes:")
	for _, c := range classes {
		fmt.Printf("  %s - %s (Term: '%s', Year: %d)\n", c.Name, c.ID, c.Term, c.Year)
	}

	// Check students
	var studentCount int64
	db.Raw("SELECT COUNT(*) FROM students WHERE status = 'active'").Scan(&studentCount)
	fmt.Printf("\nTotal active students: %d\n", studentCount)

	// Check enrollments
	var enrollmentCount int64
	db.Raw("SELECT COUNT(*) FROM enrollments WHERE status = 'active'").Scan(&enrollmentCount)
	fmt.Printf("Total active enrollments: %d\n", enrollmentCount)

	// Update terms if needed
	fmt.Println("\nUpdating term format...")
	db.Exec("UPDATE classes SET term = 'Term 1' WHERE term = '1'")
	db.Exec("UPDATE classes SET term = 'Term 2' WHERE term = '2'")
	db.Exec("UPDATE classes SET term = 'Term 3' WHERE term = '3'")
	
	db.Exec("UPDATE students SET term = 'Term 1' WHERE term = '1'")
	db.Exec("UPDATE students SET term = 'Term 2' WHERE term = '2'")
	db.Exec("UPDATE students SET term = 'Term 3' WHERE term = '3'")
	
	db.Exec("UPDATE enrollments SET term = 'Term 1' WHERE term = '1'")
	db.Exec("UPDATE enrollments SET term = 'Term 2' WHERE term = '2'")
	db.Exec("UPDATE enrollments SET term = 'Term 3' WHERE term = '3'")

	fmt.Println("Term format updated!")

	// Check again
	db.Raw("SELECT id, name, term, year FROM classes LIMIT 5").Scan(&classes)
	fmt.Println("\nUpdated classes:")
	for _, c := range classes {
		fmt.Printf("  %s - %s (Term: '%s', Year: %d)\n", c.Name, c.ID, c.Term, c.Year)
	}
}
