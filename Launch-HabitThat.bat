@echo off
title HabitThat App
cd /d "%~dp0"
powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0Launch-App.ps1"
