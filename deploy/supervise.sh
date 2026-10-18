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

# Stops a supervisor. A signal the supervising shell never traps: one it traps is dropped by
# BusyBox's sh when it lands on a new subshell before the inherited traps are cleared, while an
# untrapped one ends a supervisor whose own trap is not set yet, before its command starts.
readonly STOP_SIGNAL=USR2

# Sends signal $1 to each pid that follows. An empty pid is a process not started yet; one that
# has ended already makes kill fail, which never ends the shell (set -e).
signal_started() {
	signal=$1
	shift
	for pid; do
		[ -z "$pid" ] || kill -"$signal" "$pid" 2>/dev/null || true
	done
}

# Runs a command and exits with its status; a stop (STOP_SIGNAL) is passed on to it as a TERM.
# Waiting on each process by its pid, because BusyBox's `wait -n` misses a child killed by a
# signal and drops its status. Ending on its own, the process tells the entrypoint (USR1) to end
# the other one too.
supervise() {
	stopping=false
	child=
	trap 'interrupted=true; stopping=true; signal_started TERM "$child"' "$STOP_SIGNAL"
	"$@" &
	child=$!
	# A stop that landed while the command was starting found no pid to pass it on to.
	[ "$stopping" = false ] || signal_started TERM "$child"
	wait_for "$child"
	if [ "$stopping" = false ]; then
		echo "glissando: stopping (a process ended with status $ended_status)" >&2
		kill -USR1 $$
	fi
	exit "$ended_status"
}

# Starts command $1 under supervise in the background and sets started to its supervisor's pid.
start_supervised() {
	supervise "$1" &
	started=$!
}

# Stops both supervisors, those started so far.
end_pair() {
	ending=true
	signal_started "$STOP_SIGNAL" "$first" "$second"
}

# Runs commands $1 and $2 and exits once both have ended. Whichever ends first, or a stop
# signal, ends both: the container never runs half. A stop signal is an orderly end (status 0);
# a process ending on its own passes on its status.
supervise_pair() {
	stop_requested=false
	ending=false
	first=
	second=
	trap 'interrupted=true; stop_requested=true; end_pair' TERM INT
	trap 'interrupted=true; end_pair' USR1
	start_supervised "$1"
	first=$started
	start_supervised "$2"
	second=$started
	# A process can end, or a stop arrive, while the pair is starting: the end reached only the
	# supervisors started by then.
	[ "$ending" = false ] || end_pair

	wait_for "$first"
	status=$ended_status
	wait_for "$second"
	[ "$status" -ne 0 ] || status=$ended_status
	[ "$stop_requested" = false ] || status=0
	exit "$status"
}
