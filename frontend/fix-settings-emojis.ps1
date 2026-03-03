$file = 'src/components/SettingsModal.jsx'
$c = Get-Content $file -Raw -Encoding UTF8

# Tab icons
$c = $c -replace "icon: '✏️'", "icon: ''"
$c = $c -replace "icon: '🎨'", "icon: ''"
$c = $c -replace "icon: '🤖'", "icon: ''"
$c = $c -replace "icon: '🔔'", "icon: ''"
$c = $c -replace "icon: '⌨️'", "icon: ''"
$c = $c -replace "icon: 'ℹ️'", "icon: ''"

# Section titles
$c = $c.Replace('🎓 סיור מודרך', 'סיור מודרך')
$c = $c.Replace('📂 המרת קבצים', 'המרת קבצים')
$c = $c.Replace('🗄️ ניהול נתונים', 'ניהול נתונים')
$c = $c.Replace('📊 מידע אחסון', 'מידע אחסון')
$c = $c.Replace('📏 גודל גופן', 'גודל גופן')
$c = $c.Replace('🔤 גופנים', 'גופנים')
$c = $c.Replace('💾 שמירת קבצים', 'שמירת קבצים')
$c = $c.Replace('👁️ תצוגת עורך', 'תצוגת עורך')
$c = $c.Replace('🤖 מודל בינה מלאכותית', 'מודל בינה מלאכותית')
$c = $c.Replace('📝 ארגון טקסט', 'ארגון טקסט')
$c = $c.Replace('💡 טיפים', 'טיפים')
$c = $c.Replace('✏️ עריכת טקסט', 'עריכת טקסט')
$c = $c.Replace('🔍 ניווט ותצוגה', 'ניווט ותצוגה')
$c = $c.Replace('📁 ניהול קבצים', 'ניהול קבצים')
$c = $c.Replace('🖱️ עכבר', 'עכבר')

# API key badge
$c = $c.Replace("'💎 בתשלום'", "'בתשלום'")
$c = $c.Replace("'🔑 חינמי'", "'חינמי'")

# Tip icons (span content)
$c = $c.Replace('<span className="tip-icon">💡</span>', '<span className="tip-icon"></span>')

# About section
$c = $c.Replace('<div className="about-logo">📖</div>', '<div className="about-logo"></div>')
$c = $c.Replace('<span className="about-detail-icon">📧</span>', '<span className="about-detail-icon"></span>')
$c = $c.Replace('<span className="about-detail-icon">💝</span>', '<span className="about-detail-icon"></span>')

# Feature items
$c = $c.Replace('🤖 ארגון טקסט בבינה מלאכותית', 'ארגון טקסט בבינה מלאכותית')
$c = $c.Replace('📚 כרטיסיות למידה', 'כרטיסיות למידה')
$c = $c.Replace('🔍 חיפוש חכם', 'חיפוש חכם')
$c = $c.Replace('📊 מעקב התקדמות', 'מעקב התקדמות')
$c = $c.Replace("💬 צ'אט יהדות", "צ'אט יהדות")
$c = $c.Replace('📝 עורך טקסט מתקדם', 'עורך טקסט מתקדם')
$c = $c.Replace('🎨 ערכות נושא מותאמות', 'ערכות נושא מותאמות')

Set-Content $file $c -Encoding UTF8 -NoNewline
Write-Host "Done! Emoji removal complete."
