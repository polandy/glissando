/** The ZIP records the writer and the reader share: their signatures and fixed lengths. */

export const LOCAL_SIGNATURE = 0x04034b50;
export const CENTRAL_SIGNATURE = 0x02014b50;
export const END_SIGNATURE = 0x06054b50;
export const LOCAL_HEADER_BYTES = 30;
export const CENTRAL_HEADER_BYTES = 46;
export const END_RECORD_BYTES = 22;
export const FLAG_ENCRYPTED = 0x0001;
export const FLAG_UTF8_NAMES = 0x0800;
export const METHOD_STORED = 0;
export const METHOD_DEFLATED = 8;
