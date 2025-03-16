# Git Workflow for TrustTag

This document provides a simple guide for using Git with the TrustTag Chrome extension project.

## Basic Git Commands

### Checking Status

To see which files have been changed:

```bash
git status
```

### Viewing Changes

To see the specific changes in files:

```bash
git diff
```

### Committing Changes

1. Stage your changes:

```bash
git add .  # Add all changed files
# OR
git add file1.js file2.css  # Add specific files
```

2. Commit your changes with a descriptive message:

```bash
git commit -m "Brief description of the changes"
```

### Recommended Commit Message Format

Use clear, descriptive commit messages that explain what changes were made and why:

```
Feature: Add counter badge to warning banner

- Added numeric badge to warning icon
- Changed remarks display to single line with commas
- Updated CSS for better mobile display
```

### Viewing Commit History

To see the history of commits:

```bash
git log  # Full detailed log
git log --oneline  # Compact view
```

## Recommended Workflow

1. Make small, focused changes to the code
2. Test your changes to ensure they work as expected
3. Commit your changes with a descriptive message
4. Repeat for each new feature or bug fix

## Branching (Advanced)

For larger features, consider using branches:

1. Create a new branch:

```bash
git checkout -b feature-name
```

2. Make and commit your changes
3. Switch back to the main branch:

```bash
git checkout master
```

4. Merge your changes:

```bash
git merge feature-name
```

## Best Practices

1. Commit early and often
2. Write clear commit messages
3. Each commit should represent a logical unit of work
4. Test before committing
5. Update the README.md when adding new features
