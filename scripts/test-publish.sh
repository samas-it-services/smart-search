#!/bin/bash

# @samas/smart-search - NPM Publish Test Script
# Safe dry-run testing of the publish process without making any changes

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
    echo -e "${BLUE}║${NC} ${CYAN}🧪 Smart Search NPM Publish Test${NC} ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}$(printf '=%.0s' {1..50})${NC}"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PUBLISH_SCRIPT="$SCRIPT_DIR/publish-to-npm.sh"

# Function to show usage
show_usage() {
    echo "Usage: $0 [version-type]"
    echo ""
    echo "Version Types (optional, defaults to 'patch'):"
    echo "  patch    - Test patch version (1.0.0 → 1.0.1)"
    echo "  minor    - Test minor version (1.0.0 → 1.1.0)"
    echo "  major    - Test major version (1.0.0 → 2.0.0)"
    echo "  x.y.z    - Test specific version number"
    echo ""
    echo "Examples:"
    echo "  $0              # Test patch version publish"
    echo "  $0 minor        # Test minor version publish"
    echo "  $0 1.2.3        # Test specific version publish"
    echo ""
}

# Function to test all version types
test_all_versions() {
    local current_version=$(node -p "require('$PROJECT_ROOT/package.json').version")
    local version_parts=(${current_version//./ })
    local major=${version_parts[0]}
    local minor=${version_parts[1]}
    local patch=${version_parts[2]}
    
    print_section "📊 Version Strategy Analysis"
    
    echo "Current Version: ${CYAN}$current_version${NC}"
    echo ""
    echo "Available Version Bumps:"
    echo "   • ${GREEN}patch${NC}: $current_version → $major.$minor.$((patch + 1))"
    echo "     ${BLUE}Use for:${NC} Bug fixes, security updates, documentation"
    echo ""
    echo "   • ${YELLOW}minor${NC}: $current_version → $major.$((minor + 1)).0"
    echo "     ${BLUE}Use for:${NC} New features, enhancements, API additions"
    echo ""
    echo "   • ${RED}major${NC}: $current_version → $((major + 1)).0.0"
    echo "     ${BLUE}Use for:${NC} Breaking changes, major rewrites, API changes"
    echo ""
    
    # Calculate next versions for each type
    echo "Quick Commands for Each Type:"
    echo "   ${GREEN}./scripts/publish-to-npm.sh patch${NC}  # Recommended for bug fixes"
    echo "   ${YELLOW}./scripts/publish-to-npm.sh minor${NC}  # Recommended for new features"
    echo "   ${RED}./scripts/publish-to-npm.sh major${NC}  # Breaking changes only"
    echo ""
}

# Function to check system requirements
check_system_requirements() {
    print_section "🔧 System Requirements Check"
    
    local all_good=true
    
    # Check Node.js version
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        print_success "Node.js: $node_version"
    else
        print_error "Node.js not found"
        all_good=false
    fi
    
    # Check npm version
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        print_success "npm: v$npm_version"
    else
        print_error "npm not found"
        all_good=false
    fi
    
    # Check git version
    if command -v git >/dev/null 2>&1; then
        local git_version=$(git --version | cut -d' ' -f3)
        print_success "git: v$git_version"
    else
        print_error "git not found"
        all_good=false
    fi
    
    # Check TypeScript
    if command -v tsc >/dev/null 2>&1; then
        local ts_version=$(tsc --version | cut -d' ' -f2)
        print_success "TypeScript: v$ts_version"
    else
        print_warning "TypeScript not found globally (using local version)"
    fi
    
    if [ "$all_good" = true ]; then
        print_success "All system requirements satisfied"
    else
        print_error "Some system requirements are missing"
        return 1
    fi
}

# Function to analyze package configuration
analyze_package_config() {
    print_section "📦 Package Configuration Analysis"
    
    local package_json="$PROJECT_ROOT/package.json"
    
    if [ ! -f "$package_json" ]; then
        print_error "package.json not found"
        return 1
    fi
    
    # Get package info
    local name=$(node -p "require('$package_json').name")
    local version=$(node -p "require('$package_json').version")
    local description=$(node -p "require('$package_json').description")
    local main=$(node -p "require('$package_json').main")
    local module=$(node -p "require('$package_json').module")
    local types=$(node -p "require('$package_json').types")
    local author=$(node -p "JSON.stringify(require('$package_json').author)")
    local license=$(node -p "require('$package_json').license")
    
    echo "Package Information:"
    echo "   • Name: ${CYAN}$name${NC}"
    echo "   • Version: ${GREEN}$version${NC}"
    echo "   • Description: $description"
    echo "   • Main: $main"
    echo "   • Module: $module"  
    echo "   • Types: $types"
    echo "   • Author: $author"
    echo "   • License: $license"
    echo ""
    
    # Check files array
    local files_exist=$(node -p "require('$package_json').files ? 'true' : 'false'")
    if [ "$files_exist" = "true" ]; then
        print_success "files array configured in package.json"
        local files=$(node -p "JSON.stringify(require('$package_json').files, null, 2)")
        echo "   Files to publish: $files"
    else
        print_warning "No files array in package.json (will publish all files)"
    fi
    
    # Check scripts
    echo ""
    echo "Available Scripts:"
    local scripts=$(node -p "
        const pkg = require('$package_json');
        Object.keys(pkg.scripts || {}).map(key => '   • ' + key + ': ' + pkg.scripts[key]).join('\\n')
    ")
    echo "$scripts"
}

# Function to test build and package contents
test_build_and_package() {
    print_section "🏗️ Build & Package Content Test"
    
    cd "$PROJECT_ROOT"
    
    # Test build
    print_step "Testing build process..."
    npm run build >/dev/null 2>&1
    
    # Check build artifacts
    local artifacts=("dist/index.js" "dist/index.mjs" "dist/index.d.ts")
    local all_artifacts_exist=true
    
    for artifact in "${artifacts[@]}"; do
        if [ -f "$artifact" ]; then
            local size=$(du -h "$artifact" | cut -f1)
            print_success "$artifact ($size)"
        else
            print_error "$artifact missing"
            all_artifacts_exist=false
        fi
    done
    
    if [ "$all_artifacts_exist" = true ]; then
        print_success "All build artifacts present"
    else
        print_error "Some build artifacts missing"
        return 1
    fi
    
    # Test npm pack (dry run)
    print_step "Testing package contents..."
    local pack_output=$(npm pack --dry-run 2>/dev/null | tail -n +2)
    local package_size=$(echo "$pack_output" | head -n 1 | grep -o '[0-9.]*[kKmMgG]*[bB]')
    local file_count=$(echo "$pack_output" | grep -c "^" || echo "0")
    
    print_success "Package size: $package_size"
    print_success "Files in package: $file_count"
    
    # Show first few files
    echo ""
    echo "Sample package contents:"
    echo "$pack_output" | head -10 | sed 's/^/   /'
    if [ "$file_count" -gt 10 ]; then
        echo "   ... and $((file_count - 10)) more files"
    fi
}

# Function to test npm authentication and permissions
test_npm_auth() {
    print_section "🔐 NPM Authentication & Permissions"
    
    # Check if logged in
    if npm whoami >/dev/null 2>&1; then
        local npm_user=$(npm whoami)
        print_success "Logged in as: $npm_user"
        
        # Check package access
        local package_name="@samas/smart-search"
        print_step "Checking publish permissions for $package_name..."
        
        # Try to get package info
        if npm view "$package_name" >/dev/null 2>&1; then
            local current_maintainers=$(npm view "$package_name" maintainers --json 2>/dev/null | node -p "
                try {
                    const maintainers = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
                    Array.isArray(maintainers) ? maintainers.map(m => m.name).join(', ') : maintainers.name;
                } catch(e) { 'Unable to parse' }
            " 2>/dev/null || echo "Unable to check")
            
            print_status "Current maintainers: $current_maintainers"
            
            # Check if current user can publish
            if echo "$current_maintainers" | grep -q "$npm_user"; then
                print_success "You have publish permissions"
            else
                print_warning "You may not have publish permissions"
            fi
        else
            print_status "Package doesn't exist yet (first publish)"
            print_success "You can create new scoped packages"
        fi
        
    else
        print_error "Not logged into npm"
        print_status "Run 'npm login' to authenticate"
        return 1
    fi
}

# Function to run the actual dry-run test
run_dry_run_test() {
    local version_type="${1:-patch}"
    
    print_section "🧪 Dry Run Test - $version_type"
    
    if [ ! -f "$PUBLISH_SCRIPT" ]; then
        print_error "Publish script not found at $PUBLISH_SCRIPT"
        return 1
    fi
    
    print_step "Running publish script in dry-run mode..."
    echo ""
    
    # Run the actual publish script in dry-run mode
    "$PUBLISH_SCRIPT" "$version_type" --dry-run
    
    print_success "Dry run completed successfully"
}

# Function to show next steps
show_next_steps() {
    print_section "🚀 Next Steps"
    
    echo "The test completed successfully! Here's what you can do next:"
    echo ""
    echo "${GREEN}Ready to Publish?${NC}"
    echo "   • ${CYAN}./scripts/publish-to-npm.sh patch${NC}   # Bug fixes"
    echo "   • ${CYAN}./scripts/publish-to-npm.sh minor${NC}   # New features"  
    echo "   • ${CYAN}./scripts/publish-to-npm.sh major${NC}   # Breaking changes"
    echo ""
    echo "${YELLOW}Need More Testing?${NC}"
    echo "   • ${CYAN}npm run test:all${NC}                    # Run all tests"
    echo "   • ${CYAN}npm run test:e2e${NC}                    # Run E2E tests"
    echo "   • ${CYAN}./scripts/test-publish.sh minor${NC}     # Test different version"
    echo ""
    echo "${BLUE}Documentation:${NC}"
    echo "   • Update CHANGELOG.md with release notes"
    echo "   • Update README.md if needed"
    echo "   • Prepare GitHub release description"
    echo ""
}

# Main execution
main() {
    local version_type="${1:-patch}"
    
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_usage
        exit 0
    fi
    
    # Show header
    print_header
    print_warning "🛡️  SAFE MODE - This script makes no permanent changes"
    
    # Run all tests
    check_system_requirements
    analyze_package_config
    test_build_and_package
    test_npm_auth
    test_all_versions
    run_dry_run_test "$version_type"
    show_next_steps
    
    # Final summary
    echo ""
    print_success "🎉 All tests passed! The package is ready for publishing."
    echo ""
}

# Run main function
main "$@"