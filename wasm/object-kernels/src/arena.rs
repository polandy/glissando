//! A bump allocator over the module's linear memory with a free list: the glue takes a mark,
//! allocates a run's tensors, releases each one after its last reader, and resets to the mark
//! when the run is over. A released block goes to the free list, keyed by its size, and the next
//! allocation of that size takes it; a block at the top lowers the bump pointer instead.
#![cfg(target_arch = "wasm32")]

use core::arch::wasm32::{memory_grow, memory_size};
use core::sync::atomic::{AtomicUsize, Ordering};

const PAGE_BYTES: usize = 65536;
// A v128 load needs no alignment in WASM, but 16 keeps every tensor on a SIMD lane boundary.
// It also leaves room in every block for a free block's header: the next block and the size.
const ALIGN: usize = 16;
const FLOAT_BYTES: usize = 4;
const NONE: usize = 0;

unsafe extern "C" {
    static __heap_base: u8;
}

// Zero until the first allocation, then the first free byte.
static NEXT: AtomicUsize = AtomicUsize::new(0);
// The first free block, or NONE.
static FREE: AtomicUsize = AtomicUsize::new(NONE);

fn next() -> usize {
    match NEXT.load(Ordering::Relaxed) {
        0 => (&raw const __heap_base) as usize,
        at => at,
    }
}

fn block_bytes(count: usize) -> Option<usize> {
    count
        .checked_mul(FLOAT_BYTES)?
        .max(ALIGN)
        .checked_next_multiple_of(ALIGN)
}

// A free block's header: the address of the next free block and its own size in bytes.
fn link_of(block: usize) -> usize {
    unsafe { *(block as *const usize) }
}

fn size_of_block(block: usize) -> usize {
    unsafe { *((block + size_of::<usize>()) as *const usize) }
}

fn set_link(block: usize, link: usize) {
    unsafe { *(block as *mut usize) = link }
}

fn set_size(block: usize, bytes: usize) {
    unsafe { *((block + size_of::<usize>()) as *mut usize) = bytes }
}

/// Unlinks and returns the first free block that `matches`, or NONE.
fn unlink_first(matches: impl Fn(usize) -> bool) -> usize {
    let mut previous = NONE;
    let mut block = FREE.load(Ordering::Relaxed);
    while block != NONE {
        if matches(block) {
            match previous {
                NONE => FREE.store(link_of(block), Ordering::Relaxed),
                _ => set_link(previous, link_of(block)),
            }
            return block;
        }
        previous = block;
        block = link_of(block);
    }
    NONE
}

/// The address of `count` fresh floats, or 0 when the memory cannot grow that far.
#[unsafe(no_mangle)]
pub extern "C" fn arena_alloc(count: usize) -> *mut f32 {
    let Some(bytes) = block_bytes(count) else {
        return core::ptr::null_mut();
    };
    let reused = unlink_first(|block| size_of_block(block) == bytes);
    if reused != NONE {
        return reused as *mut f32;
    }
    let start = next().next_multiple_of(ALIGN);
    let Some(end) = start.checked_add(bytes) else {
        return core::ptr::null_mut();
    };
    let have = memory_size(0) * PAGE_BYTES;
    if end > have && memory_grow(0, (end - have).div_ceil(PAGE_BYTES)) == usize::MAX {
        return core::ptr::null_mut();
    }
    NEXT.store(end, Ordering::Relaxed);
    start as *mut f32
}

/// Gives back the `count` floats at `address`, which [`arena_alloc`] handed out.
#[unsafe(no_mangle)]
pub extern "C" fn arena_release(address: *mut f32, count: usize) {
    let Some(bytes) = block_bytes(count) else {
        return;
    };
    let mut block = address as usize;
    if block + bytes != next() {
        set_size(block, bytes);
        set_link(block, FREE.load(Ordering::Relaxed));
        FREE.store(block, Ordering::Relaxed);
        return;
    }
    // A block at the top lowers the bump pointer, past the free blocks right below it too.
    while block != NONE {
        NEXT.store(block, Ordering::Relaxed);
        block = unlink_first(|free| free + size_of_block(free) == next());
    }
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
    while unlink_first(|block| block >= mark) != NONE {}
}
