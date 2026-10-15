// A reader for the part of the ONNX protobuf format that a network's graph needs: its nodes,
// their attributes and the weight tensors. Field numbers are those of onnx.proto (ONNX 1.x).
import { item } from "./item";
import type { Tensor } from "./tensor-ops";

export interface OnnxNode {
  readonly op: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly attributes: ReadonlyMap<string, number | readonly number[]>;
}

export interface OnnxGraph {
  readonly nodes: readonly OnnxNode[];
  readonly weights: ReadonlyMap<string, Tensor>;
  readonly inputName: string;
  readonly outputName: string;
}

const MODEL_GRAPH = 7;
const GRAPH_NODE = 1;
const GRAPH_INITIALIZER = 5;
const GRAPH_INPUT = 11;
const GRAPH_OUTPUT = 12;
const VALUE_INFO_NAME = 1;
const NODE_INPUT = 1;
const NODE_OUTPUT = 2;
const NODE_OP_TYPE = 4;
const NODE_ATTRIBUTE = 5;
const ATTRIBUTE_NAME = 1;
const ATTRIBUTE_FLOAT = 2;
const ATTRIBUTE_INT = 3;
const ATTRIBUTE_INTS = 8;
const TENSOR_DIMS = 1;
const TENSOR_DATA_TYPE = 2;
const TENSOR_NAME = 8;
const TENSOR_RAW_DATA = 9;
const DATA_TYPE_FLOAT = 1;
const DATA_TYPE_INT64 = 7;

const WIRE_VARINT = 0;
const WIRE_FIXED64 = 1;
const WIRE_LENGTH_DELIMITED = 2;
const WIRE_FIXED32 = 5;

interface Field {
  readonly number: number;
  readonly wire: number;
  /** The value of a varint field; the length-delimited payload's offset otherwise. */
  readonly varint: number;
  readonly bytes: Uint8Array;
}

/** Reads the graph of a serialised ONNX model; throws on data that is not one. */
export function parseOnnx(bytes: Uint8Array): OnnxGraph {
  const graphBytes = fields(bytes).find((field) => field.number === MODEL_GRAPH)?.bytes;
  if (!graphBytes) throw new Error("The ONNX model has no graph");
  const graphFields = fields(graphBytes);
  const ofNumber = (number: number) => graphFields.filter((field) => field.number === number);
  const weights = new Map<string, Tensor & { name: string }>();
  for (const field of ofNumber(GRAPH_INITIALIZER)) {
    const tensor = readTensor(field.bytes);
    weights.set(tensor.name, tensor);
  }
  const names = (number: number) =>
    ofNumber(number).map((field) => text(find(fields(field.bytes), VALUE_INFO_NAME)));
  const initializers = new Set(weights.keys());
  const [inputName] = names(GRAPH_INPUT).filter((name) => !initializers.has(name));
  const [outputName] = names(GRAPH_OUTPUT);
  if (inputName === undefined || outputName === undefined) {
    throw new Error("The ONNX graph needs one input and one output");
  }
  return {
    nodes: ofNumber(GRAPH_NODE).map((field) => readNode(field.bytes)),
    weights,
    inputName,
    outputName,
  };
}

function readNode(bytes: Uint8Array): OnnxNode {
  const nodeFields = fields(bytes);
  const strings = (number: number) =>
    nodeFields.filter((field) => field.number === number).map((field) => text(field.bytes));
  const attributes = new Map<string, number | readonly number[]>();
  for (const field of nodeFields.filter((candidate) => candidate.number === NODE_ATTRIBUTE)) {
    const attribute = fields(field.bytes);
    attributes.set(text(find(attribute, ATTRIBUTE_NAME)), attributeValue(attribute));
  }
  return {
    op: item(strings(NODE_OP_TYPE), 0),
    inputs: strings(NODE_INPUT),
    outputs: strings(NODE_OUTPUT),
    attributes,
  };
}

// Strings (the resize mode, say) are left out: only numbers steer the operators used here.
function attributeValue(attribute: readonly Field[]): number | readonly number[] {
  const ints = attribute.filter((field) => field.number === ATTRIBUTE_INTS);
  if (ints.length > 0) return ints.flatMap((field) => packedVarints(field));
  const single = attribute.find(
    (field) => field.number === ATTRIBUTE_INT || field.number === ATTRIBUTE_FLOAT,
  );
  if (!single) return [];
  return single.number === ATTRIBUTE_INT
    ? single.varint
    : new DataView(single.bytes.buffer, single.bytes.byteOffset, 4).getFloat32(0, true);
}

function readTensor(bytes: Uint8Array): Tensor & { name: string } {
  const tensorFields = fields(bytes);
  const dims = tensorFields
    .filter((field) => field.number === TENSOR_DIMS)
    .flatMap((field) => packedVarints(field));
  const dataType = tensorFields.find((field) => field.number === TENSOR_DATA_TYPE)?.varint;
  const raw = tensorFields.find((field) => field.number === TENSOR_RAW_DATA)?.bytes;
  const name = text(find(tensorFields, TENSOR_NAME));
  if (!raw) throw new Error(`The ONNX tensor ${name} has no raw data`);
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  if (dataType === DATA_TYPE_FLOAT) {
    const data = new Float32Array(raw.byteLength / 4);
    for (let index = 0; index < data.length; index++)
      data[index] = view.getFloat32(index * 4, true);
    return { name, dims, data };
  }
  if (dataType === DATA_TYPE_INT64) {
    const data = new Float32Array(raw.byteLength / 8);
    for (let index = 0; index < data.length; index++)
      data[index] = Number(view.getBigInt64(index * 8, true));
    return { name, dims, data };
  }
  throw new Error(`The ONNX tensor ${name} has the unsupported data type ${dataType}`);
}

function find(list: readonly Field[], number: number): Uint8Array {
  return list.find((field) => field.number === number)?.bytes ?? new Uint8Array();
}

function text(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

// A repeated integer field arrives packed (one length-delimited field) or one varint per entry.
function packedVarints(field: Field): number[] {
  if (field.wire === WIRE_VARINT) return [field.varint];
  const values: number[] = [];
  let at = 0;
  while (at < field.bytes.length) {
    const read = readVarint(field.bytes, at);
    values.push(read.value);
    at = read.next;
  }
  return values;
}

function readVarint(bytes: Uint8Array, start: number): { value: number; next: number } {
  let value = 0;
  let factor = 1;
  let at = start;
  for (;;) {
    const byte = bytes[at++];
    if (byte === undefined) throw new Error("The ONNX data ends inside a number");
    value += (byte & 0x7f) * factor;
    if ((byte & 0x80) === 0) return { value, next: at };
    factor *= 128;
  }
}

function fields(bytes: Uint8Array): Field[] {
  const found: Field[] = [];
  let at = 0;
  while (at < bytes.length) {
    const key = readVarint(bytes, at);
    at = key.next;
    const number = Math.floor(key.value / 8);
    const wire = key.value % 8;
    if (wire === WIRE_VARINT) {
      const read = readVarint(bytes, at);
      found.push({ number, wire, varint: read.value, bytes: new Uint8Array() });
      at = read.next;
    } else if (wire === WIRE_LENGTH_DELIMITED) {
      const length = readVarint(bytes, at);
      found.push({
        number,
        wire,
        varint: 0,
        bytes: bytes.subarray(length.next, length.next + length.value),
      });
      at = length.next + length.value;
    } else if (wire === WIRE_FIXED32 || wire === WIRE_FIXED64) {
      const size = wire === WIRE_FIXED32 ? 4 : 8;
      found.push({ number, wire, varint: 0, bytes: bytes.subarray(at, at + size) });
      at += size;
    } else {
      throw new Error(`The ONNX data has the unsupported wire type ${wire}`);
    }
  }
  return found;
}
