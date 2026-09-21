@echo off
REM ============================================================
REM  SGP — OCR Dependencies Setup
REM  Double-click this file or execute from repo scripts directory.
REM ============================================================

REM ── Change to project root dynamically ──────────────────────
cd /d "%~dp0.."

if not exist "package.json" (
  echo ERROR: package.json not found in project root.
  pause
  exit /b 1
)

echo Project root: %cd%
echo.

echo [1/3] Installing tesseract.js and pdfjs-dist...
call npm install tesseract.js pdfjs-dist

if %errorlevel% neq 0 (
  echo ERROR: npm install failed.
  pause
  exit /b 1
)

echo.
echo [2/3] Copying PDF.js worker to public\ ...

set W3=node_modules\pdfjs-dist\build\pdf.worker.min.js
set W4=node_modules\pdfjs-dist\legacy\build\pdf.worker.min.js
set W4B=node_modules\pdfjs-dist\build\pdf.worker.min.mjs

if exist "%W3%"  ( copy /Y "%W3%"  "public\pdf.worker.min.js" & goto :workerOK )
if exist "%W4%"  ( copy /Y "%W4%"  "public\pdf.worker.min.js" & goto :workerOK )
if exist "%W4B%" ( copy /Y "%W4B%" "public\pdf.worker.min.js" & goto :workerOK )

echo WARNING: pdf.worker not found — copy manually to public\pdf.worker.min.js
goto :verify

:workerOK
echo   pdf.worker.min.js copied to public\

:verify
echo.
echo [3/3] Verifying...
if exist "node_modules\tesseract.js\package.json" (echo   tesseract.js  [OK]) else (echo   tesseract.js  [MISSING])
if exist "node_modules\pdfjs-dist\package.json"   (echo   pdfjs-dist    [OK]) else (echo   pdfjs-dist    [MISSING])
if exist "public\pdf.worker.min.js"               (echo   pdf.worker    [OK]) else (echo   pdf.worker    [MISSING - copy manually])

echo.
echo Done! Now run: npm start
echo.
pause
