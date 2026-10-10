#!/bin/sh
# Tests the entrypoint's process supervision with stand-in processes, in the shell the image runs
# it with (BusyBox's sh). deploy/test-image.sh runs it inside the image:
#
#   deploy/test-supervise.sh <supervise.sh>
#
# Signals and process ends race; each case forces one order of events through a stand-in for
# the shell's `wait`, so a case never depends on timing.
set -eu

readonly SUPERVISE=$1
# A process killed by SIGKILL: 128 + 9.
readonly KILLED_STATUS=137

failures=0
pass() { echo "ok   $1"; }
fail() {
	echo "FAIL $1"
	failures=$((failures + 1))
}

# The library dies on its own while Caddy runs on. The first `wait` of the supervising shell
# meets the worst order: the library's supervisor has ended and been reaped when its USR1
# lands, so BusyBox reports the signal (128 + 10) instead of the status.
status=0
sh -eu -c '
	. "$1"
	read -r supervising_pid _ </proc/self/stat
	interrupted_once=false
	wait() {
		read -r own_pid _ </proc/self/stat
		if [ "$own_pid" != "$supervising_pid" ] || [ "$interrupted_once" = true ]; then
			command wait "$1"
			return
		fi
		interrupted_once=true
		until command wait "$1"; [ $? -ne 138 ]; do :; done
		kill -USR1 $$
		return 138
	}
	library_dies() { exec sh -c "kill -KILL \$\$"; }
	caddy_runs() { exec tail -f /dev/null; }
	supervise_pair library_dies caddy_runs
' supervise-case "$SUPERVISE" 2>/dev/null || status=$?
if [ "$status" = "$KILLED_STATUS" ]; then
	pass "a process that dies as a signal lands passes on its own status"
else
	fail "a process that dies as a signal lands passes on its own status: expected $KILLED_STATUS, got $status"
fi

[ "$failures" -eq 0 ]
