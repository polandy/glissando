// The focus worker with the object network forced onto the TypeScript runner, for tests.
import { runOnnx } from "../onnx/run-onnx";
import { serveFocusRequests } from "../serve-focus-requests";

serveFocusRequests((graph) => Promise.resolve((input) => runOnnx(graph, input)));
