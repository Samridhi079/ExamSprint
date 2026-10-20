@echo off
echo ========================================================
echo   EXAMSPRINT AI - College Exam & PYQ Prep Engine
echo ========================================================
echo Starting Backend Server on http://localhost:5000 ...
start "ExamSprint Server" cmd /k "cd server && npm start"

echo Starting Frontend Client on http://localhost:3001 ...
start "ExamSprint Client" cmd /k "cd client && npm run dev"

echo.
echo Both services are booting up!
echo Open your browser at: http://localhost:3001
echo ========================================================
pause
