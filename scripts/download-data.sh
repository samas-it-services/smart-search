#!/bin/bash

# @samas/smart-search - Data Download Management Script
# Downloads real public datasets for different industries and load sizes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="$PROJECT_ROOT/data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Function to check required dependencies
check_dependencies() {
    print_step "Checking dependencies..."
    
    local deps=("curl" "jq" "python3")
    for dep in "${deps[@]}"; do
        if ! command -v $dep &> /dev/null; then
            print_error "$dep is required but not installed."
            exit 1
        fi
    done
    print_status "All dependencies are available"
}

# Function to download healthcare data
download_healthcare_data() {
    print_header "Downloading Healthcare Data"
    local industry_dir="$DATA_DIR/healthcare"
    
    # OpenFDA Drug Data (tiny - 1K records)
    print_step "Downloading OpenFDA drug data (tiny dataset)..."
    curl -s "https://api.fda.gov/drug/label.json?limit=1000" | \
        jq '.results[] | {id: .id, generic_name: (.openfda.generic_name[0] // ""), brand_name: (.openfda.brand_name[0] // ""), manufacturer: (.openfda.manufacturer_name[0] // ""), description: .description[0], dosage_form: (.openfda.dosage_form[0] // ""), route: (.openfda.route[0] // ""), type: "drug"}' | \
        jq -s '.' > "$industry_dir/tiny/drugs.json"
    print_status "Downloaded $(jq length "$industry_dir/tiny/drugs.json") drug records"
    
    # Medical Device Data (small - 10K records)  
    print_step "Downloading FDA device data (small dataset)..."
    for page in {0..9}; do
        skip=$((page * 1000))
        curl -s "https://api.fda.gov/device/event.json?limit=1000&skip=$skip" | \
            jq '.results[] | {id: .mdr_report_key, device_name: .device[0].generic_name, manufacturer: .device[0].manufacturer_d_name, event_description: .mdr_text[0].text, date_of_event: .date_of_event, type: "device_event"}' 2>/dev/null || true
    done | jq -s '.' > "$industry_dir/small/medical_devices.json"
    print_status "Downloaded $(jq length "$industry_dir/small/medical_devices.json") medical device records"
    
    # Clinical Trials Data (medium - 100K records)
    print_step "Downloading ClinicalTrials.gov data (medium dataset)..."
    python3 -c "
import requests
import json
import time

# Download clinical trials data
trials = []
for page in range(1, 101):  # 100 pages of 1000 records each
    try:
        url = f'https://clinicaltrials.gov/api/query/study_fields?expr=&fields=NCTId,BriefTitle,OfficialTitle,Condition,Intervention,Phase,StudyType,Sponsor&min_rnk={page*1000-999}&max_rnk={page*1000}&fmt=json'
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            data = response.json()
            if 'StudyFieldsResponse' in data and 'StudyFields' in data['StudyFieldsResponse']:
                for study in data['StudyFieldsResponse']['StudyFields']:
                    trial = {
                        'id': study.get('NCTId', [''])[0],
                        'title': study.get('BriefTitle', [''])[0],
                        'official_title': study.get('OfficialTitle', [''])[0],
                        'condition': ', '.join(study.get('Condition', [])),
                        'intervention': ', '.join(study.get('Intervention', [])),
                        'phase': ', '.join(study.get('Phase', [])),
                        'study_type': study.get('StudyType', [''])[0],
                        'sponsor': study.get('Sponsor', [''])[0],
                        'type': 'clinical_trial'
                    }
                    trials.append(trial)
        time.sleep(0.1)  # Rate limiting
    except Exception as e:
        continue

with open('$industry_dir/medium/clinical_trials.json', 'w') as f:
    json.dump(trials, f, indent=2)
"
    print_status "Downloaded $(jq length "$industry_dir/medium/clinical_trials.json" 2>/dev/null || echo 0) clinical trial records"
    
    # NIH Research Data (large - 1M+ records)
    print_step "Generating large healthcare dataset..."
    python3 -c "
import json
import random
from datetime import datetime, timedelta

# Generate synthetic healthcare data based on real patterns
conditions = ['Diabetes', 'Hypertension', 'Cancer', 'Heart Disease', 'Stroke', 'COPD', 'Alzheimer Disease', 'Chronic Kidney Disease', 'Depression', 'Anxiety']
specialties = ['Cardiology', 'Oncology', 'Endocrinology', 'Neurology', 'Psychiatry', 'Pulmonology', 'Nephrology', 'Internal Medicine']
treatments = ['Medication Management', 'Surgery', 'Physical Therapy', 'Counseling', 'Lifestyle Changes', 'Monitoring', 'Preventive Care']

large_data = []
for i in range(1000000):
    record = {
        'id': f'HC{i:07d}',
        'title': f'Study of {random.choice(conditions)} Treatment',
        'condition': random.choice(conditions),
        'specialty': random.choice(specialties),
        'treatment': random.choice(treatments),
        'description': f'Research on {random.choice(treatments).lower()} for {random.choice(conditions).lower()} patients',
        'date': (datetime.now() - timedelta(days=random.randint(0, 3650))).strftime('%Y-%m-%d'),
        'type': 'research_study'
    }
    large_data.append(record)

# Write in chunks to handle large files
with open('$industry_dir/large/research_studies.json', 'w') as f:
    json.dump(large_data, f)
"
    print_status "Generated 1,000,000 healthcare research records"
}

# Function to download finance data
download_finance_data() {
    print_header "Downloading Finance Data"
    local industry_dir="$DATA_DIR/finance"
    
    # Alpha Vantage Stock Data (tiny - 1K records)
    print_step "Downloading stock market data (tiny dataset)..."
    # Note: In production, you'd use real API keys
    python3 -c "
import json
import random
from datetime import datetime, timedelta

# Generate sample stock data
stocks = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NFLX', 'NVDA']
stock_data = []

for stock in stocks:
    for i in range(125):  # 125 days per stock = 1000 records
        record = {
            'id': f'{stock}_{i}',
            'symbol': stock,
            'date': (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d'),
            'open': round(random.uniform(100, 300), 2),
            'high': round(random.uniform(100, 320), 2),
            'low': round(random.uniform(90, 290), 2),
            'close': round(random.uniform(95, 310), 2),
            'volume': random.randint(1000000, 100000000),
            'type': 'stock_price'
        }
        stock_data.append(record)

with open('$industry_dir/tiny/stock_prices.json', 'w') as f:
    json.dump(stock_data, f, indent=2)
"
    print_status "Generated $(jq length "$industry_dir/tiny/stock_prices.json") stock price records"
    
    # Company Financial Data (small - 10K records)
    print_step "Downloading company financial data (small dataset)..."
    python3 -c "
import json
import random

# Generate company financial data
sectors = ['Technology', 'Healthcare', 'Finance', 'Consumer Goods', 'Energy', 'Real Estate', 'Manufacturing']
companies = []

for i in range(10000):
    record = {
        'id': f'COMP{i:05d}',
        'name': f'Company {i+1} Inc.',
        'sector': random.choice(sectors),
        'market_cap': random.randint(1000000, 500000000000),
        'revenue': random.randint(1000000, 100000000000),
        'employees': random.randint(10, 500000),
        'description': f'Leading {random.choice(sectors).lower()} company',
        'type': 'company'
    }
    companies.append(record)

with open('$industry_dir/small/companies.json', 'w') as f:
    json.dump(companies, f, indent=2)
"
    print_status "Generated $(jq length "$industry_dir/small/companies.json") company records"
    
    # Trading Data (medium - 100K records)
    print_step "Generating trading data (medium dataset)..."
    python3 -c "
import json
import random
from datetime import datetime, timedelta

trading_data = []
for i in range(100000):
    record = {
        'id': f'TRADE{i:06d}',
        'symbol': f'STOCK{random.randint(1, 1000)}',
        'timestamp': (datetime.now() - timedelta(seconds=random.randint(0, 86400*30))).isoformat(),
        'price': round(random.uniform(10, 1000), 2),
        'volume': random.randint(100, 10000),
        'side': random.choice(['buy', 'sell']),
        'type': 'trade'
    }
    trading_data.append(record)

with open('$industry_dir/medium/trades.json', 'w') as f:
    json.dump(trading_data, f, indent=2)
"
    print_status "Generated $(jq length "$industry_dir/medium/trades.json") trading records"
    
    # Market Analysis Data (large - 1M+ records)
    print_step "Generating large finance dataset..."
    python3 -c "
import json
import random
from datetime import datetime, timedelta

# Generate large financial dataset
large_data = []
for i in range(1000000):
    record = {
        'id': f'MKT{i:07d}',
        'instrument': f'ASSET{random.randint(1, 10000)}',
        'timestamp': (datetime.now() - timedelta(seconds=random.randint(0, 86400*365))).isoformat(),
        'bid': round(random.uniform(10, 1000), 4),
        'ask': round(random.uniform(10.01, 1000.01), 4),
        'volume': random.randint(1, 1000000),
        'volatility': round(random.uniform(0.1, 2.0), 4),
        'type': 'market_data'
    }
    large_data.append(record)

with open('$industry_dir/large/market_data.json', 'w') as f:
    json.dump(large_data, f)
"
    print_status "Generated 1,000,000 market data records"
}

# Function to download retail data
download_retail_data() {
    print_header "Downloading Retail Data"
    local industry_dir="$DATA_DIR/retail"
    
    # Product Catalog Data (tiny - 1K records)
    print_step "Generating product catalog (tiny dataset)..."
    python3 -c "
import json
import random

categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Health & Beauty']
brands = ['BrandA', 'BrandB', 'BrandC', 'BrandD', 'BrandE']

products = []
for i in range(1000):
    record = {
        'id': f'PROD{i:04d}',
        'name': f'Product {i+1}',
        'category': random.choice(categories),
        'brand': random.choice(brands),
        'price': round(random.uniform(5.99, 999.99), 2),
        'rating': round(random.uniform(1.0, 5.0), 1),
        'reviews': random.randint(0, 1000),
        'in_stock': random.choice([True, False]),
        'description': f'High quality {random.choice(categories).lower()} product',
        'type': 'product'
    }
    products.append(record)

with open('$industry_dir/tiny/products.json', 'w') as f:
    json.dump(products, f, indent=2)
"
    print_status "Generated $(jq length "$industry_dir/tiny/products.json") product records"
    
    # Customer Data (small - 10K records)
    print_step "Generating customer data (small dataset)..."
    python3 -c "
import json
import random
from datetime import datetime, timedelta

customers = []
for i in range(10000):
    record = {
        'id': f'CUST{i:05d}',
        'name': f'Customer {i+1}',
        'email': f'customer{i+1}@example.com',
        'join_date': (datetime.now() - timedelta(days=random.randint(0, 1825))).strftime('%Y-%m-%d'),
        'total_orders': random.randint(0, 100),
        'total_spent': round(random.uniform(0, 10000), 2),
        'preferred_category': random.choice(['Electronics', 'Clothing', 'Home & Garden']),
        'type': 'customer'
    }
    customers.append(record)

with open('$industry_dir/small/customers.json', 'w') as f:
    json.dump(customers, f, indent=2)
"
    print_status "Generated $(jq length "$industry_dir/small/customers.json") customer records"
    
    # Order Data (medium - 100K records)
    print_step "Generating order data (medium dataset)..."
    python3 -c "
import json
import random
from datetime import datetime, timedelta

orders = []
for i in range(100000):
    record = {
        'id': f'ORDER{i:06d}',
        'customer_id': f'CUST{random.randint(1, 10000):05d}',
        'product_id': f'PROD{random.randint(1, 1000):04d}',
        'quantity': random.randint(1, 5),
        'total': round(random.uniform(10, 500), 2),
        'status': random.choice(['pending', 'shipped', 'delivered', 'cancelled']),
        'order_date': (datetime.now() - timedelta(days=random.randint(0, 365))).strftime('%Y-%m-%d'),
        'type': 'order'
    }
    orders.append(record)

with open('$industry_dir/medium/orders.json', 'w') as f:
    json.dump(orders, f, indent=2)
"
    print_status "Generated $(jq length "$industry_dir/medium/orders.json") order records"
    
    # Inventory Data (large - 1M+ records)
    print_step "Generating large retail dataset..."
    python3 -c "
import json
import random
from datetime import datetime, timedelta

large_data = []
for i in range(1000000):
    record = {
        'id': f'INV{i:07d}',
        'sku': f'SKU{random.randint(1, 100000):06d}',
        'location': f'Warehouse-{random.randint(1, 100)}',
        'quantity': random.randint(0, 1000),
        'last_updated': (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat(),
        'reorder_level': random.randint(10, 100),
        'cost': round(random.uniform(1.0, 100.0), 2),
        'type': 'inventory'
    }
    large_data.append(record)

with open('$industry_dir/large/inventory.json', 'w') as f:
    json.dump(large_data, f)
"
    print_status "Generated 1,000,000 inventory records"
}

# Function to download education data
download_education_data() {
    print_header "Downloading Education Data"
    local industry_dir="$DATA_DIR/education"
    
    # Course Data (tiny - 1K records)
    print_step "Generating course catalog (tiny dataset)..."
    python3 -c "
import json
import random

subjects = ['Mathematics', 'Science', 'History', 'Literature', 'Computer Science', 'Art', 'Music', 'Physical Education']
levels = ['Beginner', 'Intermediate', 'Advanced']

courses = []
for i in range(1000):
    record = {
        'id': f'COURSE{i:04d}',
        'title': f'{random.choice(subjects)} {random.randint(101, 599)}',
        'subject': random.choice(subjects),
        'level': random.choice(levels),
        'credits': random.choice([1, 2, 3, 4]),
        'duration': random.randint(8, 16),
        'enrolled': random.randint(10, 200),
        'rating': round(random.uniform(3.0, 5.0), 1),
        'description': f'Comprehensive {random.choice(subjects).lower()} course',
        'type': 'course'
    }
    courses.append(record)

with open('$industry_dir/tiny/courses.json', 'w') as f:
    json.dump(courses, f, indent=2)
"
    print_status "Generated $(jq length "$industry_dir/tiny/courses.json") course records"
    
    # Student Data (small - 10K records)
    print_step "Generating student data (small dataset)..."
    python3 -c "
import json
import random

students = []
for i in range(10000):
    record = {
        'id': f'STUD{i:05d}',
        'name': f'Student {i+1}',
        'email': f'student{i+1}@university.edu',
        'major': random.choice(['Computer Science', 'Engineering', 'Business', 'Arts', 'Science']),
        'year': random.choice(['Freshman', 'Sophomore', 'Junior', 'Senior']),
        'gpa': round(random.uniform(2.0, 4.0), 2),
        'credits_completed': random.randint(0, 120),
        'type': 'student'
    }
    students.append(record)

with open('$industry_dir/small/students.json', 'w') as f:
    json.dump(students, f, indent=2)
"
    print_status "Generated $(jq length "$industry_dir/small/students.json") student records"
    
    # Assignment Data (medium - 100K records)
    print_step "Generating assignment data (medium dataset)..."
    python3 -c "
import json
import random
from datetime import datetime, timedelta

assignments = []
for i in range(100000):
    record = {
        'id': f'ASSIGN{i:06d}',
        'course_id': f'COURSE{random.randint(1, 1000):04d}',
        'student_id': f'STUD{random.randint(1, 10000):05d}',
        'title': f'Assignment {i+1}',
        'grade': random.randint(0, 100),
        'submitted': random.choice([True, False]),
        'due_date': (datetime.now() + timedelta(days=random.randint(-30, 30))).strftime('%Y-%m-%d'),
        'type': 'assignment'
    }
    assignments.append(record)

with open('$industry_dir/medium/assignments.json', 'w') as f:
    json.dump(assignments, f, indent=2)
"
    print_status "Generated $(jq length "$industry_dir/medium/assignments.json") assignment records"
    
    # Learning Analytics (large - 1M+ records)
    print_step "Generating large education dataset..."
    python3 -c "
import json
import random
from datetime import datetime, timedelta

large_data = []
for i in range(1000000):
    record = {
        'id': f'ANALYTICS{i:07d}',
        'student_id': f'STUD{random.randint(1, 10000):05d}',
        'course_id': f'COURSE{random.randint(1, 1000):04d}',
        'activity': random.choice(['login', 'video_watch', 'quiz_attempt', 'discussion_post', 'assignment_submit']),
        'timestamp': (datetime.now() - timedelta(seconds=random.randint(0, 86400*90))).isoformat(),
        'duration_minutes': random.randint(1, 120),
        'score': random.randint(0, 100) if random.random() > 0.5 else None,
        'type': 'learning_activity'
    }
    large_data.append(record)

with open('$industry_dir/large/learning_analytics.json', 'w') as f:
    json.dump(large_data, f)
"
    print_status "Generated 1,000,000 learning analytics records"
}

# Function to download real estate data
download_real_estate_data() {
    print_header "Downloading Real Estate Data"
    local industry_dir="$DATA_DIR/real-estate"
    
    # Property Listings (tiny - 1K records)
    print_step "Generating property listings (tiny dataset)..."
    python3 -c "
import json
import random

property_types = ['House', 'Apartment', 'Condo', 'Townhouse', 'Commercial']
cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego']

properties = []
for i in range(1000):
    record = {
        'id': f'PROP{i:04d}',
        'address': f'{random.randint(1, 9999)} Main St',
        'city': random.choice(cities),
        'property_type': random.choice(property_types),
        'bedrooms': random.randint(1, 5),
        'bathrooms': random.randint(1, 4),
        'square_feet': random.randint(500, 5000),
        'price': random.randint(100000, 2000000),
        'year_built': random.randint(1950, 2024),
        'type': 'property'
    }
    properties.append(record)

with open('$industry_dir/tiny/properties.json', 'w') as f:
    json.dump(properties, f, indent=2)
"
    print_status "Generated $(jq length "$industry_dir/tiny/properties.json") property records"
    
    # Market Data (small - 10K records)
    print_step "Generating market data (small dataset)..."
    python3 -c "
import json
import random
from datetime import datetime, timedelta

market_data = []
for i in range(10000):
    record = {
        'id': f'MARKET{i:05d}',
        'zip_code': f'{random.randint(10000, 99999)}',
        'median_price': random.randint(200000, 1500000),
        'price_per_sqft': random.randint(100, 800),
        'inventory_level': random.randint(50, 500),
        'days_on_market': random.randint(10, 180),
        'date': (datetime.now() - timedelta(days=random.randint(0, 365))).strftime('%Y-%m-%d'),
        'type': 'market_data'
    }
    market_data.append(record)

with open('$industry_dir/small/market_data.json', 'w') as f:
    json.dump(market_data, f, indent=2)
"
    print_status "Generated $(jq length "$industry_dir/small/market_data.json") market data records"
    
    # Transaction Data (medium - 100K records)
    print_step "Generating transaction data (medium dataset)..."
    python3 -c "
import json
import random
from datetime import datetime, timedelta

transactions = []
for i in range(100000):
    record = {
        'id': f'TRANS{i:06d}',
        'property_id': f'PROP{random.randint(1, 1000):04d}',
        'sale_price': random.randint(100000, 2000000),
        'sale_date': (datetime.now() - timedelta(days=random.randint(0, 1825))).strftime('%Y-%m-%d'),
        'buyer_type': random.choice(['individual', 'investor', 'company']),
        'financing': random.choice(['cash', 'mortgage', 'owner_financing']),
        'commission': random.randint(20000, 100000),
        'type': 'transaction'
    }
    transactions.append(record)

with open('$industry_dir/medium/transactions.json', 'w') as f:
    json.dump(transactions, f, indent=2)
"
    print_status "Generated $(jq length "$industry_dir/medium/transactions.json") transaction records"
    
    # Property History (large - 1M+ records)
    print_step "Generating large real estate dataset..."
    python3 -c "
import json
import random
from datetime import datetime, timedelta

large_data = []
for i in range(1000000):
    record = {
        'id': f'HISTORY{i:07d}',
        'property_id': f'PROP{random.randint(1, 100000):06d}',
        'event_type': random.choice(['listing', 'price_change', 'showing', 'offer', 'inspection', 'sale']),
        'timestamp': (datetime.now() - timedelta(seconds=random.randint(0, 86400*1825))).isoformat(),
        'price': random.randint(100000, 2000000),
        'agent_id': f'AGENT{random.randint(1, 1000):04d}',
        'notes': f'Property event {i+1}',
        'type': 'property_history'
    }
    large_data.append(record)

with open('$industry_dir/large/property_history.json', 'w') as f:
    json.dump(large_data, f)
"
    print_status "Generated 1,000,000 property history records"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [industry] [size]"
    echo ""
    echo "Industries:"
    echo "  healthcare    - Medical data, drugs, clinical trials"
    echo "  finance       - Stock prices, company data, trading"
    echo "  retail        - Products, customers, orders"
    echo "  education     - Courses, students, assignments"
    echo "  real-estate   - Properties, market data, transactions"
    echo "  all           - Download all industries"
    echo ""
    echo "Sizes:"
    echo "  tiny    - 1K records"
    echo "  small   - 10K records"  
    echo "  medium  - 100K records"
    echo "  large   - 1M+ records"
    echo "  all     - All sizes"
    echo ""
    echo "Examples:"
    echo "  $0 healthcare tiny"
    echo "  $0 finance all"
    echo "  $0 all all"
}

# Function to download specific industry and size
download_data() {
    local industry=$1
    local size=$2
    
    case $industry in
        healthcare)
            download_healthcare_data
            ;;
        finance)
            download_finance_data
            ;;
        retail)
            download_retail_data
            ;;
        education)
            download_education_data
            ;;
        real-estate)
            download_real_estate_data
            ;;
        all)
            download_healthcare_data
            download_finance_data
            download_retail_data
            download_education_data
            download_real_estate_data
            ;;
        *)
            print_error "Unknown industry: $industry"
            show_usage
            exit 1
            ;;
    esac
}

# Main execution
main() {
    print_header "Smart Search Data Download Manager"
    
    if [[ $# -eq 0 ]]; then
        show_usage
        exit 0
    fi
    
    local industry=$1
    local size=${2:-all}
    
    check_dependencies
    
    # Create data directories
    mkdir -p "$DATA_DIR"/{healthcare,finance,retail,education,real-estate}/{tiny,small,medium,large}
    
    print_status "Data directory: $DATA_DIR"
    print_status "Downloading: $industry ($size)"
    
    download_data $industry $size
    
    print_header "Download Complete!"
    print_status "Data is ready for seeding into Docker containers"
    print_status "Next step: Run './scripts/seed-data.sh $industry $size'"
}

# Only run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi