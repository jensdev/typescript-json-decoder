import { undef } from './decoder';
import { Pojo } from './pojo';
import { eval, decoder, Decoder, DecoderFunction } from './types';

type evalOver<t> = t extends unknown ? eval<t> : never;
type getSumOfArray<arr> = arr extends (infer elements)[] ? elements : never;

export const union = <decoders extends Decoder<unknown>[]>(
  ...decoders: decoders
) => (value: Pojo): evalOver<getSumOfArray<decoders>> => {
  if (decoders.length === 0) {
    throw `Could not match any of the union cases`;
  }
  const [_decoder, ...rest] = decoders;
  try {
    return decoder(_decoder as any)(value) as any;
  } catch (messageFromThisDecoder) {
    try {
      return union(...(rest as any))(value) as any;
    } catch (message) {
      throw `${messageFromThisDecoder}\n${message}`;
    }
  }
};

export const optionDecoder: unique symbol = Symbol('optional-decoder');
export function option<T extends Decoder<unknown>>(
  decoder: T
): DecoderFunction<eval<T> | undefined> {
  let _optionDecoder = union(undef, decoder as any);
  (_optionDecoder as any)[optionDecoder] = true;
  return _optionDecoder;
}

export function array<D extends Decoder<unknown>>(
  _decoder: D
): DecoderFunction<eval<D>[]> {
  return (xs: Pojo): D[] => {
    const arrayToString = (arr: any) => `${JSON.stringify(arr)}`;
    if (!Array.isArray(xs)) {
      throw `The value \`${arrayToString(
        xs
      )}\` is not of type \`array\`, but is of type \`${typeof xs}\``;
    }
    let index = 0;
    try {
      return xs.map((x, i) => {
        index = i;
        return decoder(_decoder as any)(x);
      }) as any;
    } catch (message) {
      throw (
        message +
        `\nwhen trying to decode the array (at index ${index}) \`${arrayToString(
          xs
        )}\``
      );
    }
  };
}
