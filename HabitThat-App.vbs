Set FSO = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
scriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
psScript = scriptDir & "\Launch-App.ps1"

' Run PowerShell launcher completely hidden
cmd = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & psScript & """"
WshShell.Run cmd, 0, False
