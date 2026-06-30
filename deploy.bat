@echo off
chcp 65001 >nul
echo ========================================
echo   川师数科院迎新网站 - 部署向导
echo ========================================
echo.

REM 检查 git 是否安装
where git >nul 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 Git，请先安装 Git:
    echo https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [步骤 1/4] 初始化 Git 仓库...
cd /d e:\川师数科院\sicnu-math-welcome
git init
git add .
git commit -m "init: 川师数科院迎新网站部署包"

echo.
echo [步骤 2/4] 请在 GitHub 创建空仓库（不要 README/.gitignore）:
echo   https://github.com/new
echo   仓库名建议: sicnu-math-welcome
echo.
set /p REPO_URL="请粘贴你的 GitHub 仓库地址 (https://github.com/你的用户名/sicnu-math-welcome.git): "

if "%REPO_URL%"=="" (
    echo [跳过] 未输入仓库地址。请手动执行:
    echo   git remote add origin 你的仓库地址
    echo   git branch -M main
    echo   git push -u origin main
) else (
    echo.
    echo [步骤 3/4] 推送到 GitHub...
    git remote add origin %REPO_URL%
    git branch -M main
    git push -u origin main
    if errorlevel 1 (
        echo [警告] 推送失败，请检查网络/凭据
    ) else (
        echo.
        echo [步骤 4/4] 推送成功！
        echo.
        echo ========================================
        echo   下一步：访问 https://vercel.com/new
        echo   1. 用 GitHub 登录
        echo   2. 选择 sicnu-math-welcome 仓库
        echo   3. Framework: Other
        echo   4. 直接点 Deploy
        echo.
        echo   部署完成会得到类似链接:
        echo   https://sicnu-math-welcome.vercel.app
        echo ========================================
    )
)

pause
