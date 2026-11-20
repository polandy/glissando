//! A bump allocator over the module's linear memory: the glue takes a mark, allocates a run's
//! tensors, and resets to the mark when the run is over.
#![cfg(target_arch = "wasm32")]

use core::arch::wasm32::{memory_grow, memory_size};
use core::sync::atomic::{AtomicUsize, Ordering};

const PAGE_BYTES: usize = 65536;
// A v128 load needs no alignment in WASM, but 16 keeps every tensor on a SIMD lane boundary.
const ALIGN: usize = 16;

unsafe extern "C" {
    static __heap_base: u8;
}

// Zero until the first allocation, then the first free byte.
static NEXT: AtomicUsize = AtomicUsize::new(0);

fn next() -> usize {
    match NEXT.load(Ordering::Relaxed) {
        0 => (&raw const __heap_base) as usize,
        at => at,
    }
}

/// The address of `count` fresh floats, or 0 when the memory cannot grow that far.
#[unsafe(no_mangle)]
pub extern "C" fn arena_alloc(count: usize) -> *mut f32 {
    let start = next().next_multiple_of(ALIGN);
    let Some(end) = count
        .checked_mul(4)
        .and_then(|bytes| start.checked_add(bytes))
    else {
        return core::ptr::null_mut();
    };
    let have = memory_size(0) * PAGE_BYTES;
    if end > have && memory_grow(0, (end - have).div_ceil(PAGE_BYTES)) == usize::MAX {
        return core::ptr::null_mut();
    }
    NEXT.store(end, Ordering::Relaxed);
    start as *mut f32
}

/// The arena's current end, to hand back to [`arena_reset`].
#[unsafe(no_mangle)]
pub extern "C" fn arena_mark() -> usize {
    next()
}

/// Frees everything allocated since `mark` was taken.
#[unsafe(no_mangle)]
pub extern "C" fn arena_reset(mark: usize) {
    NEXT.store(mark, Ordering::Relaxed);
}
