$desktop = [System.Environment]::GetFolderPath('Desktop')
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut("$desktop\Prospeccao Instagram.lnk")
$sc.TargetPath = "c:\Prospect Instagram\INICIAR_SISTEMA.bat"
$sc.WorkingDirectory = "c:\Prospect Instagram"
$sc.Save()
Write-Host "Shortcut created at $desktop\Prospeccao Instagram.lnk"
