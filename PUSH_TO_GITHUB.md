# How to Push to GitHub

## Step 1: Create GitHub Repository

1. Go to https://github.com and sign in
2. Click the "+" icon → "New repository"
3. Name it: `PromptMirror`
4. Choose Public or Private
5. **DO NOT** check "Initialize with README" (we already have files)
6. Click "Create repository"

## Step 2: Push Your Code

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add the remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/PromptMirror.git

# Rename branch to main (if needed)
git branch -M main

# Push your code
git push -u origin main
```

## Alternative: Using SSH

If you prefer SSH (and have SSH keys set up):

```bash
git remote add origin git@github.com:YOUR_USERNAME/PromptMirror.git
git branch -M main
git push -u origin main
```

## Troubleshooting

### "remote origin already exists"
```bash
git remote remove origin
# Then add it again with the command above
```

### Authentication issues
- Use GitHub CLI: `gh auth login`
- Or use a Personal Access Token instead of password
- Or set up SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### "branch main does not exist"
```bash
git branch -M main
```

## After Pushing

Once pushed, you can:
- View your code at: `https://github.com/YOUR_USERNAME/PromptMirror`
- Deploy to Vercel/Netlify by connecting the GitHub repo
- Share the repository with others
