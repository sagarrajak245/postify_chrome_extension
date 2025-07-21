@echo off
echo Building and packaging Postify extension...

REM Build the extension
npm run build

REM Create zip file using PowerShell
powershell -command "Compress-Archive -Path 'dist\*' -DestinationPath 'postify-extension.zip' -Force"

echo.
echo ✅ Extension packaged successfully!
echo 📦 File: postify-extension.zip
echo 🚀 Ready for distribution!
echo.
pause 