@echo off
echo Packaging TrustTag Chrome Extension...

REM Check if zip directory exists, create if not
if not exist "dist" mkdir dist

REM Create zip file
powershell Compress-Archive -Path manifest.json, background.js, content.js, content.css, popup.html, popup.js, README.md, test.html, airtable_setup.html, images/* -DestinationPath dist/trusttag.zip -Force

echo.
echo Package created at dist/trusttag.zip
echo.
echo IMPORTANT: Before distributing, make sure to:
echo 1. Create the actual icon PNG files from the HTML templates in the images directory
echo 2. Test the extension thoroughly in Chrome
echo.
