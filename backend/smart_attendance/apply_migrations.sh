#!/bin/bash
# Migration helper script for Smart Attendance System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Smart Attendance System Database Migration ===${NC}\n"

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    echo -e "${RED}Error: manage.py not found!${NC}"
    echo "Please run this script from the backend/smart_attendance directory"
    exit 1
fi

# Check virtual environment
VENV="../venv310/bin/activate"
if [ ! -f "$VENV" ]; then
    echo -e "${RED}Error: Virtual environment not found at $VENV${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found virtual environment${NC}"

# Activate virtual environment
source "$VENV"
echo -e "${GREEN}✓ Virtual environment activated${NC}\n"

# Run migrations
echo -e "${YELLOW}Step 1: Making migrations...${NC}"
python manage.py makemigrations attendance
echo -e "${GREEN}✓ Migrations created${NC}\n"

echo -e "${YELLOW}Step 2: Running migrations...${NC}"
python manage.py migrate attendance
echo -e "${GREEN}✓ Migrations applied${NC}\n"

echo -e "${YELLOW}Step 3: Verifying migration status...${NC}"
python manage.py showmigrations attendance
echo -e "${GREEN}✓ Migration status verified${NC}\n"

echo -e "${GREEN}=== Migration completed successfully! ===${NC}"
echo -e "\nNext steps:"
echo "1. Test the attendance edit functionality"
echo "2. Verify student information can be updated"
echo "3. Check attendance status calculations (on_time/late)"
echo ""
echo "If you encounter any issues, you can rollback with:"
echo "  python manage.py migrate attendance 0001_initial"
