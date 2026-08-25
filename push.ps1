$env:PATH = "$env:LOCALAPPDATA\Programs\MinGit\cmd;$env:LOCALAPPDATA\Programs\nodejs;$env:PATH"
Write-Host "Incrementing app version (+0.1)..." -ForegroundColor Green
npm run version:bump
git add .
git commit -m "chore(release): bump version and sync origin"
git push origin main
