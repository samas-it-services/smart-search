#!/bin/bash

# @samas/smart-search - GitHub Package Publisher
# Publishes the Smart Search library to the GitHub npm repository

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}
print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}
print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}
print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}
print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}
print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} ${CYAN}📦 Smart Search GitHub Package Publisher${NC} ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Global variables
PACKAGE_JSON="$PROJECT_ROOT/package.json"
CURRENT_VERSION=""
NEW_VERSION=""
VERSION_TYPE=""
DRY_RUN=false
SKIP_TESTS=false

# Function to show usage
show_usage() {
    echo "Usage: $0 <version-type> [--dry-run] [--skip-tests]"
    echo ""
    echo "Version Types: patch, minor, major"
    echo ""
    echo "Options:"
    echo "  --dry-run       - Test run without publishing"
    echo "  --skip-tests    - Skip test execution"
    echo ""
}

# Function to parse arguments
parse_arguments() {
    if [ -z "$1" ]; then
        print_error "Version type (patch, minor, major) is required."
        show_usage
        exit 1
    fi
    VERSION_TYPE=$1
    shift
    while (( "$#" )); do
        case "$1" in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            *)
                print_error "Unsupported flag $1"
                exit 1
                ;;
        esac
    done
}

# Function to log in to GitHub npm registry
login_to_github() {
    print_step "Logging in to GitHub npm registry..."
    if [ -z "$NPM_TOKEN" ]; then
        print_error "NPM_TOKEN environment variable is not set."
        print_status "Please set it to your GitHub personal access token with 'write:packages' scope."
        exit 1
    fi
    echo "//npm.pkg.github.com/:_authToken=\${NPM_TOKEN}" > ~/.npmrc
    print_success "Logged in to GitHub npm registry."
}

# Function to get current version
get_current_version() {
    CURRENT_VERSION=$(node -p "require('$PACKAGE_JSON').version")
    print_status "Current version: $CURRENT_VERSION"
}

# Function to calculate new version
calculate_new_version() {
    NEW_VERSION=$(npm version --no-git-tag-version $VERSION_TYPE)
    NEW_VERSION=${NEW_VERSION#v}
    print_status "New version will be: $NEW_VERSION"
}

# Function to run tests and build
run_tests_and_build() {
    if [ "$SKIP_TESTS" = true ]; then
        print_warning "Skipping tests..."
    else
        print_step "Running tests..."
        npm run test:unit
    fi
    print_step "Building the package..."
    npm run build
    print_success "Build complete."
}

# Function to publish to GitHub
publish_to_github() {
    print_step "Publishing to GitHub npm registry..."
    if [ "$DRY_RUN" = true ]; then
        print_warning "Dry run: Skipping actual publish."
        npm publish --dry-run
    else
        npm publish
        print_success "Package published to GitHub successfully!"
    fi
}

# Function to create and push git tag
push_git_tag() {
    print_step "Creating and pushing git tag..."
    if [ "$DRY_RUN" = true ]; then
        print_warning "Dry run: Skipping git tag and push."
    else
        git tag "v$NEW_VERSION"
        git push origin "v$NEW_VERSION"
        print_success "Git tag v$NEW_VERSION pushed."
    fi
}

# Main execution
main() {
    parse_arguments "$@"
    print_header
    login_to_github
    get_current_version
    calculate_new_version
    run_tests_and_build
    publish_to_github
    push_git_tag
    print_success "All done!"
}

main "$@"
