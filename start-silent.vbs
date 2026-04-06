Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "J:\02.Projects\claude-pets"
WshShell.Environment("Process")("NODE_OPTIONS") = "--require J:\02.Projects\claude-pets\realpath-patch.cjs"
WshShell.Run "J:\02.Projects\claude-pets\node_modules\electron\dist\electron.exe .", 0, False
