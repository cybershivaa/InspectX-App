# Git commit and push script
Set-Location "H:\Updated-InspectX-app-main"

Write-Host "Staging all changes..."
git add .

Write-Host "Committing changes..."
git commit -m "Add responsive design and PWA support with bug fixes"

Write-Host "Pushing to GitHub..."
git push origin main

Write-Host "Done! All changes pushed to GitHub."
