#!/usr/bin/env python3
# PKT-0108: direct timing of one command, median of N runs, wall + child CPU (user+sys) from wait4 rusage.
# CPU time is reported because the factory VM is shared (load varies): only gains seen in both columns count.
# Usage: x2t-warmup.py <label> <runs> <cwd> -- <cmd...>   env passes through (X2T_V8_FLAGS, LD_PRELOAD).
import os, sys, time, statistics, json
label, runs, cwd = sys.argv[1], int(sys.argv[2]), sys.argv[3]; cmd = sys.argv[sys.argv.index('--') + 1:]
wall, cpu, codes = [], [], []
for _ in range(runs):
    t0 = time.monotonic(); pid = os.fork()
    if pid == 0:
        os.chdir(cwd); fd = os.open(os.devnull, os.O_WRONLY); os.dup2(fd, 1); os.dup2(fd, 2); os.execv(cmd[0], cmd)
    _, st, ru = os.wait4(pid, 0); wall.append(time.monotonic() - t0); cpu.append(ru.ru_utime + ru.ru_stime)
    codes.append(os.waitstatus_to_exitcode(st))
print(json.dumps({'label': label, 'wall_med_ms': round(statistics.median(wall) * 1000),
                  'cpu_med_ms': round(statistics.median(cpu) * 1000), 'exit': sorted(set(codes)), 'runs': runs}))
