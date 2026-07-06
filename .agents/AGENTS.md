# Agent Rules

- **Auto Git Commit & Push**: After finishing any code modification or new feature implementation, always build the project (e.g., run `cmd.exe /c "npm run build"`) and then automatically commit and push the updated files to the GitHub repository using `git add -A`, `git commit -m "<message>"`, and `git push origin main`. Do not wait for the user to ask for a Git push.
