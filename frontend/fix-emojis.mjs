import { readFileSync, writeFileSync } from 'fs';

const files = {
  'src/components/SettingsModal.jsx': [
    ["icon: '\u270f\ufe0f'", "icon: ''"],
    ["icon: '\ud83c\udfa8'", "icon: ''"],
    ["icon: '\ud83e\udd16'", "icon: ''"],
    ["icon: '\ud83d\udd14'", "icon: ''"],
    ["icon: '\u2328\ufe0f'", "icon: ''"],
    ["icon: '\u2139\ufe0f'", "icon: ''"],
    ['\ud83c\udf93 \u05e1\u05d9\u05d9\u05e8 \u05de\u05d5\u05d3\u05e8\u05da', '\u05e1\u05d9\u05d9\u05e8 \u05de\u05d5\u05d3\u05e8\u05da'],
    ['\ud83d\udcc2 \u05d4\u05de\u05e8\u05ea \u05e7\u05d1\u05e6\u05d9\u05dd', '\u05d4\u05de\u05e8\u05ea \u05e7\u05d1\u05e6\u05d9\u05dd'],
    ['\ud83d\uddc4\ufe0f \u05e0\u05d9\u05d4\u05d5\u05dc \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd', '\u05e0\u05d9\u05d4\u05d5\u05dc \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd'],
    ['\ud83d\udcca \u05de\u05d9\u05d3\u05e2 \u05d0\u05d7\u05e1\u05d5\u05df', '\u05de\u05d9\u05d3\u05e2 \u05d0\u05d7\u05e1\u05d5\u05df'],
    ['\ud83d\udccd \u05d2\u05d5\u05d3\u05dc \u05d2\u05d5\u05e4\u05df', '\u05d2\u05d5\u05d3\u05dc \u05d2\u05d5\u05e4\u05df'],
    ['\ud83d\udd24 \u05d2\u05d5\u05e4\u05e0\u05d9\u05dd', '\u05d2\u05d5\u05e4\u05e0\u05d9\u05dd'],
    ['\ud83d\udcbe \u05e9\u05de\u05d9\u05e8\u05ea \u05e7\u05d1\u05e6\u05d9\u05dd', '\u05e9\u05de\u05d9\u05e8\u05ea \u05e7\u05d1\u05e6\u05d9\u05dd'],
    ['\ud83d\udc41\ufe0f \u05ea\u05e6\u05d5\u05d2\u05ea \u05e2\u05d5\u05e8\u05da', '\u05ea\u05e6\u05d5\u05d2\u05ea \u05e2\u05d5\u05e8\u05da'],
    ['\ud83e\udd16 \u05de\u05d5\u05d3\u05dc \u05d1\u05d9\u05e0\u05d4 \u05de\u05dc\u05d0\u05db\u05d5\u05ea\u05d9\u05ea', '\u05de\u05d5\u05d3\u05dc \u05d1\u05d9\u05e0\u05d4 \u05de\u05dc\u05d0\u05db\u05d5\u05ea\u05d9\u05ea'],
    ['\ud83d\udcdd \u05d0\u05e8\u05d2\u05d5\u05df \u05d8\u05e7\u05e1\u05d8', '\u05d0\u05e8\u05d2\u05d5\u05df \u05d8\u05e7\u05e1\u05d8'],
    ['\ud83d\udca1 \u05d8\u05d9\u05e4\u05d9\u05dd', '\u05d8\u05d9\u05e4\u05d9\u05dd'],
    ['\u270f\ufe0f \u05e2\u05e8\u05d9\u05db\u05ea \u05d8\u05e7\u05e1\u05d8', '\u05e2\u05e8\u05d9\u05db\u05ea \u05d8\u05e7\u05e1\u05d8'],
    ['\ud83d\udd0d \u05e0\u05d9\u05d5\u05d5\u05d8 \u05d5\u05ea\u05e6\u05d5\u05d2\u05d4', '\u05e0\u05d9\u05d5\u05d5\u05d8 \u05d5\u05ea\u05e6\u05d5\u05d2\u05d4'],
    ['\ud83d\udcc1 \u05e0\u05d9\u05d4\u05d5\u05dc \u05e7\u05d1\u05e6\u05d9\u05dd', '\u05e0\u05d9\u05d4\u05d5\u05dc \u05e7\u05d1\u05e6\u05d9\u05dd'],
    ['\ud83d\uddb1\ufe0f \u05e2\u05db\u05d1\u05e8', '\u05e2\u05db\u05d1\u05e8'],
    ["'\ud83d\udc8e \u05d1\u05ea\u05e9\u05dc\u05d5\u05dd'", "'\u05d1\u05ea\u05e9\u05dc\u05d5\u05dd'"],
    ["'\ud83d\udd11 \u05d7\u05d9\u05e0\u05de\u05d9'", "'\u05d7\u05d9\u05e0\u05de\u05d9'"],
    ['<span className="tip-icon">\ud83d\udca1</span>', '<span className="tip-icon"></span>'],
    ['<div className="about-logo">\ud83d\udcd6</div>', '<div className="about-logo"></div>'],
    ['<span className="about-detail-icon">\ud83d\udce7</span>', '<span className="about-detail-icon"></span>'],
    ['<span className="about-detail-icon">\ud83d\udc9d</span>', '<span className="about-detail-icon"></span>'],
    ['\ud83e\udd16 \u05d0\u05e8\u05d2\u05d5\u05df \u05d8\u05e7\u05e1\u05d8 \u05d1\u05d1\u05d9\u05e0\u05d4 \u05de\u05dc\u05d0\u05db\u05d5\u05ea\u05d9\u05ea', '\u05d0\u05e8\u05d2\u05d5\u05df \u05d8\u05e7\u05e1\u05d8 \u05d1\u05d1\u05d9\u05e0\u05d4 \u05de\u05dc\u05d0\u05db\u05d5\u05ea\u05d9\u05ea'],
    ['\ud83d\udcda \u05db\u05e8\u05d8\u05d9\u05e1\u05d9\u05d5\u05ea \u05dc\u05de\u05d9\u05d3\u05d4', '\u05db\u05e8\u05d8\u05d9\u05e1\u05d9\u05d5\u05ea \u05dc\u05de\u05d9\u05d3\u05d4'],
    ['\ud83d\udd0d \u05d7\u05d9\u05e4\u05d5\u05e9 \u05d7\u05db\u05dd', '\u05d7\u05d9\u05e4\u05d5\u05e9 \u05d7\u05db\u05dd'],
    ['\ud83d\udcca \u05de\u05e2\u05e7\u05d1 \u05d4\u05ea\u05e7\u05d3\u05de\u05d5\u05ea', '\u05de\u05e2\u05e7\u05d1 \u05d4\u05ea\u05e7\u05d3\u05de\u05d5\u05ea'],
    ["\ud83d\udcac \u05e6'\u05d0\u05d8 \u05d9\u05d4\u05d3\u05d5\u05ea", "\u05e6'\u05d0\u05d8 \u05d9\u05d4\u05d3\u05d5\u05ea"],
    ['\ud83d\udcdd \u05e2\u05d5\u05e8\u05da \u05d8\u05e7\u05e1\u05d8 \u05de\u05ea\u05e7\u05d3\u05dd', '\u05e2\u05d5\u05e8\u05da \u05d8\u05e7\u05e1\u05d8 \u05de\u05ea\u05e7\u05d3\u05dd'],
    ['\ud83c\udfa8 \u05e2\u05e8\u05db\u05d5\u05ea \u05e0\u05d5\u05e9\u05d0 \u05de\u05d5\u05ea\u05d0\u05de\u05d5\u05ea', '\u05e2\u05e8\u05db\u05d5\u05ea \u05e0\u05d5\u05e9\u05d0 \u05de\u05d5\u05ea\u05d0\u05de\u05d5\u05ea'],
  ],
  'src/components/SingleFileConversionModal.jsx': [
    ["icon: '\ud83d\udcdd'", "icon: ''"],
    ["icon: '\ud83d\udcc4'", "icon: ''"],
    ["icon: '\ud83c\udf10'", "icon: ''"],
    ['\ud83d\udd04 \u05d4\u05de\u05e8\u05ea \u05e7\u05d5\u05d1\u05e5', '\u05d4\u05de\u05e8\u05ea \u05e7\u05d5\u05d1\u05e5'],
  ],
  'src/components/TextOrganizationProgressModal.jsx': [
    ['<span className="insight-icon">\ud83e\udde0</span>', '<span className="insight-icon"></span>'],
    ['<span className="insight-icon">\ud83d\udcdd</span>', '<span className="insight-icon"></span>'],
  ],
  'src/components/MainContentArea.jsx': [
    ['\ud83d\udca1 \u05d8\u05d9\u05e4:', '\u05d8\u05d9\u05e4:'],
    ['<div style={{ fontSize: \'4rem\' }}>\ud83c\udfb5</div>', '<div style={{ fontSize: \'4rem\' }}></div>'],
  ],
  'src/components/SmartSearchModal.jsx': [
    ['<span className="ss-not-found-icon">\ud83d\udd0d</span>', '<span className="ss-not-found-icon"></span>'],
    ['\ud83d\udcc4 ', ''],
    ['\ud83e\udde0 \u05e2\u05de\u05d5\u05e7', '\u05e2\u05de\u05d5\u05e7'],
  ],
  'src/components/SelectedTextContextMenu.jsx': [
    ["icon: '\ud83e\udd14'", "icon: ''"],
    ["icon: '\ud83d\udcd6'", "icon: ''"],
    ["icon: '\ud83d\udcda'", "icon: ''"],
    ["icon: '\ud83d\udcdd'", "icon: ''"],
    ['<span className="icon">\ud83d\udd16</span>', '<span className="icon"></span>'],
    ['<span className="icon">\ud83d\udccc</span>', '<span className="icon"></span>'],
  ],
  'src/components/TextOrganizationSettings.jsx': [
    ['\ud83d\udca1 \u05d4\u05e1\u05d1\u05e8:', '\u05d4\u05e1\u05d1\u05e8:'],
  ],
  'src/components/UnsavedChangesModal.jsx': [
    ['<span className="unsaved-changes-modal-icon">\u26a0\ufe0f</span>', '<span className="unsaved-changes-modal-icon">\u26a0</span>'],
  ],
  'src/components/FileConversionModal.jsx': [
    ['\ud83d\udcc1 \u05d1\u05d7\u05e8 \u05ea\u05d9\u05e7\u05d9\u05d9\u05d4 \u05de\u05d4\u05de\u05d7\u05e9\u05d1', '\u05d1\u05d7\u05e8 \u05ea\u05d9\u05e7\u05d9\u05d9\u05d4 \u05de\u05d4\u05de\u05d7\u05e9\u05d1'],
  ],
};

for (const [file, replacements] of Object.entries(files)) {
  let content = readFileSync(file, 'utf8');
  for (const [from, to] of replacements) {
    content = content.replaceAll(from, to);
  }
  writeFileSync(file, content, 'utf8');
  console.log(`Done: ${file}`);
}
