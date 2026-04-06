const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const os = require('os');

class SessionWatcher extends EventEmitter {
  constructor() {
    super();
    this.projectsDir = path.join(os.homedir(), '.claude', 'projects');
    this.intervalId = null;
    this.lastCount = -1;
    // 파일별 마지막 mtime 추적
    this.fileMtimes = new Map();    // filePath → last mtime
    this.fileLastWrite = new Map(); // filePath → last time mtime changed (Date.now())
  }

  /**
   * 에이전트가 "작업 중"인 세션 수 계산
   * 기준: .jsonl의 mtime이 최근 5초 이내에 변한 적 있음
   *       = 파일에 계속 쓰고 있음 = 에이전트 활동 중
   */
  countActiveSessions() {
    try {
      if (!fs.existsSync(this.projectsDir)) return 0;

      const now = Date.now();
      const activeThreshold = 20000; // mtime이 20초 이내에 변했으면 작업 중
      const seenFiles = new Set();
      let count = 0;

      const projects = fs.readdirSync(this.projectsDir);

      for (const project of projects) {
        const projectPath = path.join(this.projectsDir, project);
        try {
          if (!fs.statSync(projectPath).isDirectory()) continue;
        } catch { continue; }

        let entries;
        try {
          entries = fs.readdirSync(projectPath);
        } catch { continue; }

        for (const entry of entries) {
          if (!entry.endsWith('.jsonl')) continue;

          const filePath = path.join(projectPath, entry);
          seenFiles.add(filePath);

          try {
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) continue;

            const currentMtime = stat.mtimeMs;
            const prevMtime = this.fileMtimes.get(filePath);

            if (prevMtime !== undefined && currentMtime !== prevMtime) {
              // mtime이 바뀜 → 에이전트가 방금 씀
              this.fileLastWrite.set(filePath, now);
            }

            this.fileMtimes.set(filePath, currentMtime);

            // 최근 5초 이내에 쓰기가 감지됐으면 활성
            const lastWrite = this.fileLastWrite.get(filePath);
            if (lastWrite && (now - lastWrite) < activeThreshold) {
              count++;
            }
          } catch { /* ignore */ }
        }
      }

      // 삭제된 파일 정리
      for (const key of this.fileMtimes.keys()) {
        if (!seenFiles.has(key)) {
          this.fileMtimes.delete(key);
          this.fileLastWrite.delete(key);
        }
      }

      return count;
    } catch {
      return 0;
    }
  }

  start() {
    // 첫 폴링으로 mtime 기준선 확보
    this.countActiveSessions();
    this.lastCount = 0;
    this.emit('change', 0);

    // 1초마다 폴링
    this.intervalId = setInterval(() => {
      const count = this.countActiveSessions();
      if (count !== this.lastCount) {
        this.lastCount = count;
        this.emit('change', count);
      }
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

module.exports = SessionWatcher;
