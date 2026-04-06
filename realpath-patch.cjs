
// Node.js Bug Fix: 윈도우 가상 드라이브 경로 인식 에러(EISDIR) 대응
const { promisify } = require('util');
const fs = require('fs');

// 1. 비동기 경로 탐색 패치
fs.promises.realpath = promisify(fs.realpath);

// 2. 동기 경로 탐색 패치
fs.realpathSync.native = fs.realpathSync;
