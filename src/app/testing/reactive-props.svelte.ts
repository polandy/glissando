/** Props a test can change after mounting, as a parent component would. */
export function reactiveProps<Props extends Record<string, unknown>>(initial: Props): Props {
  const props = $state(initial);
  return props;
}
