# 生成红米手表6（432x514 矩形屏）watch-rect 布局的棋盘网格底图。
# 布局约定（designWidth 212 设计px，2x 输出保证清晰度）：
#   棋盘 180x180，4x4 格子 41x41，间距 45，起始偏移 2，圆角 11（2x 后翻倍）。
param(
  [string]$OutDir = (Join-Path $PSScriptRoot '..\src\common')
)
Add-Type -AssemblyName System.Drawing

function New-Grid([string]$OutFile, [string]$Panel, [string]$Cell) {
  $size = 360; $pad = 4; $pitch = 90; $cellSize = 82; $radius = 22
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml($Panel))
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($Cell))
  for ($i = 0; $i -lt 4; $i++) {
    for ($j = 0; $j -lt 4; $j++) {
      $x = $pad + $i * $pitch
      $y = $pad + $j * $pitch
      $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
      $d = $radius * 2
      $gp.AddArc($x, $y, $d, $d, 180, 90)
      $gp.AddArc($x + $cellSize - $d, $y, $d, $d, 270, 90)
      $gp.AddArc($x + $cellSize - $d, $y + $cellSize - $d, $d, $d, 0, 90)
      $gp.AddArc($x, $y + $cellSize - $d, $d, $d, 90, 90)
      $gp.CloseFigure()
      $g.FillPath($brush, $gp)
      $gp.Dispose()
    }
  }
  $brush.Dispose()
  $g.Dispose()
  $bmp.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "written: $OutFile"
}

New-Grid (Join-Path $OutDir 'watch-grid-light.png') '#CCBEB0' '#DED3C7'
New-Grid (Join-Path $OutDir 'watch-grid-dark.png') '#242424' '#363636'
