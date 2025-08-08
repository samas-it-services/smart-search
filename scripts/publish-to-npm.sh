#!/bin/bash

# @samas/smart-search - NPM Package Publisher
# Comprehensive script to safely publish the Smart Search library to NPM

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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
    echo -e "${BLUE}║${NC} ${CYAN}📦 Smart Search NPM Package Publisher${NC} ${BLUE}║${NC}"
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
FORCE_PUBLISH=false

# Function to show usage
show_usage() {
    echo "Usage: $0 <version-type> [options]"
    echo ""
    echo "Version Types:"
    echo "  patch    - Bug fixes (1.0.0 → 1.0.1)"
    echo "  minor    - New features (1.0.0 → 1.1.0)" 
    echo "  major    - Breaking changes (1.0.0 → 2.0.0)"
    echo "  x.y.z    - Specific version number"
    echo ""
    echo "Options:"
    echo "  --dry-run       - Test run without publishing"
    echo "  --skip-tests    - Skip test execution (not recommended)"
    echo "  --force         - Force publish even with warnings"
    echo "  --help, -h      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 patch                    # Publish patch version"
    echo "  $0 minor --dry-run          # Test minor version publish"
    echo "  $0 1.2.3                    # Publish specific version"
    echo ""
}

# Function to parse command line arguments
parse_arguments() {
    if [ $# -eq 0 ]; then
        print_error "Version type is required"
        show_usage
        exit 1
    fi
    
    VERSION_TYPE="$1"
    shift
    
    while [ $# -gt 0 ]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                ;;
            --skip-tests)
                SKIP_TESTS=true
                ;;
            --force)
                FORCE_PUBLISH=true
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
        shift
    done
}

# Function to get current version from package.json
get_current_version() {
    if [ ! -f "$PACKAGE_JSON" ]; then
        print_error "package.json not found at $PACKAGE_JSON"
        exit 1
    fi
    
    CURRENT_VERSION=$(node -p "require('$PACKAGE_JSON').version")
    print_status "Current version: $CURRENT_VERSION"
}

# Function to calculate new version
calculate_new_version() {
    case $VERSION_TYPE in
        patch)
            NEW_VERSION=$(node -p "
                const semver = require('semver');
                semver.inc('$CURRENT_VERSION', 'patch')
            " 2>/dev/null || {
                # Fallback if semver is not available
                local version_parts=(${CURRENT_VERSION//./ })
                local patch=$((${version_parts[2]} + 1))
                NEW_VERSION="${version_parts[0]}.${version_parts[1]}.$patch"
                echo "$NEW_VERSION"
            })
            ;;
        minor)
            NEW_VERSION=$(node -p "
                const semver = require('semver');
                semver.inc('$CURRENT_VERSION', 'minor')
            " 2>/dev/null || {
                local version_parts=(${CURRENT_VERSION//./ })
                local minor=$((${version_parts[1]} + 1))
                NEW_VERSION="${version_parts[0]}.$minor.0"
                echo "$NEW_VERSION"
            })
            ;;
        major)
            NEW_VERSION=$(node -p "
                const semver = require('semver');
                semver.inc('$CURRENT_VERSION', 'major')
            " 2>/dev/null || {
                local version_parts=(${CURRENT_VERSION//./ })
                local major=$((${version_parts[0]} + 1))
                NEW_VERSION="$major.0.0"
                echo "$NEW_VERSION"
            })
            ;;
        *)
            # Check if it's a valid version number
            if [[ $VERSION_TYPE =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                NEW_VERSION="$VERSION_TYPE"
            else
                print_error "Invalid version type: $VERSION_TYPE"
                print_status "Use: patch, minor, major, or x.y.z format"
                exit 1
            fi
            ;;
    esac
    
    print_status "New version: $CURRENT_VERSION → $NEW_VERSION"
}

# Function to check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi
    
    # Check if working directory is clean
    if [ -n "$(git status --porcelain)" ]; then
        print_error "Git working directory is not clean"
        print_status "Please commit or stash your changes first"
        git status --short
        exit 1
    fi
    
    # Check if we're on the main branch (or master)
    local current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
        if [ "$FORCE_PUBLISH" = false ]; then
            print_error "Not on main/master branch (current: $current_branch)"
            print_status "Use --force to publish from current branch"
            exit 1
        else
            print_warning "Publishing from non-main branch: $current_branch"
        fi
    fi
    
    # Check npm authentication
    if ! npm whoami >/dev/null 2>&1; then
        print_error "Not logged into npm"
        print_status "Run 'npm login' first"
        exit 1
    fi
    
    local npm_user=$(npm whoami)
    print_status "NPM user: $npm_user"
    
    # Check if package version already exists
    local existing_version=$(npm view "@samas/smart-search@$NEW_VERSION" version 2>/dev/null || echo "")
    if [ -n "$existing_version" ]; then
        print_error "Version $NEW_VERSION already exists on npm"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to run tests and build
run_tests_and_build() {
    print_step "Running tests and build..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
    fi
    
    # Type check
    print_status "Running TypeScript type check..."
    npm run type-check
    
    # Run tests unless skipped
    if [ "$SKIP_TESTS" = false ]; then
        print_status "Running unit tests..."
        npm run test:unit
    else
        print_warning "Skipping tests (--skip-tests flag used)"
    fi
    
    # Build the package
    print_status "Building package..."
    npm run build
    
    # Verify build artifacts
    if [ ! -f "dist/index.js" ] || [ ! -f "dist/index.mjs" ] || [ ! -f "dist/index.d.ts" ]; then
        print_error "Build artifacts missing"
        exit 1
    fi
    
    print_success "Tests and build completed"
}

# Function to update package version
update_package_version() {
    if [ "$DRY_RUN" = true ]; then
        print_status "DRY RUN: Would update package.json version to $NEW_VERSION"
        return 0
    fi
    
    print_step "Updating package.json version..."
    
    # Update package.json version
    npm version --no-git-tag-version "$NEW_VERSION"
    
    print_success "Package version updated to $NEW_VERSION"
}

# Function to create git commit and tag
create_git_commit_and_tag() {
    if [ "$DRY_RUN" = true ]; then
        print_status "DRY RUN: Would create git commit and tag v$NEW_VERSION"
        return 0
    fi
    
    print_step "Creating git commit and tag..."
    
    # Add package.json to git
    git add package.json
    
    # Create commit
    git commit -m "🚀 Release v$NEW_VERSION

🔍 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    
    # Create git tag
    git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
    
    print_success "Git commit and tag created"
}

# Function to publish to npm
publish_to_npm() {
    print_step "Publishing to npm..."
    
    cd "$PROJECT_ROOT"
    
    if [ "$DRY_RUN" = true ]; then
        print_status "DRY RUN: Testing npm publish..."
        npm publish --dry-run
        print_status "DRY RUN: Would publish @samas/smart-search@$NEW_VERSION"
        return 0
    fi
    
    # Publish to npm
    print_status "Publishing @samas/smart-search@$NEW_VERSION..."
    npm publish
    
    print_success "Package published to npm successfully!"
    
    # Show published package info
    echo ""
    print_status "Package published:"
    echo "   📦 Package: @samas/smart-search@$NEW_VERSION"
    echo "   🌐 NPM: https://www.npmjs.com/package/@samas/smart-search"
    echo "   📋 Install: npm install @samas/smart-search@$NEW_VERSION"
    echo ""
}

# Function to push to git remote
push_to_git() {
    if [ "$DRY_RUN" = true ]; then
        print_status "DRY RUN: Would push commit and tags to git remote"
        return 0
    fi
    
    print_step "Pushing to git remote..."
    
    # Push commits and tags
    git push origin "$(git branch --show-current)"
    git push origin "v$NEW_VERSION"
    
    print_success "Changes pushed to git remote"
}

# Function to show summary
show_summary() {
    echo ""
    print_header
    
    if [ "$DRY_RUN" = true ]; then
        print_success "🧪 DRY RUN COMPLETED - No changes made"
        echo ""
        print_status "What would happen in real publish:"
        echo "   • Version: $CURRENT_VERSION → $NEW_VERSION"
        echo "   • Git tag: v$NEW_VERSION"
        echo "   • NPM publish: @samas/smart-search@$NEW_VERSION"
        echo "   • Git push: commit + tag"
        echo ""
        print_status "To proceed with actual publish, run:"
        echo "   $0 $VERSION_TYPE"
    else
        print_success "🎉 PUBLISH COMPLETED SUCCESSFULLY!"
        echo ""
        print_status "📦 Published: @samas/smart-search@$NEW_VERSION"
        print_status "🏷️  Git tag: v$NEW_VERSION"
        print_status "🌐 Available: https://www.npmjs.com/package/@samas/smart-search"
        echo ""
        print_status "🚀 Installation:"
        echo "   npm install @samas/smart-search@$NEW_VERSION"
        echo "   npm install @samas/smart-search@latest"
        echo ""
        print_status "📋 Next steps:"
        echo "   • Update documentation if needed"
        echo "   • Create GitHub release notes"
        echo "   • Announce on social media/blog"
    fi
}

# Function to handle errors and cleanup
cleanup_on_error() {
    local exit_code=$?
    
    if [ $exit_code -ne 0 ] && [ "$DRY_RUN" = false ]; then
        print_error "Publish failed with exit code $exit_code"
        
        # Rollback version change if it was made
        if [ -n "$NEW_VERSION" ] && [ "$CURRENT_VERSION" != "$NEW_VERSION" ]; then
            print_status "Rolling back package.json version..."
            npm version --no-git-tag-version "$CURRENT_VERSION" >/dev/null 2>&1 || true
        fi
        
        # Remove git tag if it was created
        if git tag -l "v$NEW_VERSION" | grep -q "v$NEW_VERSION"; then
            print_status "Removing git tag v$NEW_VERSION..."
            git tag -d "v$NEW_VERSION" >/dev/null 2>&1 || true
        fi
        
        # Reset git commit if it was made
        if git log --oneline -1 | grep -q "Release v$NEW_VERSION"; then
            print_status "Resetting git commit..."
            git reset --hard HEAD~1 >/dev/null 2>&1 || true
        fi
        
        print_status "Rollback completed"
    fi
    
    exit $exit_code
}

# Main execution
main() {
    # Set up error handling
    trap cleanup_on_error ERR
    
    # Parse arguments
    parse_arguments "$@"
    
    # Show header
    print_header
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "🧪 DRY RUN MODE - No changes will be made"
        echo ""
    fi
    
    # Get current version
    get_current_version
    
    # Calculate new version
    calculate_new_version
    
    # Run checks and tests
    check_prerequisites
    run_tests_and_build
    
    # Update version
    update_package_version
    
    # Create git commit and tag
    create_git_commit_and_tag
    
    # Publish to npm
    publish_to_npm
    
    # Push to git
    push_to_git
    
    # Show summary
    show_summary
}

# Run main function
main "$@"