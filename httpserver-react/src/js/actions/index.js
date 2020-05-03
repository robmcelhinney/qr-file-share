import { REFRESH_DIR, SET_BASE_DIR } from "../constants/action-types";

export function refreshDir(payload) {
  return { type: REFRESH_DIR, payload }
};
export function setBaseDir(payload) {
  return { type: SET_BASE_DIR, payload }
};