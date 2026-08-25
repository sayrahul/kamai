@echo off
set "PATH=%LOCALAPPDATA%\Programs\MinGit\cmd;%LOCALAPPDATA%\Programs\nodejs;%PATH%"
echo Incrementing app version (+0.1)...
call npm run version:bump
git add .
git commit -m "chore(release): bump version and sync origin"
git push origin main
pause
