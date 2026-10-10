# Process supervision for the entrypoint, sourced by it (and by deploy/test-supervise.sh):
# runs two commands side by side and ends both when either ends or a stop signal arrives.

# Sets ended_status to the status of child process $1 once it has ended. Every trap set around it
# sets interrupted=true: a trapped signal ends the wait early with 128 + the signal, even when
# the process ended in the same moment, so the wait is repeated, and BusyBox's sh keeps an
# ended child's status for every later wait on it.
wait_for() {
	interrupted=true
	while [ "$interrupted" = true ]; do
		interrupted=false
		ended_status=0
		wait "$1" || ended_status=$?
	done
}

# Runs a command and exits with its status; a TERM is passed on to it. Waiting on each process
# by its pid, because BusyBox's `wait -n` misses a child killed by a signal and drops its status.
# Ending on its own, the process tells the entrypoint (USR1) to end the other one too.
supervise() {
	stopping=false
	trap 'interrupted=true; stopping=true; kill -TERM "$child" 2>/dev/null || true' TERM
	"$@" &
	child=$!
	wait_for "$child"
	if [ "$stopping" = false ]; then
		echo "glissando: stopping (a process ended with status $ended_status)" >&2
		kill -USR1 $$
	fi
	exit "$ended_status"
}

# Runs commands $1 and $2 and exits once both have ended. Whichever ends first, or a stop
# signal, ends both: the container never runs half. A stop signal is an orderly end (status 0);
# a process ending on its own passes on its status. A process may have ended before a trap
# stops it, so a failing kill never ends the shell (set -e).
supervise_pair() {
	stop_requested=false
	trap 'interrupted=true; stop_requested=true; kill -TERM "$first" "$second" 2>/dev/null || true' TERM INT
	trap 'interrupted=true; kill -TERM "$first" "$second" 2>/dev/null || true' USR1
	supervise "$1" &
	first=$!
	supervise "$2" &
	second=$!

	wait_for "$first"
	status=$ended_status
	wait_for "$second"
	[ "$status" -ne 0 ] || status=$ended_status
	[ "$stop_requested" = false ] || status=0
	exit "$status"
}
