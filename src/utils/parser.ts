import { log } from "utils";

export function checkValue(value: any) {
  if (value) {

  }
  return value;
}

export function toRegExp(value: string, flags?: string) {
  try {
    const reg = new RegExp(value, flags)
    return reg;
  } catch (error) {
    log(`${value} is not valid RegExp;r`);
  }
}