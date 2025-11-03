# Git Commit Geçmişini Temizleme Scripti
# Bu script tüm commit geçmişini siler ve yeni bir initial commit oluşturur

# Git'in PATH'e eklenmesi
$gitPath = "C:\Program Files\Git\cmd"
if (Test-Path $gitPath) {
    $env:Path = "$gitPath;$env:Path"
}

Write-Host "⚠️  UYARI: Bu işlem tüm commit geçmişini silecektir!" -ForegroundColor Yellow
Write-Host ""

# Mevcut branch'i kontrol et
$currentBranch = git branch --show-current
Write-Host "Mevcut branch: $currentBranch" -ForegroundColor Cyan

# Yeni bir orphan branch oluştur (geçmişi olmayan)
Write-Host "`nYeni orphan branch oluşturuluyor..." -ForegroundColor Cyan
git checkout --orphan fresh-start

# Tüm dosyaları stage'e al
Write-Host "Tüm dosyalar stage'e alınıyor..." -ForegroundColor Cyan
git add .

# İlk commit'i oluştur
Write-Host "Yeni initial commit oluşturuluyor..." -ForegroundColor Cyan
git commit -m "Initial commit"

# Eski branch'i sil
Write-Host "`nEski branch siliniyor..." -ForegroundColor Cyan
git branch -D $currentBranch

# Yeni branch'i master olarak yeniden adlandır (veya main kullanıyorsanız main yapın)
Write-Host "Yeni branch '$currentBranch' olarak yeniden adlandırılıyor..." -ForegroundColor Cyan
git branch -m $currentBranch

Write-Host "`n✅ İşlem tamamlandı! Tüm commit geçmişi temizlendi." -ForegroundColor Green
Write-Host "⚠️  Eğer remote'a push yapacaksanız: git push -f origin $currentBranch" -ForegroundColor Yellow

