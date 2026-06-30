@echo off
cd /d "E:\川师数科院\sicnu-math-welcome"

echo Step 1: Check git... > push_log.txt 2>&1
git --version >> push_log.txt 2>&1

echo. >> push_log.txt
echo Step 2: Add remote... >> push_log.txt 2>&1
git remote remove origin >> push_log.txt 2>&1
git remote add origin https://github.com/rainy0409/sicnu-math-welcome.git >> push_log.txt 2>&1

echo. >> push_log.txt
echo Step 3: Push... >> push_log.txt 2>&1
git push -u origin main >> push_log.txt 2>&1

echo. >> push_log.txt
echo Step 4: Done. Exit code: %errorlevel% >> push_log.txt 2>&1

start notepad push_log.txt
